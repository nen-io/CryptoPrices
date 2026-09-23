# Market data and watch-only wallet coverage

CryptoPrices makes network requests only when a user asks to refresh markets or a wallet. Local registration, unlocking, address validation, saved portfolio browsing and search work without a provider. The renderer cannot choose a URL or an RPC method. Provider requests live in the dedicated storage/provider worker.

## Markets and token identity

Market refresh requests four pages of 250 assets, ordered by market capitalization in USD. Results are deduplicated by CoinGecko asset ID. The provider can move assets between pages, omit a rank or price, return fewer results, or rate-limit a request. Missing values remain `null`; absent data never becomes a fabricated price, chart or balance. `requestedCount`, `pagesFetched`, `complete` and warnings describe what actually arrived. A complete refresh means 1,000 unique assets from all four requested pages. See [CoinGecko markets documentation](https://docs.coingecko.com/reference/coins-markets).

The separate `/coins/list?include_platform=true` response maps those market IDs to exact contract or mint addresses. A matching ticker is never enough to identify a token. Only selected market IDs and implemented networks enter the catalogue. One contract mapped to conflicting IDs rejects the update rather than counting a balance twice. The catalogue does not mean every asset in the market list has an implemented wallet scanner. See [CoinGecko coin list documentation](https://docs.coingecko.com/reference/coins-list).

The app supports [CoinGecko's keyless public API](https://docs.coingecko.com/docs/keyless-public-api) and an optional Demo API key. Rate limits and availability depend on the provider. The key goes only to `api.coingecko.com` in the `x-cg-demo-api-key` header. It is not sent to any blockchain RPC.

## Implemented networks

| Network | Native asset | Token discovery | Fixed provider |
| --- | --- | --- | --- |
| Bitcoin mainnet | BTC | None | `https://blockstream.info/api` |
| Ethereum | ETH | Catalogue ERC-20 contracts | `https://ethereum-rpc.publicnode.com` |
| Base | ETH | Catalogue ERC-20 contracts | `https://base-rpc.publicnode.com` |
| Arbitrum One | ETH | Catalogue ERC-20 contracts | `https://arbitrum-one-rpc.publicnode.com` |
| OP Mainnet | ETH | Catalogue ERC-20 contracts | `https://optimism-rpc.publicnode.com` |
| Polygon PoS | POL | Catalogue ERC-20 contracts | `https://polygon-bor-rpc.publicnode.com` |
| BNB Smart Chain | BNB | Catalogue ERC-20 contracts | `https://bsc-rpc.publicnode.com` |
| Avalanche C-Chain | AVAX | Catalogue ERC-20 contracts | `https://avalanche-c-chain-rpc.publicnode.com` |
| Solana mainnet | SOL | Owned SPL and Token-2022 accounts | `https://api.mainnet-beta.solana.com` |

EVM scans verify the RPC chain ID and pin native balances and token reads to one block. `balanceOf` and `decimals` reads are grouped through Multicall3 in batches of 32 tokens, with at most three batches in flight. All calls use `eth_call`; there are no wallet connections, approvals, signatures or transaction broadcasts. Implementations use [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [Viem ABI utilities](https://viem.sh/docs/contract/multicall), [Multicall3's deployment registry](https://github.com/mds1/multicall3/blob/main/deployments.json) and [PublicNode's published endpoints](https://www.publicnode.com/).

EVM discovery is bounded to that network's token contracts in the cached market catalogue, up to 1,000 contracts per scan. Token balances outside that catalogue are not discovered. An empty catalogue gives an explicit native-only, incomplete result. A successful zero balance counts as scanned; a reverted contract or unavailable decimals for a positive balance is unknown, never zero.

Solana asks [getTokenAccountsByOwner](https://solana.com/docs/rpc/http/gettokenaccountsbyowner) separately for the original Token program and [Token-2022](https://solana.com/docs/tokens/extensions). Multiple accounts for the same mint are summed in base units. Mints absent from the market catalogue remain visible as unlisted, unpriced holdings. Public RPC limits can make either program's result incomplete. `scannedContracts` and `totalContracts` count token **accounts** for Solana, and token **contracts** for EVM. Native SOL is queried with finalized commitment; these three requests are not an atomic cross-account snapshot.

Bitcoin uses confirmed funded minus spent satoshis from [Blockstream Esplora](https://github.com/Blockstream/esplora/blob/master/API.md). Pending transaction effects are not included in the displayed quantity. Adding one Bitcoin address does not discover a wallet's other receive or change addresses. Bitcoin xpubs, Lightning, inscriptions, and other networks are not scanned.

Polygon’s native-balance alias at `0x0000000000000000000000000000000000001010` is excluded from token scans to avoid counting native POL twice. Actual wrapped-token contracts remain separate holdings.

## Scope and accuracy boundaries

- Watch-only means possession of the public address is sufficient. It does not prove ownership or grant spending authority. Private keys, recovery phrases, keystore imports, ENS resolution and wallet connection are not supported.
- Coverage is the scope described above. There is no claim to scan every blockchain represented in CoinGecko's top 1,000, every token, NFTs, DeFi positions, staking accounts or exchange accounts. Assets outside implemented coverage can be represented as manual holdings when listed in markets.
- Solana nominal base-unit quantities do not apply interest-bearing or scaled-UI extensions and do not reveal confidential balances. Unlisted mints can include spam or NFTs. Listing is not verification or endorsement.
- On-chain quantities use `bigint` internally and exact decimal strings in storage and IPC. Numeric native responses above JavaScript's safe integer range are rejected, not rounded. Market USD prices are provider floating-point observations; derived display valuations are estimates, not ledger amounts.
- A partial result's omissions are unknown. Consumers must show its incomplete status and warnings, and must not imply a complete portfolio total. Total request failure throws so the last saved scan can remain available with its original timestamp.
- `complete` means the implemented scan finished for its available catalogue/program scope, not that all possible assets or networks have been discovered. A stale or partial market catalogue cannot provide universal token coverage.

## Privacy and request bounds

A wallet refresh sends that public address and the device's IP address to the disclosed provider. A provider may correlate requests. Address storage encryption does not make these external queries anonymous. No silent cross-provider fallback is used; provider choices are explicit, fixed HTTPS endpoints. Locking, switching profiles or removing an address aborts its in-flight provider work; already transmitted requests cannot be recalled.

Requests omit credentials, refuse redirects, enforce a 15-second timeout and cap response bodies while streaming. Wallet scans have a 60-second deadline. JSON-RPC replies, amounts, public addresses, Solana account owners, and contract result shapes are checked before use. The general JSON cap is 4 MiB, RPC 8 MiB and the full token catalogue 16 MiB. Solana processing is capped at 5,000 accounts per token program. Exceeded caps and failed batches produce explicit incomplete results. Provider error bodies are not forwarded into the UI.

## Verification on 17 September 2026

Live read-only checks used public example addresses, not a user's portfolio:

- CoinGecko returned all four market pages, containing 998 unique assets and five unranked assets. Two duplicate IDs were detected across moving pages; the result was correctly marked incomplete. The corresponding catalogue contained 1,578 contracts/mints across eight implemented token networks.
- All 1,362 EVM contracts in that catalogue were read successfully across the seven supported EVM networks (Ethereum 511, Base 188, Arbitrum 122, Optimism 46, Polygon 98, BNB 330, Avalanche 67), using a public burn address. This proves those provider methods and the batch decoder worked for that snapshot; it does not establish permanent endpoint availability.
- Bitcoin's public genesis address returned a confirmed balance and pending activity. The Solana documentation example returned native SOL plus empty results from both token programs. Nonzero SPL/Token-2022 parsing, partial failures and aggregation are exercised through injected fixtures rather than asserted from that empty live example.
- Mempool.space timed out during research. PublicNode's Solana token-owner queries returned HTTP 403. The selected providers above were verified instead; neither failed provider is a hidden fallback.
- CoinGecko also returned HTTP 429 during repeated smoke checks. The app reported the rate limit without substituting invented data.

The provider unit suite covers exact precision, address checksums and secret rejection, partial pages and RPC failures, rank nullability, duplicate identity rejection, bounded batch concurrency, both Solana token programs, cancellation, provider key separation and confirmed-versus-pending Bitcoin amounts. Live tests are deliberately excluded from CI to avoid rate limits and private data disclosure.
