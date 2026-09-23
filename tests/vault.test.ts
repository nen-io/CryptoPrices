import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vault } from '../src/core/vault.js';
import type { VaultDocument } from '../src/shared/types.js';

const PASSWORD = 'a sufficiently long private passphrase';
const ADDRESS = '0x52908400098527886E0F7030069857D2E4169EE7';
let directory: string;
let databasePath: string;
let vault: Vault;

function privateDocument(): VaultDocument {
  return {
    wallets: [{ id: 'wallet-1', name: 'Private household label', chain: 'ethereum', address: ADDRESS, createdAt: '2026-09-17T12:00:00Z' }],
    manualHoldings: [{ id: 'holding-1', coinId: 'ethereum', quantity: '12345678901234567890.123456789012345678' }],
    walletScans: [{ walletId: 'wallet-1', fetchedAt: '2026-09-17T12:00:00Z', complete: false, scannedContracts: 0, totalContracts: 1, warnings: ['Offline observation'], balances: [{ coinId: 'ethereum', symbol: 'ETH', quantity: '0.000000000000000001' }] }],
    watchlist: ['bitcoin', 'ethereum'],
    settings: { currency: 'usd', coingeckoKey: 'CG-private-api-key-unique-fixture' },
  };
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'cryptoprices-vault-test-'));
  databasePath = join(directory, 'vault.sqlite');
  vault = new Vault(databasePath);
});

afterEach(() => {
  vault.close();
  vi.restoreAllMocks();
  rmSync(directory, { force: true, recursive: true });
});

describe('encrypted local profiles', () => {
  it('registers offline, persists precise amounts, and requires unlock after restart', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));
    const profile = await vault.register('  Alice  ', PASSWORD);
    expect(profile.username).toBe('Alice');
    vault.write(privateDocument());
    expect(vault.read()).toEqual(privateDocument());
    vault.close();
    vault = new Vault(databasePath);
    expect(vault.session()).toBeNull();
    expect(vault.listProfiles()).toEqual([profile]);
    expect(() => vault.read()).toThrow('Unlock');
    await vault.unlock('aLiCe', PASSWORD);
    expect(vault.read()).toEqual(privateDocument());
    expect(network).not.toHaveBeenCalled();
  });

  it('keeps every private field out of SQLite, WAL, backups and journals', async () => {
    await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    const backupPath = join(directory, 'backup.sqlite');
    vault.backup(backupPath);
    for (const name of readdirSync(directory)) {
      const bytes = readFileSync(join(directory, name));
      for (const secret of [ADDRESS, PASSWORD, 'Private household label', 'CG-private-api-key-unique-fixture', '12345678901234567890.123456789012345678']) {
        expect(bytes.includes(Buffer.from(secret)), `${name} must not contain ${secret === PASSWORD ? 'the passphrase' : 'private data'}`).toBe(false);
      }
    }
    if (process.platform !== 'win32') {
      expect(statSync(databasePath).mode & 0o777).toBe(0o600);
      expect(statSync(backupPath).mode & 0o777).toBe(0o600);
    }
  });

  it('isolates profiles, normalizes duplicate usernames and returns detached state', async () => {
    const alice = await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    const session = vault.session()!;
    session.id = 'changed-outside';
    expect(vault.session()?.id).toBe(alice.id);
    const bob = await vault.register('Bob', 'another equally strong passphrase');
    expect(bob.id).not.toBe(alice.id);
    expect(vault.read().wallets).toEqual([]);
    await expect(vault.register('  ALICE  ', PASSWORD)).rejects.toThrow('already exists');
    await vault.unlock('Alice', PASSWORD);
    const detached = vault.read();
    detached.settings.coingeckoKey = 'external edit';
    expect(vault.read().settings.coingeckoKey).toBe('CG-private-api-key-unique-fixture');
    expect(vault.read().manualHoldings[0]?.quantity).toBe('12345678901234567890.123456789012345678');
  });

  it('rejects incorrect passphrases without retaining an authenticated session', async () => {
    await vault.register('Alice', PASSWORD);
    await expect(vault.unlock('Alice', 'not the correct passphrase')).rejects.toThrow('Could not unlock');
    expect(vault.session()).toBeNull();
    expect(() => vault.read()).toThrow('Unlock');
    expect(() => vault.write(privateDocument())).toThrow('Unlock');
    await vault.unlock('Alice', PASSWORD);
    expect(vault.session()?.username).toBe('Alice');
  });

  it.each(['document', 'wrapped_key'] as const)('fails closed after %s ciphertext tampering', async (column) => {
    await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    vault.close();
    const database = new DatabaseSync(databasePath);
    const row = database.prepare(`SELECT ${column} AS envelope FROM profiles`).get()!;
    const corrupted = Buffer.from(row.envelope as Uint8Array);
    corrupted[corrupted.length - 1] = corrupted[corrupted.length - 1]! ^ 1;
    database.prepare(`UPDATE profiles SET ${column} = ?`).run(corrupted);
    database.close();
    vault = new Vault(databasePath);
    await expect(vault.unlock('Alice', PASSWORD)).rejects.toThrow('Could not unlock');
    expect(vault.session()).toBeNull();
  });

  it('binds encrypted documents to the owning profile', async () => {
    await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    await vault.register('Bob', PASSWORD);
    vault.close();
    const database = new DatabaseSync(databasePath);
    database.prepare("UPDATE profiles SET document = (SELECT document FROM profiles WHERE username_key = 'alice') WHERE username_key = 'bob'").run();
    database.close();
    vault = new Vault(databasePath);
    await expect(vault.unlock('Bob', PASSWORD)).rejects.toThrow('Could not unlock');
    await vault.unlock('Alice', PASSWORD);
    expect(vault.read()).toEqual(privateDocument());
  });

  it('writes a new nonce for identical documents', async () => {
    await vault.register('Alice', PASSWORD);
    const inspector = new DatabaseSync(databasePath, { readOnly: true });
    vault.write(privateDocument());
    const before = Buffer.from(inspector.prepare('SELECT document FROM profiles').get()!.document as Uint8Array);
    vault.write(privateDocument());
    const after = Buffer.from(inspector.prepare('SELECT document FROM profiles').get()!.document as Uint8Array);
    inspector.close();
    expect(after.equals(before)).toBe(false);
  });
});

