import type { MarketCoin, VaultView } from './types';

/** Exact decimal addition for persisted balances; floating point is only used for estimated fiat valuation. */
export function addQuantity(a: string, b: string): string {
  const [aw, af = ''] = a.split('.'); const [bw, bf = ''] = b.split('.');
  const scale = Math.max(af.length, bf.length);
  const sum = BigInt(aw + af.padEnd(scale, '0')) + BigInt(bw + bf.padEnd(scale, '0'));
  if (!scale) return sum.toString();
  const digits = sum.toString().padStart(scale + 1, '0');
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/, '');
}
export function portfolio(vault: VaultView, markets: MarketCoin[]) {
  const assets = new Map<string, { key: string; coinId: string | null; symbol: string; name: string; quantity: string; value: number | null; sources: number }>();
  const add = (key: string, coinId: string | null, quantity: string, symbol?: string) => {
    const coin = markets.find(coin => coin.id === coinId);
    const existing = assets.get(key);
    const total = existing ? addQuantity(existing.quantity, quantity) : quantity;
    const estimate = coin?.price == null ? null : Number(total) * coin.price;
    assets.set(key, { key, coinId, symbol: coin?.symbol ?? symbol ?? coinId ?? 'TOKEN', name: coin?.name ?? coinId ?? 'Unlisted token', quantity: total, value: estimate !== null && Number.isFinite(estimate) ? estimate : null, sources: (existing?.sources ?? 0) + 1 });
  };
  for (const holding of vault.manualHoldings) add(holding.coinId, holding.coinId, holding.quantity);
  for (const wallet of vault.wallets) {
    const scan = vault.walletScans.find(scan => scan.walletId === wallet.id);
    for (const balance of scan?.balances ?? []) add(balance.coinId ?? `${wallet.chain}:${balance.contract}`, balance.coinId, balance.quantity, balance.symbol);
  }
  const rows = [...assets.values()].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  return { rows, total: rows.reduce((sum, row) => sum + (row.value ?? 0), 0), unpriced: rows.filter(row => row.value === null).length, incomplete: vault.wallets.some(w => !vault.walletScans.find(s => s.walletId === w.id)?.complete) };
}
