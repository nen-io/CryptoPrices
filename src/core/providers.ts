import { decodeFunctionResult, encodeFunctionData, parseAbi, type Hex } from 'viem';
import type { MarketCoin, MarketSnapshot, TokenBalance, TokenContract, Wallet, WalletScan } from '../shared/types';
import { CHAINS, chainFor, validateAddress } from './chains';

export interface ProviderOptions { apiKey?: string; fetcher?: typeof fetch; signal?: AbortSignal }

const COINGECKO = 'https://api.coingecko.com/api/v3';
const BITCOIN_API = 'https://blockstream.info/api';
const MULTICALL = '0xcA11bde05977b3631167028862bE2a173976CA11';
const MULTICALL_ABI = parseAbi(['function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)']);
const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const MAX_CONTRACTS = 1000;
const MAX_TOKEN_ACCOUNTS = 5000;
const BATCH_SIZE = 32;
const ALLOWED_ORIGINS = new Set([new URL(COINGECKO).origin, new URL(BITCOIN_API).origin, ...CHAINS.flatMap((chain) => chain.rpc ? [chain.rpc] : [])]);

function isNativeBalanceContract(chain: Wallet['chain'], address: string): boolean {
  // Polygon MRC20.balanceOf returns account.balance: it is the native POL balance,
  // not a separately held token. Do not count it again after eth_getBalance.
  return chain === 'polygon' && address.toLowerCase() === '0x0000000000000000000000000000000000001010';
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provider returned malformed data.');
  return value as Record<string, unknown>;
}
function text(value: unknown, maxLength = 160): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Provider returned malformed text.');
  return value;
}
function finiteOrNull(value: unknown, nonnegative = false): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || (nonnegative && value < 0)) throw new Error('Provider returned an invalid number.');
  return value;
}
function integer(value: unknown): bigint {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'string' && /^(0|[1-9][0-9]{0,77})$/.test(value)) return BigInt(value);
  throw new Error('Provider returned an inexact or invalid balance.');
}
function hexInteger(value: unknown, abi = false): bigint {
  if (typeof value !== 'string' || !(abi ? /^0x[0-9a-fA-F]{64}$/ : /^0x[0-9a-fA-F]{1,64}$/).test(value)) throw new Error('Provider returned an invalid integer.');
  return BigInt(value);
}
function solanaInteger(value: unknown): bigint {
  const amount = integer(value);
  if (amount > 18_446_744_073_709_551_615n) throw new Error('Provider returned an invalid Solana amount.');
  return amount;
}

/** Exact base-unit conversion; no floating-point arithmetic touches on-chain balances. */
export function formatQuantity(value: bigint, decimals: number): string {
  if (value < 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid token quantity.');
  if (decimals === 0) return value.toString();
  const padded = value.toString().padStart(decimals + 1, '0');
  const fractional = padded.slice(-decimals).replace(/0+$/, '');
  return padded.slice(0, -decimals) + (fractional ? `.${fractional}` : '');
}

async function requestJson(url: string, options: ProviderOptions, body?: unknown, limit = 4 * 1024 * 1024): Promise<unknown> {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:' || !ALLOWED_ORIGINS.has(endpoint.origin) || endpoint.username || endpoint.password) throw new Error('Provider endpoint is not allowed.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  try {
    signal.throwIfAborted();
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (endpoint.origin === new URL(COINGECKO).origin && options.apiKey) {
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(options.apiKey)) throw new Error('Invalid CoinGecko API key format.');
      headers['x-cg-demo-api-key'] = options.apiKey;
    }
    const response = await (options.fetcher ?? fetch)(url, {
      method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal, redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'Provider rate limit reached. Try refreshing later.' : `Provider request failed (HTTP ${response.status}).`);
    if (Number(response.headers.get('content-length')) > limit) throw new Error('Provider response exceeded the safe size limit.');
    if (!response.body) throw new Error('Provider returned an empty response.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new Error('Provider response exceeded the safe size limit.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; }
    catch { throw new Error('Provider returned malformed JSON.'); }
  } catch (error) {
    if (signal.aborted) throw new Error('Provider request timed out or was cancelled.');
    if (error instanceof Error && /^(Provider|Invalid CoinGecko)/.test(error.message)) throw error;
    throw new Error('Provider could not be reached. Your saved data is unchanged.');
  } finally { clearTimeout(timer); }
}

function parseMarket(value: unknown): MarketCoin {
  const coin = record(value);
  const rank = coin.market_cap_rank;
  if (rank !== null && (!Number.isSafeInteger(rank) || (rank as number) < 1)) throw new Error('Provider returned an invalid market rank.');
  const prices = coin.sparkline_in_7d === undefined ? [] : record(coin.sparkline_in_7d).price;
  if (!Array.isArray(prices) || prices.length > 1000) throw new Error('Provider returned an invalid sparkline.');
  const validatedPrices = prices.map((price) => {
    const number = finiteOrNull(price, true);
    if (number === null) throw new Error('Provider returned an invalid sparkline.');
    return number;
  });
  // The visual needs only 42 real samples; never interpolate or invent chart history.
  const stride = Math.max(1, Math.ceil(validatedPrices.length / 42));
  return { id: text(coin.id), symbol: text(coin.symbol, 40).toUpperCase(), name: text(coin.name),
    price: finiteOrNull(coin.current_price, true), change24h: finiteOrNull(coin.price_change_percentage_24h),
    marketCap: finiteOrNull(coin.market_cap, true), rank: rank as number | null,
    sparkline: validatedPrices.filter((_, index) => index % stride === 0),
  };
}

/** Called only by the explicit refresh command. No timers, telemetry, or background work. */
export async function fetchMarkets(options: ProviderOptions = {}): Promise<MarketSnapshot> {
  const coins = new Map<string, MarketCoin>();
  const warnings: string[] = [];
  let pagesFetched = 0;
  for (let page = 1; page <= 4; page += 1) {
    try {
      const data = await requestJson(`${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=true&price_change_percentage=24h`, options);
      if (!Array.isArray(data) || data.length > 250) throw new Error('Provider returned an invalid market page.');
      const parsed = data.map(parseMarket);
      parsed.forEach((coin) => coins.set(coin.id, coin));
      pagesFetched += 1;
    } catch (error) { warnings.push(`Market page ${page}: ${(error as Error).message}`); }
  }
  if (coins.size === 0) throw new Error(warnings[0] ?? 'Provider returned no market data. Your saved data is unchanged.');
  const complete = pagesFetched === 4 && coins.size === 1000;
  if (coins.size !== 1000) warnings.push(`Received ${coins.size} unique assets of the requested top 1,000. Rankings can move between pages; refresh again later.`);
  return { coins: [...coins.values()].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)), fetchedAt: new Date().toISOString(), requestedCount: 1000, pagesFetched, complete, warnings };
}