describe('authentication cancellation and limits', () => {
  it('does not create a profile after locking during registration', async () => {
    const registration = vault.register('Alice', PASSWORD);
    const rejection = expect(registration).rejects.toThrow('cancelled');
    vault.lock();
    await rejection;
    expect(vault.listProfiles()).toEqual([]);
    expect(vault.session()).toBeNull();
  });

  it('does not resurrect a session after locking during unlock', async () => {
    await vault.register('Alice', PASSWORD);
    const generation = vault.generation;
    const unlock = vault.unlock('Alice', PASSWORD);
    const rejection = expect(unlock).rejects.toThrow('cancelled');
    vault.lock();
    await rejection;
    expect(vault.generation).toBeGreaterThan(generation);
    expect(vault.session()).toBeNull();
    await vault.unlock('Alice', PASSWORD);
    expect(vault.session()?.username).toBe('Alice');
  });

  it('rejects simultaneous KDF requests and supports closing during a derivation', async () => {
    const registration = vault.register('Alice', PASSWORD);
    const rejection = expect(registration).rejects.toThrow('cancelled');
    await expect(vault.register('Bob', PASSWORD)).rejects.toThrow('already being unlocked');
    vault.close();
    await rejection;
    expect(vault.session()).toBeNull();
  });

  it('throttles five failed attempts, and lock does not clear the throttle', async () => {
    await vault.register('Alice', PASSWORD);
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    for (let count = 0; count < 5; count += 1) {
      await expect(vault.unlock('Alice', 'an incorrect test passphrase')).rejects.toThrow('Could not unlock');
    }
    vault.lock();
    await expect(vault.unlock('Alice', PASSWORD)).rejects.toThrow('Wait 30 seconds');
    await expect(vault.register('Bob', PASSWORD)).rejects.toThrow('Wait 30 seconds');
    clock.mockReturnValue(now + 30_001);
    await vault.unlock('Alice', PASSWORD);
    expect(vault.session()?.username).toBe('Alice');
  });

  it('bounds credentials and rejects oversized documents without losing prior state', async () => {
    await expect(vault.register('ab', PASSWORD)).rejects.toThrow('3–32');
    await expect(vault.register('Alice', 'short')).rejects.toThrow('at least 12');
    await expect(vault.register('Alice', 'x'.repeat(1025))).rejects.toThrow('1,024');
    await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    const oversized = privateDocument();
    oversized.watchlist = ['x'.repeat(5 * 1024 * 1024)];
    expect(() => vault.write(oversized)).toThrow('5 MiB');
    expect(vault.read()).toEqual(privateDocument());
  });

  it('limits the device to twenty profiles before invoking another derivation', async () => {
    await vault.register('Alice', PASSWORD);
    const database = new DatabaseSync(databasePath);
    const statement = database.prepare(`INSERT INTO profiles (id, username, username_key, salt, kdf_version, wrapped_key, document, created_at)
      SELECT ?, ?, ?, salt, kdf_version, wrapped_key, document, created_at FROM profiles WHERE username_key = 'alice'`);
    for (let index = 1; index < 20; index += 1) statement.run(`fixture-${index}`, `Fixture ${index}`, `fixture ${index}`);
    expect(() => statement.run('concurrent-extra', 'Concurrent extra', 'concurrent extra')).toThrow('20 local profiles');
    database.close();
    await expect(vault.register('Final profile', PASSWORD)).rejects.toThrow('20 local profiles');
  });
});

describe('public caches and consistent backups', () => {
  it('keeps public caches usable while locked and uses bound SQL parameters', () => {
    const key = "markets'; DROP TABLE profiles; --";
    vault.cacheWrite(key, { price: 123, source: 'public fixture' });
    expect(vault.cacheRead(key)).toEqual({ price: 123, source: 'public fixture' });
    vault.cacheWrite(key, { price: 456 });
    expect(vault.cacheRead(key)).toEqual({ price: 456 });
    expect(vault.cacheRead('missing')).toBeNull();
    expect(vault.listProfiles()).toEqual([]);
  });

  it('restores a backup including recent WAL commits without overwriting files', async () => {
    await vault.register('Alice', PASSWORD);
    vault.write(privateDocument());
    vault.cacheWrite('markets', { fetchedAt: '2026-09-17T00:00:00Z' });
    const backupPath = join(directory, "backup with 'quotes'.sqlite");
    vault.backup(backupPath);
    const restored = new Vault(backupPath);
    try {
      expect(restored.session()).toBeNull();
      await restored.unlock('Alice', PASSWORD);
      expect(restored.read()).toEqual(privateDocument());
      expect(restored.cacheRead('markets')).toEqual({ fetchedAt: '2026-09-17T00:00:00Z' });
    } finally { restored.close(); }
    const existing = join(directory, 'existing.txt');
    writeFileSync(existing, 'keep this file');
    expect(() => vault.backup(existing)).toThrow();
    expect(readFileSync(existing, 'utf8')).toBe('keep this file');
    expect(() => vault.backup(databasePath)).toThrow('different path');
  });
});
