import { describe, expect, it, vi } from 'vitest';
import { base58, bech32, bech32m } from '@scure/base';
import { decodeFunctionData, encodeFunctionResult, parseAbi, toHex } from 'viem';
import { CHAINS, validateAddress } from '../src/core/chains';
import { fetchMarkets, fetchTokenCatalogue, formatQuantity, scanWallet } from '../src/core/providers';
import type { ChainId, TokenContract, Wallet } from '../src/shared/types';

const EVM = '0x0000000000000000000000000000000000000001';
const SOL = '11111111111111111111111111111111';
const MINT = base58.encode(Uint8Array.from({ length: 32 }, () => 2));
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const MULTICALL_ABI = parseAbi(['function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)']);
const wallet = (chain: ChainId, address = EVM): Wallet => ({ id: 'wallet-1', name: 'Watch only', chain, address, createdAt: '2026-09-17T00:00:00Z' });
const token = (index = 2): TokenContract => ({ coinId: `coin-${index}`, symbol: `C${index}`, name: `Coin ${index}`, chain: 'ethereum', address: `0x${index.toString(16).padStart(40, '0')}` });
const json = (value: unknown): Response => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const fixtureFetch = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch => vi.fn(async (input, init) => handler(String(input), init)) as unknown as typeof fetch;
const rpcFetch = (handler: (method: string, params: unknown[]) => unknown): typeof fetch => fixtureFetch((_url, init) => {
  const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
  return json({ jsonrpc: '2.0', id: 1, result: handler(request.method, request.params) });
});
const market = (rank: number) => ({ id: `coin-${rank}`, symbol: `c${rank}`, name: `Coin ${rank}`, current_price: rank,
  market_cap: rank * 1000, market_cap_rank: rank, price_change_percentage_24h: null,
  sparkline_in_7d: { price: [1, 2, 3] } });

describe('local public-address validation', () => {
  it('accepts checksummed and lowercase EVM addresses; rejects bad checksums and secrets', () => {
    expect(validateAddress('ethereum', '0x52908400098527886E0F7030069857D2E4169EE7')).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
    expect(validateAddress('base', EVM)).toBe(EVM);
    expect(() => validateAddress('ethereum', '0x52908400098527886E0F7030069857D2E4169Ee7')).toThrow(/checksum/);
    expect(() => validateAddress('ethereum', `0x${'1'.repeat(64)}`)).toThrow();
  });
  it('validates Bitcoin base58check and mainnet SegWit versions rather than a length regex', () => {
    const legacy = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    expect(validateAddress('bitcoin', legacy)).toBe(legacy);
    expect(() => validateAddress('bitcoin', `${legacy.slice(0, -1)}b`)).toThrow(/checksum/);
    const words = bech32.toWords(Uint8Array.from({ length: 32 }, () => 3));
    const taproot = bech32m.encode('bc', [1, ...words]);
    expect(validateAddress('bitcoin', taproot.toUpperCase())).toBe(taproot);
    expect(() => validateAddress('bitcoin', bech32.encode('bc', [1, ...words]))).toThrow();
    expect(() => validateAddress('bitcoin', bech32m.encode('tb', [1, ...words]))).toThrow();
  });
  it('accepts only a 32-byte Solana public key', () => {
    expect(validateAddress('solana', SOL)).toBe(SOL);
    expect(() => validateAddress('solana', base58.encode(new Uint8Array(64)))).toThrow();
    expect(() => validateAddress('solana', '11111')).toThrow();
    expect(() => validateAddress('unknown' as ChainId, SOL)).toThrow(/Unsupported/);
  });
});

