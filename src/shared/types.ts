export type ChainId = 'bitcoin' | 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon' | 'bsc' | 'avalanche' | 'solana';
export interface MarketCoin { id: string; symbol: string; name: string; price: number | null; change24h: number | null; marketCap: number | null; rank: number | null; sparkline: number[] }
export interface MarketSnapshot { coins: MarketCoin[]; fetchedAt: string; requestedCount: number; pagesFetched: number; complete: boolean; warnings: string[] }
export interface TokenContract { coinId: string; symbol: string; name: string; chain: ChainId; address: string }
export interface Wallet { id: string; name: string; chain: ChainId; address: string; createdAt: string }
export interface TokenBalance { coinId: string | null; symbol: string; quantity: string; contract?: string }
export interface WalletScan { walletId: string; balances: TokenBalance[]; fetchedAt: string; complete: boolean; scannedContracts: number; totalContracts: number; warnings: string[] }
export interface ManualHolding { id: string; coinId: string; quantity: string }
export interface VaultDocument { wallets: Wallet[]; manualHoldings: ManualHolding[]; walletScans: WalletScan[]; watchlist: string[]; settings: { currency: 'usd'; coingeckoKey?: string } }
export interface Profile { id: string; username: string }
export interface VaultView extends Omit<VaultDocument, 'settings'> { settings: { currency: 'usd'; hasApiKey: boolean } }
export interface AppState { profiles: Profile[]; profile: Profile | null; vault: VaultView | null; markets: MarketSnapshot | null; catalogueCount: number }
export type Command =
  | { type: 'state' } | { type: 'register'; username: string; password: string }
  | { type: 'unlock'; username: string; password: string } | { type: 'lock' }
  | { type: 'wallet:add'; name: string; chain: ChainId; address: string }
  | { type: 'wallet:remove'; id: string } | { type: 'wallet:refresh'; id: string; consent: true }
  | { type: 'holding:add'; coinId: string; quantity: string } | { type: 'holding:remove'; id: string }
  | { type: 'watchlist:toggle'; coinId: string }
  | { type: 'markets:refresh' } | { type: 'settings:key'; key: string };
export type CommandResult = { ok: true; state: AppState } | { ok: false; error: string };
export interface DesktopApi { openSource(url: string): Promise<{ ok: boolean; error?: string }>; command(command: Command): Promise<CommandResult>; onLocked(callback: () => void): () => void; backup(): Promise<{ ok: boolean; error?: string }> }
