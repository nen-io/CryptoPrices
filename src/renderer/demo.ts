import type { MarketCoin, VaultView } from '../shared/types';
// Fictional illustrative values. Never store these or use them to value a real profile.
export const DEMO_COINS: MarketCoin[] = [
  ['bitcoin', 'BTC', 'Bitcoin', 64284.1, 2.34, 1260000000000],
  ['ethereum', 'ETH', 'Ethereum', 3421.56, 1.82, 411000000000],
  ['solana', 'SOL', 'Solana', 148.72, -0.64, 68100000000],
  ['usd-coin', 'USDC', 'USD Coin', 1, 0.01, 32100000000],
  ['binancecoin', 'BNB', 'BNB', 593.5, 1.34, 87600000000],
  ['ripple', 'XRP', 'XRP', 0.523, -0.72, 29000000000],
  ['dogecoin', 'DOGE', 'Dogecoin', 0.124, 3.02, 18100000000],
  ['cardano', 'ADA', 'Cardano', 0.453, -1.32, 16300000000],
  ['avalanche-2', 'AVAX', 'Avalanche', 32.84, 2.01, 13000000000],
  ['tether', 'USDT', 'Tether', 1, 0.01, 110000000000]
].map(([id, symbol, name, price, change24h, marketCap], index) => ({
  id: String(id), symbol: String(symbol), name: String(name), price: Number(price), change24h: Number(change24h), marketCap: Number(marketCap), rank: index + 1,
  sparkline: Array.from({ length: 42 }, (_, point) => Number(price) * (0.92 + point * 0.002 + Math.sin(point * 1.3 + index) * 0.015))
}));
export const OFFLINE_COINS: MarketCoin[] = DEMO_COINS.map(coin => ({ ...coin, price: null, change24h: null, marketCap: null, rank: null, sparkline: [] }));
export const EMPTY_VAULT: VaultView = { wallets: [], walletScans: [], manualHoldings: [], watchlist: [], settings: { currency: 'usd', hasApiKey: false } };
export const DEMO_VAULT: VaultView = {
  ...EMPTY_VAULT,
  watchlist: ['bitcoin','ethereum','solana'],
  manualHoldings: [
    { id: 'sample-btc', coinId: 'bitcoin', quantity: '0.38' },
    { id: 'sample-eth', coinId: 'ethereum', quantity: '3.1' },
    { id: 'sample-sol', coinId: 'solana', quantity: '27' },
    { id: 'sample-usdc', coinId: 'usd-coin', quantity: '3231.16' }
  ]
};
