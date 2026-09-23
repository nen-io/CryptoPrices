import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Vault } from '../src/core/vault';
import { Service, validateCommand } from '../src/core/service';
import type { WalletScan, MarketSnapshot } from '../src/shared/types';
import type { ProviderOptions } from '../src/core/providers';
const address = '0x0000000000000000000000000000000000000001';
describe('privileged service boundaries', () => {
  let directory: string; let vault: Vault; let service: Service;
  beforeEach(async () => { directory = mkdtempSync(join(tmpdir(), 'cp-service-')); vault = new Vault(join(directory, 'test.sqlite')); service = new Service(vault); await vault.register('test-profile', 'a very long test passphrase'); });
  afterEach(() => { vault.close(); rmSync(directory, { recursive: true, force: true }); });
  it('requires a session for every private mutation', async () => {
    vault.lock(); await expect(service.command({ type: 'holding:add', coinId: 'bitcoin', quantity: '1' })).rejects.toThrow();
    expect(service.state().vault).toBeNull();
  });
  it('invalid account-switch credentials leave the previous vault locked', async () => {
    await expect(service.command({ type: 'unlock', username: 'x', password: 'short' })).rejects.toThrow();
    expect(service.state().vault).toBeNull();
  });
  it('returns key presence without returning the provider credential', async () => {
    const state = await service.command({ type: 'settings:key', key: 'CG-private-test-key' });
    expect(state.vault?.settings.hasApiKey).toBe(true);
    expect(JSON.stringify(state)).not.toContain('CG-private-test-key');
  });
  it('adds offline with no request and rejects network-address duplicates', async () => {
    await service.command({ type: 'wallet:add', name: 'Main', chain: 'ethereum', address });
    await expect(service.command({ type: 'wallet:add', name: 'Other', chain: 'ethereum', address })).rejects.toThrow('already tracked');
    await service.command({ type: 'wallet:add', name: 'Base', chain: 'base', address });
    expect(service.state().vault?.wallets).toHaveLength(2);
  });
  it('rejects a late provider response after locking', async () => {
    let finish!: (scan: WalletScan) => void;
    const network = { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn(() => new Promise<WalletScan>(resolve => { finish = resolve; })) };
    service = new Service(vault, network as any);
    await service.command({ type: 'wallet:add', name: 'Main', chain: 'ethereum', address });
    const id = service.state().vault!.wallets[0]!.id;
    const request = service.command({ type: 'wallet:refresh', id, consent: true });
    vault.lock(); finish({ walletId: id, balances: [], fetchedAt: '', complete: true, scannedContracts: 0, totalContracts: 0, warnings: [] });
    await expect(request).rejects.toThrow('locked');
    await vault.unlock('test-profile', 'a very long test passphrase');
    expect(vault.read().walletScans).toHaveLength(0);
  });
  it('rebases provider results over edits made while syncing', async () => {
    let finish!: (scan: WalletScan) => void;
    service = new Service(vault, { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn(() => new Promise<WalletScan>(resolve => { finish = resolve; })) } as any);
    await service.command({ type: 'wallet:add', name: 'Main', chain: 'ethereum', address });
    const id = vault.read().wallets[0]!.id;
    const request = service.command({ type: 'wallet:refresh', id, consent: true });
    await service.command({ type: 'holding:add', coinId: 'bitcoin', quantity: '0.00000001' });
    finish({ walletId: id, balances: [], fetchedAt: '', complete: true, scannedContracts: 0, totalContracts: 0, warnings: [] });
    await request; expect(vault.read().manualHoldings[0]!.quantity).toBe('0.00000001');
  });
  it('preserves a complete market cache when refresh only fetches some pages', async () => {
    const prior: MarketSnapshot = { coins: [], fetchedAt: 'old', requestedCount: 1000, pagesFetched: 4, complete: true, warnings: [] };
    vault.cacheWrite('markets', prior);
    service = new Service(vault, { fetchMarkets: vi.fn(async () => ({ ...prior, complete: false })), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn() } as any);
    await expect(service.command({ type: 'markets:refresh' })).rejects.toThrow('preserved');
    expect(vault.cacheRead('markets')).toEqual(prior);
  });
  it.each(['lock', 'register', 'unlock'])('cancels active provider requests when %s begins', async type => {
    let signal: AbortSignal | undefined;
    const network = { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn((_wallet, _catalogue, options: ProviderOptions) => {
      signal = options.signal;
      return new Promise<WalletScan>((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('Provider cancelled')), { once: true }));
    }) };
    service = new Service(vault, network as any);
    await service.command({ type: 'wallet:add', name: 'Main', chain: 'ethereum', address });
    const id = vault.read().wallets[0]!.id;
    const request = service.command({ type: 'wallet:refresh', id, consent: true });
    const rejection = expect(request).rejects.toThrow('cancelled');
    if (type === 'lock') await service.command({ type });
    else await expect(service.command({ type, username: 'invalid', password: 'short' })).rejects.toThrow();
    expect(signal?.aborted).toBe(true);
    await rejection;
    expect(vault.session()).toBeNull();
  });
  it('cancels a removed wallet request without cancelling another wallet', async () => {
    const signals = new Map<string, AbortSignal>();
    const finishes = new Map<string, () => void>();
    service = new Service(vault, { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn((wallet, _catalogue, options: ProviderOptions) => {
      signals.set(wallet.id, options.signal!);
      return new Promise<WalletScan>(resolve => finishes.set(wallet.id, () => resolve({ walletId: wallet.id, balances: [], fetchedAt: '', complete: true, scannedContracts: 0, totalContracts: 0, warnings: [] })));
    }) } as any);
    await service.command({ type: 'wallet:add', name: 'Ethereum', chain: 'ethereum', address });
    await service.command({ type: 'wallet:add', name: 'Base', chain: 'base', address });
    const [first, second] = vault.read().wallets;
    const removed = service.command({ type: 'wallet:refresh', id: first!.id, consent: true });
    const retained = service.command({ type: 'wallet:refresh', id: second!.id, consent: true });
    await service.command({ type: 'wallet:remove', id: first!.id });
    expect(signals.get(first!.id)?.aborted).toBe(true);
    expect(signals.get(second!.id)?.aborted).toBe(false);
    finishes.get(first!.id)!();
    await expect(removed).rejects.toThrow('removed');
    finishes.get(second!.id)!();
    await retained;
    expect(vault.read().walletScans.map(scan => scan.walletId)).toEqual([second!.id]);
  });
  it('does not let an old cancelled request release a new refresh slot', async () => {
    const finishes: ((snapshot: MarketSnapshot) => void)[] = [];
    service = new Service(vault, { fetchMarkets: vi.fn(() => new Promise<MarketSnapshot>(resolve => finishes.push(resolve))), fetchTokenCatalogue: vi.fn(async () => []), scanWallet: vi.fn() } as any);
    const priorRequest = service.command({ type: 'markets:refresh' });
    await service.command({ type: 'lock' });
    await service.command({ type: 'unlock', username: 'test-profile', password: 'a very long test passphrase' });
    const currentRequest = service.command({ type: 'markets:refresh' });
    const snapshot: MarketSnapshot = { coins: [], fetchedAt: 'fixture', requestedCount: 1000, pagesFetched: 4, complete: true, warnings: [] };
    finishes[0]!(snapshot);
    await expect(priorRequest).rejects.toThrow('locked');
    await expect(service.command({ type: 'markets:refresh' })).rejects.toThrow('already running');
    finishes[1]!(snapshot);
    await currentRequest;
  });
});
describe('IPC schema', () => {
  it.each([{}, { type: 'shell:run' }, { type: 'wallet:refresh', id: 'x' }, { type: 'holding:add', coinId: 'bitcoin', quantity: '1e9' }, { type: 'holding:add', coinId: 'bitcoin', quantity: '-1' }, { type: 'wallet:add', name: 'Main', chain: 'madeup', address }])('rejects invalid input %j', input => expect(() => validateCommand(input)).toThrow());
});
