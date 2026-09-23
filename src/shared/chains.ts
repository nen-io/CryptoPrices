import type { ChainId } from './types';

export interface Chain {
  id: ChainId;
  name: string;
  symbol: string;
  coinId: string;
  provider: string;
  platformId?: string;
  rpc?: string;
  evmChainId?: number;
}

export const CHAINS: readonly Chain[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', coinId: 'bitcoin', provider: 'Blockstream (blockstream.info)' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', coinId: 'ethereum', platformId: 'ethereum', evmChainId: 1, rpc: 'https://ethereum-rpc.publicnode.com', provider: 'PublicNode (ethereum-rpc.publicnode.com)' },
  { id: 'base', name: 'Base', symbol: 'ETH', coinId: 'ethereum', platformId: 'base', evmChainId: 8453, rpc: 'https://base-rpc.publicnode.com', provider: 'PublicNode (base-rpc.publicnode.com)' },
  { id: 'arbitrum', name: 'Arbitrum One', symbol: 'ETH', coinId: 'ethereum', platformId: 'arbitrum-one', evmChainId: 42161, rpc: 'https://arbitrum-one-rpc.publicnode.com', provider: 'PublicNode (arbitrum-one-rpc.publicnode.com)' },
  { id: 'optimism', name: 'OP Mainnet', symbol: 'ETH', coinId: 'ethereum', platformId: 'optimistic-ethereum', evmChainId: 10, rpc: 'https://optimism-rpc.publicnode.com', provider: 'PublicNode (optimism-rpc.publicnode.com)' },
  { id: 'polygon', name: 'Polygon PoS', symbol: 'POL', coinId: 'polygon-ecosystem-token', platformId: 'polygon-pos', evmChainId: 137, rpc: 'https://polygon-bor-rpc.publicnode.com', provider: 'PublicNode (polygon-bor-rpc.publicnode.com)' },
  { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BNB', coinId: 'binancecoin', platformId: 'binance-smart-chain', evmChainId: 56, rpc: 'https://bsc-rpc.publicnode.com', provider: 'PublicNode (bsc-rpc.publicnode.com)' },
  { id: 'avalanche', name: 'Avalanche C-Chain', symbol: 'AVAX', coinId: 'avalanche-2', platformId: 'avalanche', evmChainId: 43114, rpc: 'https://avalanche-c-chain-rpc.publicnode.com', provider: 'PublicNode (avalanche-c-chain-rpc.publicnode.com)' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', coinId: 'solana', platformId: 'solana', rpc: 'https://api.mainnet-beta.solana.com', provider: 'Solana public RPC (api.mainnet-beta.solana.com)' },
];