describe('market catalogue', () => {
  it('fetches four 250-asset pages and preserves missing values as null', async () => {
    const fetcher = fixtureFetch((url, init) => {
      expect(new URL(url).origin).toBe('https://api.coingecko.com');
      expect(init?.redirect).toBe('error');
      expect(init?.credentials).toBe('omit');
      const page = Number(new URL(url).searchParams.get('page'));
      return json(Array.from({ length: 250 }, (_, index) => market((page - 1) * 250 + index + 1)));
    });
    const result = await fetchMarkets({ fetcher });
    expect(result.complete).toBe(true);
    expect(result.coins).toHaveLength(1000);
    expect(result.coins[0]?.change24h).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('reports partial pagination and never invents rows after rate limiting', async () => {
    const fetcher = fixtureFetch((url) => new URL(url).searchParams.get('page') === '2' ? new Response('', { status: 429 }) : json([market(Number(new URL(url).searchParams.get('page')))]));
    const result = await fetchMarkets({ fetcher });
    expect(result.complete).toBe(false);
    expect(result.pagesFetched).toBe(3);
    expect(result.coins).toHaveLength(3);
    expect(result.warnings.join(' ')).toContain('rate limit');
  });
  it('preserves nullable market ranks returned on real CoinGecko pages', async () => {
    const result = await fetchMarkets({ fetcher: fixtureFetch(() => json([{ ...market(1), market_cap_rank: null }])) });
    expect(result.coins).toHaveLength(1);
    expect(result.coins[0]?.rank).toBeNull();
    expect(result.pagesFetched).toBe(4);
  });
  it('rejects total failure and oversized responses', async () => {
    await expect(fetchMarkets({ fetcher: fixtureFetch(() => new Response('offline', { status: 503 })) })).rejects.toThrow(/HTTP 503/);
    await expect(fetchMarkets({ fetcher: fixtureFetch(() => new Response('[]', { headers: { 'content-length': '99999999' } })) })).rejects.toThrow(/size limit/);
  });
  it('honors cancellation before a request is sent', async () => {
    const fetcher = fixtureFetch(() => json([]));
    const controller = new AbortController();
    controller.abort();
    await expect(fetchMarkets({ fetcher, signal: controller.signal })).rejects.toThrow(/cancelled/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('maps exact asset identities and chain addresses, never symbols', async () => {
    const fetcher = fixtureFetch(() => json([
      { id: 'usdc', symbol: 'usdc', name: 'USDC', platforms: { ethereum: EVM, solana: MINT, tron: 'unsupported-platform' } },
      { id: 'impostor', symbol: 'usdc', name: 'Other asset', platforms: { ethereum: token(3).address } },
    ]));
    const result = await fetchTokenCatalogue(['usdc'], { fetcher });
    expect(result.map((entry) => entry.chain)).toEqual(['ethereum', 'solana']);
    expect(result.every((entry) => entry.coinId === 'usdc')).toBe(true);
  });
  it('rejects conflicting contract identities instead of double-counting a token', async () => {
    const fetcher = fixtureFetch(() => json(['one', 'two'].map((id) => ({ id, symbol: id, name: id, platforms: { ethereum: EVM } }))));
    await expect(fetchTokenCatalogue(['one', 'two'], { fetcher })).rejects.toThrow(/multiple assets/);
  });
  it('does not catalogue the Polygon contract that mirrors the native POL balance', async () => {
    const fetcher = fixtureFetch(() => json([
      { id: 'polygon-ecosystem-token', symbol: 'pol', name: 'POL', platforms: { ethereum: EVM, 'polygon-pos': '0x0000000000000000000000000000000000001010' } },
      { id: 'wrapped-pol', symbol: 'wpol', name: 'Wrapped POL', platforms: { 'polygon-pos': token(3).address } },
    ]));
    const result = await fetchTokenCatalogue(['polygon-ecosystem-token', 'wrapped-pol'], { fetcher });
    expect(result.map(({ coinId, chain }) => [coinId, chain])).toEqual([
      ['polygon-ecosystem-token', 'ethereum'], ['wrapped-pol', 'polygon'],
    ]);
  });
});

describe('wallet scan correctness', () => {
  it('keeps uint256 precision beyond JavaScript safe integers', () => {
    expect(formatQuantity(9007199254740993123456789n, 18)).toBe('9007199.254740993123456789');
    expect(formatQuantity(1n, 18)).toBe('0.000000000000000001');
    expect(formatQuantity(0n, 9)).toBe('0');
    expect(() => formatQuantity(1n, 256)).toThrow();
  });
  it('pins EVM native and token calls to a block, batches reads, and treats contract failures as partial', async () => {
    const fetcher = rpcFetch((method, params) => {
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_blockNumber') return '0x123';
      expect(params.at(-1)).toBe('0x123');
      if (method === 'eth_getBalance') return '0xde0b6b3a7640001';
      expect(method).toBe('eth_call');
      const call = params[0] as { data: `0x${string}` };
      const decoded = decodeFunctionData({ abi: MULTICALL_ABI, data: call.data });
      expect(decoded.args[0]).toHaveLength(4);
      return encodeFunctionResult({ abi: MULTICALL_ABI, functionName: 'aggregate3', result: [
        { success: true, returnData: toHex(9007199254740993123456789n, { size: 32 }) },
        { success: true, returnData: toHex(18, { size: 32 }) },
        { success: false, returnData: '0x' }, { success: false, returnData: '0x' },
      ] });
    });
    const result = await scanWallet(wallet('ethereum'), [token(2), token(3)], { fetcher });
    expect(result.complete).toBe(false);
    expect(result.scannedContracts).toBe(1);
    expect(result.totalContracts).toBe(2);
    expect(result.balances.map((entry) => entry.quantity)).toEqual(['1.000000000000000001', '9007199.254740993123456789']);
    expect(result.warnings.join(' ')).toContain('unknown, not zero');
  });
  it('aborts an EVM scan if provider reports the wrong network', async () => {
    const fetcher = rpcFetch(() => '0x89');
    await expect(scanWallet(wallet('ethereum'), [token()], { fetcher })).rejects.toThrow(/wrong network/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('counts native Polygon POL once even with an older cached native contract alias', async () => {
    const nativeAlias: TokenContract = { coinId: 'polygon-ecosystem-token', symbol: 'POL', name: 'POL', chain: 'polygon', address: '0x0000000000000000000000000000000000001010' };
    const wrapped: TokenContract = { ...token(3), coinId: 'wrapped-pol', chain: 'polygon' };
    const fetcher = rpcFetch((method, params) => {
      if (method === 'eth_chainId') return '0x89';
      if (method === 'eth_blockNumber') return '0x123';
      if (method === 'eth_getBalance') return toHex(10n ** 18n);
      const call = params[0] as { data: `0x${string}` };
      const calls = decodeFunctionData({ abi: MULTICALL_ABI, data: call.data }).args[0];
      expect(calls.map(entry => entry.target)).toEqual([wrapped.address, wrapped.address]);
      return encodeFunctionResult({ abi: MULTICALL_ABI, functionName: 'aggregate3', result: [
        { success: true, returnData: toHex(2n * 10n ** 18n, { size: 32 }) },
        { success: true, returnData: toHex(18, { size: 32 }) },
      ] });
    });
    const result = await scanWallet(wallet('polygon'), [nativeAlias, wrapped], { fetcher });
    expect(result.balances.map(({ coinId, quantity }) => [coinId, quantity])).toEqual([
      ['polygon-ecosystem-token', '1'], ['wrapped-pol', '2'],
    ]);
    expect(result.totalContracts).toBe(1);
    expect(result.scannedContracts).toBe(1);
  });
  it('does not equate a failed native and token scan with an empty wallet', async () => {
    const fetcher = rpcFetch((method) => {
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_blockNumber') return '0x123';
      throw new Error('private provider response which must not reach the renderer');
    });
    await expect(scanWallet(wallet('ethereum'), [token()], { fetcher })).rejects.toThrow(/No wallet balances/);
  });
  it('rejects invalid public addresses before sending them to a provider', async () => {
    const fetcher = fixtureFetch(() => json({}));
    await expect(scanWallet(wallet('ethereum', 'a seed phrase belongs nowhere near an RPC'), [], { fetcher })).rejects.toThrow(/address/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('marks native-only EVM scans as incomplete when the catalogue is empty', async () => {
    const fetcher = rpcFetch((method) => method === 'eth_chainId' ? '0x1' : method === 'eth_blockNumber' ? '0x10' : '0x0');
    const result = await scanWallet(wallet('ethereum'), [], { fetcher });
    expect(result.complete).toBe(false);
    expect(result.warnings.join(' ')).toContain('Only its native asset');
  });
  it.each([1000, 1001])('limits multicall concurrency and reports any cap for %i contracts', async (count) => {
    let active = 0;
    let maximum = 0;
    const fetcher = fixtureFetch(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      let result: unknown;
      if (request.method === 'eth_chainId') result = '0x1';
      else if (request.method === 'eth_blockNumber') result = '0x1';
      else if (request.method === 'eth_getBalance') result = '0x0';
      else {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        const input = request.params[0] as { data: `0x${string}` };
        const calls = decodeFunctionData({ abi: MULTICALL_ABI, data: input.data }).args[0];
        result = encodeFunctionResult({ abi: MULTICALL_ABI, functionName: 'aggregate3', result: calls.map(() => ({ success: true, returnData: toHex(0, { size: 32 }) })) });
        active -= 1;
      }
      return json({ jsonrpc: '2.0', id: 1, result });
    });
    const result = await scanWallet(wallet('ethereum'), Array.from({ length: count }, (_, index) => token(index + 2)), { fetcher });
    expect(result.complete).toBe(count === 1000);
    expect(result.scannedContracts).toBe(1000);
    expect(result.totalContracts).toBe(count);
    if (count > 1000) expect(result.warnings.join(' ')).toContain('Scan capped at 1000');
    expect(maximum).toBeLessThanOrEqual(3);
    expect(result.balances).toHaveLength(1);
  });
  it('keeps Bitcoin confirmed and pending effects separate', async () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const fetcher = fixtureFetch((url) => {
      expect(new URL(url).host).toBe('blockstream.info');
      return json({ address, chain_stats: { funded_txo_sum: 100_000_001, spent_txo_sum: 1 }, mempool_stats: { funded_txo_sum: 10_000, spent_txo_sum: 0 } });
    });
    const result = await scanWallet(wallet('bitcoin', address), [], { fetcher });
    expect(result.balances[0]?.quantity).toBe('1');
    expect(result.warnings.join(' ')).toContain('confirmed transactions only');
  });
  it('rejects unsafe JSON numeric native amounts', async () => {
    const fetcher = rpcFetch((method) => method === 'getBalance' ? { value: Number.MAX_SAFE_INTEGER + 2 } : { value: [] });
    const result = await scanWallet(wallet('solana', SOL), [], { fetcher });
    expect(result.complete).toBe(false);
    expect(result.balances).toEqual([]);
    expect(result.warnings.join(' ')).toContain('inexact');
  });
  it('queries both Solana token programs and aggregates owner accounts using raw integers', async () => {
    const account = (key: number, amount: string) => ({ pubkey: base58.encode(Uint8Array.from({ length: 32 }, () => key)),
      account: { owner: TOKEN_PROGRAM, data: { parsed: { type: 'account', info: { owner: SOL, mint: MINT, tokenAmount: { amount, decimals: 6, uiAmount: 0 } } } } } });
    const fetcher = rpcFetch((method, params) => {
      if (method === 'getBalance') return { value: 1_000_000_001 };
      const program = (params[1] as { programId: string }).programId;
      return { value: program === TOKEN_PROGRAM ? [account(3, '9007199254740993'), account(4, '1')] : [] };
    });
    const result = await scanWallet(wallet('solana', SOL), [], { fetcher });
    expect(result.complete).toBe(true);
    expect(result.scannedContracts).toBe(2);
    expect(result.balances[1]).toEqual({ coinId: null, symbol: 'UNLISTED', contract: MINT, quantity: '9007199254.740994' });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('marks a Token-2022 RPC error as partial and never fabricates zero balances', async () => {
    const fetcher = fixtureFetch((_url, init) => {
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      if (request.method === 'getBalance') return json({ jsonrpc: '2.0', id: 1, result: { value: 0 } });
      if ((request.params[1] as { programId: string }).programId === TOKEN_PROGRAM) return json({ jsonrpc: '2.0', id: 1, result: { value: [] } });
      return json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Sensitive text not exposed' } });
    });
    const result = await scanWallet(wallet('solana', SOL), [], { fetcher });
    expect(result.complete).toBe(false);
    expect(result.warnings.join(' ')).toContain('Token-2022 scan unavailable');
    expect(result.warnings.join(' ')).not.toContain('Sensitive');
  });
  it('includes positive Token-2022 balances but rejects token accounts belonging to another wallet', async () => {
    const token2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
    const account = (key: number, owner: string) => ({ pubkey: base58.encode(Uint8Array.from({ length: 32 }, () => key)), account: {
      owner: token2022, data: { parsed: { type: 'account', info: { owner, mint: MINT, tokenAmount: { amount: '12345678', decimals: 6 } } } },
    } });
    const fetcher = rpcFetch((method, params) => {
      if (method === 'getBalance') return { value: 0 };
      const program = (params[1] as { programId: string }).programId;
      return { value: program === token2022 ? [account(3, SOL), account(4, MINT)] : [] };
    });
    const result = await scanWallet(wallet('solana', SOL), [{ ...token(), chain: 'solana', address: MINT }], { fetcher });
    expect(result.complete).toBe(false);
    expect(result.scannedContracts).toBe(1);
    expect(result.totalContracts).toBe(2);
    expect(result.balances[1]?.quantity).toBe('12.345678');
    expect(result.balances[1]?.coinId).toBe('coin-2');
  });
  it('never forwards the optional CoinGecko key to wallet providers', async () => {
    const fetcher = fixtureFetch((_url, init) => {
      expect(init?.headers).not.toHaveProperty('x-cg-demo-api-key');
      const request = JSON.parse(String(init?.body)) as { method: string };
      return json({ jsonrpc: '2.0', id: 1, result: request.method === 'getBalance' ? { value: 0 } : { value: [] } });
    });
    await scanWallet(wallet('solana', SOL), [], { fetcher, apiKey: 'CG-fixture-key' });
  });
  it('has a fixed HTTPS provider for every supported chain', () => {
    expect(CHAINS).toHaveLength(9);
    expect(CHAINS.every((chain) => chain.id === 'bitcoin' || chain.rpc?.startsWith('https://'))).toBe(true);
  });
});