export async function fetchTokenCatalogue(topCoinIds: string[], options: ProviderOptions = {}): Promise<TokenContract[]> {
  if (topCoinIds.length > 1000) throw new Error('Token catalogue supports at most 1,000 market assets.');
  const allowed = new Set(topCoinIds);
  const data = await requestJson(`${COINGECKO}/coins/list?include_platform=true`, options, undefined, 16 * 1024 * 1024);
  if (!Array.isArray(data) || data.length > 100_000) throw new Error('Provider returned an invalid token catalogue.');
  const contracts = new Map<string, TokenContract>();
  for (const value of data) {
    const coin = record(value);
    if (typeof coin.id !== 'string' || !allowed.has(coin.id)) continue;
    const platforms = record(coin.platforms ?? {});
    for (const chain of CHAINS) {
      const address = chain.platformId ? platforms[chain.platformId] : undefined;
      if (address === undefined || address === null || address === '') continue;
      const normalized = validateAddress(chain.id, text(address, 100));
      if (isNativeBalanceContract(chain.id, normalized)) continue;
      const key = `${chain.id}:${chain.id === 'solana' ? normalized : normalized.toLowerCase()}`;
      const existing = contracts.get(key);
      if (existing && existing.coinId !== coin.id) throw new Error('Provider mapped one token contract to multiple assets; catalogue was not replaced.');
      contracts.set(key, { coinId: coin.id, symbol: text(coin.symbol, 40).toUpperCase(), name: text(coin.name), chain: chain.id, address: normalized });
    }
  }
  return [...contracts.values()];
}

async function rpc(url: string, method: string, params: unknown[], options: ProviderOptions): Promise<unknown> {
  const data = record(await requestJson(url, options, { jsonrpc: '2.0', id: 1, method, params }, 8 * 1024 * 1024));
  if (data.jsonrpc !== '2.0' || data.id !== 1 || data.error !== undefined || !Object.hasOwn(data, 'result')) throw new Error('Provider RPC did not return a valid result.');
  return data.result;
}

async function pooled<T>(items: T[], handler: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (cursor < items.length) { const item = items[cursor++]!; await handler(item); }
  }));
}

