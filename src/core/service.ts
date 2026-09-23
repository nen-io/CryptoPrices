import { randomUUID } from 'node:crypto';
import { Vault } from './vault';
import { CHAINS, validateAddress } from './chains';
import * as providers from './providers';
import type { AppState, Command, MarketSnapshot, TokenContract } from '../shared/types';

function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}.`);
  return value.trim();
}
export function validateCommand(input: unknown): Command {
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 8192) throw new Error('Invalid request.');
  const c = input as Record<string, unknown>;
  switch (c.type) {
    case 'state': case 'lock': case 'markets:refresh': return { type: c.type };
    case 'register': case 'unlock':
      if (typeof c.password !== 'string' || c.password.length > 1024) throw new Error('Invalid passphrase.');
      return { type: c.type, username: text(c.username, 'profile name', 32), password: c.password };
    case 'wallet:add': {
      if (!CHAINS.some(chain => chain.id === c.chain)) throw new Error('Unsupported network.');
      const chain = c.chain as Extract<Command, { type: 'wallet:add' }>['chain'];
      return { type: c.type, name: text(c.name, 'wallet label', 60), chain, address: validateAddress(chain, text(c.address, 'public address', 128)) };
    }
    case 'wallet:remove': case 'holding:remove': return { type: c.type, id: text(c.id, 'record', 64) };
    case 'wallet:refresh':
      if (c.consent !== true) throw new Error('Confirm the provider disclosure before refreshing.');
      return { type: c.type, id: text(c.id, 'wallet', 64), consent: true };
    case 'holding:add': {
      const quantity = text(c.quantity, 'quantity', 80);
      if (!/^(0|[1-9]\d{0,29})(\.\d{1,36})?$/.test(quantity) || !/[1-9]/.test(quantity)) throw new Error('Enter a positive decimal quantity (up to 36 decimal places).');
      return { type: c.type, coinId: text(c.coinId, 'asset', 128), quantity };
    }
    case 'watchlist:toggle': return { type: c.type, coinId: text(c.coinId, 'asset', 128) };
    case 'settings:key':
      if (typeof c.key !== 'string' || c.key.length > 256 || !/^[A-Za-z0-9_-]*$/.test(c.key)) throw new Error('Invalid CoinGecko Demo API key.');
      return { type: c.type, key: c.key };
    default: throw new Error('Unknown request.');
  }
}

export class Service {
  private refreshing = new Map<string, AbortController>();
  constructor(readonly vault: Vault, private readonly network = providers) {}
  private lock(): void {
    this.vault.lock();
    for (const controller of this.refreshing.values()) controller.abort();
    this.refreshing.clear();
  }
  state(): AppState {
    const profile = this.vault.session();
    const doc = profile ? this.vault.read() : null;
    return {
      profiles: this.vault.listProfiles(), profile,
      vault: doc ? { ...doc, settings: { currency: 'usd', hasApiKey: !!doc.settings.coingeckoKey } } : null,
      markets: this.vault.cacheRead<MarketSnapshot>('markets'),
      catalogueCount: (this.vault.cacheRead<TokenContract[]>('catalogue') ?? []).length
    };
  }
  private assertGeneration(generation: number): void {
    if (this.vault.generation !== generation || !this.vault.session()) throw new Error('Vault was locked. Unlock and try again.');
  }
  async command(input: unknown): Promise<AppState> {
    if (input && typeof input === 'object' && ['register', 'unlock'].includes(String((input as { type?: unknown }).type))) this.lock();
    const c = validateCommand(input);
    if (c.type === 'state') return this.state();
    if (c.type === 'lock') { this.lock(); return this.state(); }
    if (c.type === 'register' || c.type === 'unlock') { await this.vault[c.type](c.username, c.password); return this.state(); }
    let doc = this.vault.read();
    const generation = this.vault.generation;
    if (c.type === 'markets:refresh' || c.type === 'wallet:refresh') {
      const key = c.type === 'markets:refresh' ? 'markets' : c.id;
      if (this.refreshing.has(key)) throw new Error('A refresh is already running.');
      const controller = new AbortController();
      this.refreshing.set(key, controller);
      try {
        const options = { apiKey: doc.settings.coingeckoKey, signal: controller.signal };
        if (c.type === 'markets:refresh') {
          const markets = await this.network.fetchMarkets(options);
          this.assertGeneration(generation);
          const prior = this.vault.cacheRead<MarketSnapshot>('markets');
          if (!markets.complete && prior?.complete) throw new Error('Market refresh was incomplete. Your previous snapshot is preserved; try again later.');
          try {
            const catalogue = await this.network.fetchTokenCatalogue(markets.coins.map(coin => coin.id), options);
            this.assertGeneration(generation);
            this.vault.cacheWrite('catalogue', catalogue);
          } catch {
            this.assertGeneration(generation);
            markets.warnings.push('Token catalogue refresh failed. Previous contract coverage is preserved.');
          }
          this.vault.cacheWrite('markets', markets);
        } else {
          const wallet = doc.wallets.find(wallet => wallet.id === c.id);
          if (!wallet) throw new Error('Wallet not found.');
          const catalogue = this.vault.cacheRead<TokenContract[]>('catalogue') ?? [];
          const scan = await this.network.scanWallet(wallet, catalogue, options);
          this.assertGeneration(generation);
          // Re-read after network I/O; preserve edits made while the request was pending.
          doc = this.vault.read();
          if (!doc.wallets.some(wallet => wallet.id === c.id)) throw new Error('Wallet was removed during refresh.');
          doc.walletScans = [...doc.walletScans.filter(scan => scan.walletId !== c.id), scan];
          this.vault.write(doc);
        }
      } finally {
        // An older cancelled request must not release a new session's refresh slot.
        if (this.refreshing.get(key) === controller) this.refreshing.delete(key);
      }
      return this.state();
    }
    switch (c.type) {
      case 'wallet:add':
        if (doc.wallets.length >= 100) throw new Error('This vault supports up to 100 watched addresses.');
        if (doc.wallets.some(w => w.chain === c.chain && w.address === c.address)) throw new Error('This address is already tracked on this network.');
        doc.wallets.push({ id: randomUUID(), name: c.name, chain: c.chain, address: c.address, createdAt: new Date().toISOString() });
        break;
      case 'wallet:remove':
        this.refreshing.get(c.id)?.abort();
        this.refreshing.delete(c.id);
        doc.wallets = doc.wallets.filter(w => w.id !== c.id); doc.walletScans = doc.walletScans.filter(s => s.walletId !== c.id); break;
      case 'holding:add': {
        const markets = this.vault.cacheRead<MarketSnapshot>('markets');
        const offlineCoins = ['bitcoin','ethereum','solana','usd-coin','tether','binancecoin','ripple','cardano','dogecoin','avalanche-2'];
        if (!markets?.coins.some(coin => coin.id === c.coinId) && !offlineCoins.includes(c.coinId)) throw new Error('Choose an asset from the market catalogue.');
        if (doc.manualHoldings.length >= 1000) throw new Error('This vault supports up to 1,000 manual positions.');
        doc.manualHoldings.push({ id: randomUUID(), coinId: c.coinId, quantity: c.quantity }); break;
      }
      case 'holding:remove': doc.manualHoldings = doc.manualHoldings.filter(h => h.id !== c.id); break;
      case 'watchlist:toggle':
        if (doc.watchlist.includes(c.coinId)) doc.watchlist = doc.watchlist.filter(id => id !== c.coinId);
        else { if (doc.watchlist.length >= 1000) throw new Error('Watchlist limit reached.'); doc.watchlist.push(c.coinId); } break;
      case 'settings:key': doc.settings.coingeckoKey = c.key || undefined; break;
    }
    this.vault.write(doc);
    return this.state();
  }
}
