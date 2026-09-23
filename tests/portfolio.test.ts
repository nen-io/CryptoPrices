import { describe, expect, it } from 'vitest';
import { addQuantity, portfolio } from '../src/shared/portfolio';
describe('portfolio precision and unknown values', () => {
  it('adds quantities without floating point rounding', () => {
    expect(addQuantity('0.000000000000000001', '1.000000000000000009')).toBe('1.00000000000000001');
    expect(addQuantity('9.9', '0.1')).toBe('10');
    expect(addQuantity('100', '20')).toBe('120');
  });
  it('retains unknown prices and marks unscanned wallets incomplete', () => {
    const result = portfolio({ settings: { currency: 'usd', hasApiKey: false }, watchlist: [], manualHoldings: [{ id: 'h', coinId: 'bitcoin', quantity: '0.5' }], wallets: [{ id: 'w', chain: 'bitcoin', name: 'BTC', address: 'x', createdAt: '' }], walletScans: [] }, []);
    expect(result.unpriced).toBe(1); expect(result.incomplete).toBe(true); expect(result.rows[0]?.value).toBeNull();
  });
});