async function scanBitcoin(wallet: Wallet, options: ProviderOptions): Promise<WalletScan> {
  const data = record(await requestJson(`${BITCOIN_API}/address/${wallet.address}`, options));
  if (data.address !== wallet.address) throw new Error('Provider returned a different Bitcoin address.');
  const confirmed = record(data.chain_stats);
  const pending = record(data.mempool_stats);
  const confirmedValue = integer(confirmed.funded_txo_sum) - integer(confirmed.spent_txo_sum);
  if (confirmedValue < 0n) throw new Error('Provider returned a negative confirmed Bitcoin balance.');
  const pendingDelta = integer(pending.funded_txo_sum) - integer(pending.spent_txo_sum);
  return { walletId: wallet.id, balances: [{ coinId: 'bitcoin', symbol: 'BTC', quantity: formatQuantity(confirmedValue, 8) }],
    fetchedAt: new Date().toISOString(), complete: true, scannedContracts: 0, totalContracts: 0,
    warnings: ['Bitcoin tracks this address only. Other receive/change addresses, Lightning and inscriptions are outside this scan.', ...(pendingDelta === 0n ? [] : ['Unconfirmed Bitcoin transactions exist. The displayed balance includes confirmed transactions only.'])] };
}

async function scanEvm(wallet: Wallet, catalogue: TokenContract[], options: ProviderOptions): Promise<WalletScan> {
  const chain = chainFor(wallet.chain);
  const url = chain.rpc!;
  if (hexInteger(await rpc(url, 'eth_chainId', [], options)) !== BigInt(chain.evmChainId!)) throw new Error('Provider returned the wrong network.');
  const block = await rpc(url, 'eth_blockNumber', [], options);
  hexInteger(block);
  // Recheck here as well: older saved catalogues can still contain native aliases.
  const contracts = [...new Map(catalogue.filter((token) => token.chain === wallet.chain && !isNativeBalanceContract(token.chain, token.address)).map((token) => [validateAddress(wallet.chain, token.address).toLowerCase(), token])).values()];
  const balances: TokenBalance[] = [];
  const warnings = ['Token discovery covers this network\'s contracts in the cached market catalogue (up to the top 1,000 assets). NFTs, DeFi positions, staking and other assets are outside this scan.'];
  let nativeFailed = false;
  try {
    const native = hexInteger(await rpc(url, 'eth_getBalance', [wallet.address, block], options));
    balances.push({ coinId: chain.coinId, symbol: chain.symbol, quantity: formatQuantity(native, 18) });
  } catch (error) { nativeFailed = true; warnings.push(`Native balance unavailable: ${(error as Error).message}`); }
  let scannedContracts = 0;
  let failedContracts = 0;
  const batches: TokenContract[][] = [];
  const selected = contracts.slice(0, MAX_CONTRACTS);
  for (let index = 0; index < selected.length; index += BATCH_SIZE) batches.push(selected.slice(index, index + BATCH_SIZE));
  const balanceData = `0x70a08231${wallet.address.slice(2).toLowerCase().padStart(64, '0')}` as Hex;
  await pooled(batches, async (batch) => {
    try {
      const calls = batch.flatMap((token) => [
        { target: token.address as Hex, allowFailure: true, callData: balanceData },
        { target: token.address as Hex, allowFailure: true, callData: '0x313ce567' as Hex },
      ]);
      const data = encodeFunctionData({ abi: MULTICALL_ABI, functionName: 'aggregate3', args: [calls] });
      const result = await rpc(url, 'eth_call', [{ to: MULTICALL, data }, block], options);
      if (typeof result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(result)) throw new Error('Invalid multicall response.');
      const decoded = decodeFunctionResult({ abi: MULTICALL_ABI, functionName: 'aggregate3', data: result as Hex });
      if (decoded.length !== batch.length * 2) throw new Error('Invalid multicall result count.');
      batch.forEach((token, index) => {
        try {
          const balance = decoded[index * 2]!;
          const precision = decoded[index * 2 + 1]!;
          if (!balance.success) throw new Error();
          const amount = hexInteger(balance.returnData, true);
          if (amount !== 0n) {
            if (!precision.success) throw new Error();
            const decimals = Number(hexInteger(precision.returnData, true));
            balances.push({ coinId: token.coinId, symbol: token.symbol, contract: token.address, quantity: formatQuantity(amount, decimals) });
          }
          scannedContracts += 1;
        } catch { failedContracts += 1; }
      });
    } catch { failedContracts += batch.length; }
  });
  if (contracts.length === 0) warnings.push('No token catalogue is available for this network. Only its native asset was requested. Refresh markets before scanning tokens.');
  if (failedContracts) warnings.push(`${failedContracts} token contracts could not be read. Missing balances are unknown, not zero.`);
  if (contracts.length > MAX_CONTRACTS) warnings.push(`Scan capped at ${MAX_CONTRACTS} of ${contracts.length} token contracts. Remaining balances are unknown.`);
  if (nativeFailed && scannedContracts === 0) throw new Error('No wallet balances could be read. Your saved scan is unchanged.');
  return { walletId: wallet.id, balances, fetchedAt: new Date().toISOString(),
    complete: !nativeFailed && failedContracts === 0 && contracts.length > 0 && contracts.length <= MAX_CONTRACTS,
    scannedContracts, totalContracts: contracts.length, warnings };
}

