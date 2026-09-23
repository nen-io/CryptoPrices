import { base58, bech32, bech32m } from '@scure/base';
import { getAddress, isAddress, sha256 } from 'viem';
import type { ChainId } from '../shared/types';

import { CHAINS, type Chain } from '../shared/chains';
export { CHAINS, type Chain } from '../shared/chains';

export function chainFor(id: ChainId): Chain {
  const chain = CHAINS.find((entry) => entry.id === id);
  if (!chain) throw new Error('Unsupported network.');
  return chain;
}

/** Validates locally. Never resolves names, calls a provider, or accepts wallet secrets. */
export function validateAddress(chainId: ChainId, input: string): string {
  const chain = chainFor(chainId);
  if (typeof input !== 'string' || input.length > 100) throw new Error('Enter a public wallet address.');
  const address = input.trim();
  if (chain.evmChainId !== undefined) {
    if (!isAddress(address, { strict: true })) throw new Error('Invalid EVM address or address checksum.');
    return getAddress(address);
  }
  if (chainId === 'solana') {
    try {
      if (base58.decode(address).length === 32) return address;
    } catch { /* Present a stable validation error without echoing the input. */ }
    throw new Error('Enter a valid Solana public address.');
  }
  try {
    if (/^bc1/i.test(address)) {
      let decoded;
      let encoding: 'bech32' | 'bech32m';
      try { decoded = bech32.decode(address as `${string}1${string}`, 90); encoding = 'bech32'; }
      catch { decoded = bech32m.decode(address as `${string}1${string}`, 90); encoding = 'bech32m'; }
      const version = decoded.words[0];
      const program = bech32.fromWords(decoded.words.slice(1));
      if (decoded.prefix !== 'bc' || version === undefined || version > 16 || program.length < 2 || program.length > 40) throw new Error();
      if (version === 0 && (encoding !== 'bech32' || ![20, 32].includes(program.length))) throw new Error();
      if (version > 0 && encoding !== 'bech32m') throw new Error();
      return address.toLowerCase();
    }
    const decoded = base58.decode(address);
    if (decoded.length !== 25 || ![0, 5].includes(decoded[0]!)) throw new Error();
    const checksum = sha256(sha256(decoded.slice(0, 21), 'bytes'), 'bytes');
    if (!decoded.slice(21).every((value, index) => value === checksum[index])) throw new Error();
    return address;
  } catch {
    throw new Error('Enter a valid Bitcoin mainnet address with a correct checksum.');
  }
}