async function scanSolana(wallet: Wallet, catalogue: TokenContract[], options: ProviderOptions): Promise<WalletScan> {
  const url = chainFor('solana').rpc!;
  const balances: TokenBalance[] = [];
  const warnings = ['Solana scans liquid SOL and owned SPL / Token-2022 accounts. Stake accounts, DeFi positions and confidential or interest-adjusted balances are outside this scan.'];
  let failed = false;
  let successfulRequests = 0;
  let scannedContracts = 0;
  let totalContracts = 0;
  try {
    const data = record(await rpc(url, 'getBalance', [wallet.address, { commitment: 'finalized' }], options));
    balances.push({ coinId: 'solana', symbol: 'SOL', quantity: formatQuantity(solanaInteger(data.value), 9) });
    successfulRequests += 1;
  } catch (error) { failed = true; warnings.push(`SOL balance unavailable: ${(error as Error).message}`); }
  const tokens = new Map(catalogue.filter((token) => token.chain === 'solana').map((token) => [token.address, token]));
  const amounts = new Map<string, { amount: bigint; decimals: number }>();
  const seenAccounts = new Set<string>();
  for (const programId of TOKEN_PROGRAMS) {
    try {
      const result = record(await rpc(url, 'getTokenAccountsByOwner', [wallet.address, { programId }, { encoding: 'jsonParsed', commitment: 'finalized' }], options));
      if (!Array.isArray(result.value)) throw new Error('Provider returned invalid token accounts.');
      successfulRequests += 1;
      totalContracts += result.value.length;
      if (result.value.length > MAX_TOKEN_ACCOUNTS) { failed = true; warnings.push(`Token program response exceeds ${MAX_TOKEN_ACCOUNTS} accounts; excess accounts were not processed.`); }
      for (const item of result.value.slice(0, MAX_TOKEN_ACCOUNTS)) {
        try {
          const entry = record(item);
          const pubkey = validateAddress('solana', text(entry.pubkey));
          if (seenAccounts.has(pubkey)) throw new Error('Duplicate account.');
          const account = record(entry.account);
          if (account.owner !== programId) throw new Error('Incorrect program owner.');
          const parsed = record(record(account.data).parsed);
          if (parsed.type !== 'account') throw new Error('Not a token account.');
          const info = record(parsed.info);
          if (info.owner !== wallet.address) throw new Error('Incorrect wallet owner.');
          const mint = validateAddress('solana', text(info.mint));
          const tokenAmount = record(info.tokenAmount);
          const amount = solanaInteger(tokenAmount.amount);
          const decimals = tokenAmount.decimals;
          if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid decimals.');
          const previous = amounts.get(mint);
          if (previous && previous.decimals !== decimals) throw new Error('Inconsistent decimals.');
          amounts.set(mint, { amount: (previous?.amount ?? 0n) + amount, decimals });
          seenAccounts.add(pubkey);
          scannedContracts += 1;
        } catch { failed = true; }
      }
    } catch (error) { failed = true; warnings.push(`${programId === TOKEN_PROGRAMS[0] ? 'SPL Token' : 'Token-2022'} scan unavailable: ${(error as Error).message}`); }
  }
  let unlisted = 0;
  for (const [mint, holding] of amounts) {
    if (holding.amount === 0n) continue;
    const token = tokens.get(mint);
    if (!token) unlisted += 1;
    balances.push({ coinId: token?.coinId ?? null, symbol: token?.symbol ?? 'UNLISTED', contract: mint, quantity: formatQuantity(holding.amount, holding.decimals) });
  }
  if (unlisted) warnings.push(`${unlisted} token mints are outside the cached market catalogue and have no price. Unlisted assets may include spam or NFTs.`);
  if (scannedContracts < totalContracts) warnings.push(`${totalContracts - scannedContracts} token accounts could not be interpreted. Missing balances are unknown, not zero.`);
  if (successfulRequests === 0) throw new Error('No wallet balances could be read. Your saved scan is unchanged.');
  return { walletId: wallet.id, balances, fetchedAt: new Date().toISOString(), complete: !failed, scannedContracts, totalContracts, warnings };
}

export async function scanWallet(wallet: Wallet, catalogue: TokenContract[], options: ProviderOptions = {}): Promise<WalletScan> {
  const normalized = { ...wallet, address: validateAddress(wallet.chain, wallet.address) };
  const deadline = AbortSignal.timeout(60_000);
  const boundedOptions = { ...options, signal: options.signal ? AbortSignal.any([deadline, options.signal]) : deadline };
  if (wallet.chain === 'bitcoin') return scanBitcoin(normalized, boundedOptions);
  if (wallet.chain === 'solana') return scanSolana(normalized, catalogue, boundedOptions);
  return scanEvm(normalized, catalogue, boundedOptions);
}
