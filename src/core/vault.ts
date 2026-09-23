import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scrypt } from 'node:crypto';
import { chmodSync, closeSync, mkdirSync, openSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Profile, VaultDocument } from '../shared/types.js';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_PROFILES = 20;
const SCHEMA_VERSION = 1;
const ENVELOPE_VERSION = 1;
const ENVELOPE_OVERHEAD = 1 + 12 + 16;
const AUTH_ERROR = 'Could not unlock this profile. Check your passphrase or restore an intact backup.';

interface ProfileRow {
  id: string;
  username: string;
  salt: Uint8Array;
  wrapped_key: Uint8Array;
  document: Uint8Array;
  kdf_version: number;
}

function credentials(username: string, password: string): { username: string; normalized: string } {
  if (typeof username !== 'string' || typeof password !== 'string') throw new Error('Enter a username and passphrase.');
  const display = username.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,31}$/.test(display)) {
    throw new Error('Use a username of 3–32 letters, numbers, spaces, dots, underscores or hyphens.');
  }
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (password.length < 12 || passwordBytes > 1024) throw new Error('Use a passphrase of at least 12 characters and no more than 1,024 bytes.');
  return { username: display, normalized: display.toLowerCase() };
}

function deriveKey(password: string, salt: Uint8Array): Promise<Buffer> {
  return new Promise((resolveKey, reject) => {
    scrypt(password, salt, 32, { N: 131_072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) reject(new Error('Passphrase protection could not be initialized.'));
      else resolveKey(key);
    });
  });
}

function context(profileId: string, purpose: 'key' | 'document'): Buffer {
  return Buffer.from(`cryptoprices:vault:${ENVELOPE_VERSION}:${profileId}:${purpose}`, 'utf8');
}

function seal(plaintext: Uint8Array, key: Buffer, profileId: string, purpose: 'key' | 'document'): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(context(profileId, purpose));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from([ENVELOPE_VERSION]), nonce, cipher.getAuthTag(), ciphertext]);
}

function unseal(envelope: Uint8Array, key: Buffer, profileId: string, purpose: 'key' | 'document'): Buffer {
  const bytes = Buffer.from(envelope);
  const maximum = (purpose === 'key' ? 32 : MAX_DOCUMENT_BYTES) + ENVELOPE_OVERHEAD;
  if (bytes[0] !== ENVELOPE_VERSION || bytes.length < ENVELOPE_OVERHEAD || bytes.length > maximum) throw new Error(AUTH_ERROR);
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(1, 13), { authTagLength: 16 });
  decipher.setAAD(context(profileId, purpose));
  decipher.setAuthTag(bytes.subarray(13, 29));
  return Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]);
}

function isDocument(value: unknown): value is VaultDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Partial<VaultDocument>;
  return Array.isArray(document.wallets) && Array.isArray(document.manualHoldings)
    && Array.isArray(document.walletScans) && Array.isArray(document.watchlist)
    && typeof document.settings === 'object' && document.settings !== null
    && document.settings.currency === 'usd'
    && (document.settings.coingeckoKey === undefined || typeof document.settings.coingeckoKey === 'string');
}

function serializeDocument(value: VaultDocument): Buffer {
  if (!isDocument(value)) throw new Error('Invalid vault document.');
  let json: string;
  try { json = JSON.stringify(value); } catch { throw new Error('Invalid vault document.'); }
  if (Buffer.byteLength(json, 'utf8') > MAX_DOCUMENT_BYTES) throw new Error('The local vault is limited to 5 MiB.');
  return Buffer.from(json, 'utf8');
}

function decodeDocument(envelope: Uint8Array, key: Buffer, id: string): VaultDocument {
  const plaintext = unseal(envelope, key, id, 'document');
  try {
    const document: unknown = JSON.parse(plaintext.toString('utf8'));
    if (!isDocument(document)) throw new Error('Invalid vault document.');
    return document;
  } finally { plaintext.fill(0); }
}

function emptyDocument(): VaultDocument {
  return { wallets: [], manualHoldings: [], walletScans: [], watchlist: [], settings: { currency: 'usd' } };
}

/** Privileged persistence service. Instantiate only in the desktop database worker. */
export class Vault {
  readonly #database: DatabaseSync;
  readonly #path: string;
  #profile: Profile | null = null;
  #key: Buffer | null = null;
  #generation = 0;
  #closed = false;
  #authPending = false;
  #failedAttempts = 0;
  #blockedUntil = 0;

  constructor(path: string) {
    this.#path = path === ':memory:' ? path : resolve(path);
    if (this.#path !== ':memory:') mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(this.#path, { timeout: 5_000, enableForeignKeyConstraints: true, allowExtension: false });
    try {
      if (this.#path !== ':memory:') chmodSync(this.#path, 0o600);
      this.#database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA trusted_schema = OFF;');
      const version = Number(this.#database.prepare('PRAGMA user_version').get()?.user_version);
      if (version !== 0 && version !== SCHEMA_VERSION) throw new Error('This vault requires a newer version of CryptoPrices.');
      if (version === 0) {
        this.#database.exec(`
          BEGIN IMMEDIATE;
          CREATE TABLE profiles (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            username_key TEXT NOT NULL UNIQUE,
            salt BLOB NOT NULL CHECK(length(salt) = 16),
            kdf_version INTEGER NOT NULL CHECK(kdf_version = 1),
            wrapped_key BLOB NOT NULL CHECK(length(wrapped_key) = 61),
            document BLOB NOT NULL,
            created_at TEXT NOT NULL
          ) STRICT;
          CREATE TRIGGER profile_limit BEFORE INSERT ON profiles
          WHEN (SELECT count(*) FROM profiles) >= 20
          BEGIN SELECT RAISE(ABORT, 'This device supports up to 20 local profiles.'); END;
          CREATE TABLE public_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
          PRAGMA user_version = 1;
          COMMIT;
        `);
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  get generation(): number { return this.#generation; }

  #ensureOpen(): void {
    if (this.#closed) throw new Error('The local vault is closed.');
  }

  #ensureUnlocked(): { profile: Profile; key: Buffer } {
    this.#ensureOpen();
    if (!this.#profile || !this.#key) throw new Error('Unlock a local profile first.');
    return { profile: this.#profile, key: this.#key };
  }

  #beginAuthentication(): number {
    this.#ensureOpen();
    if (this.#authPending) throw new Error('A profile is already being unlocked. Please wait.');
    if (Date.now() < this.#blockedUntil) throw new Error('Too many unsuccessful attempts. Wait 30 seconds before trying again.');
    if (this.#blockedUntil) { this.#blockedUntil = 0; this.#failedAttempts = 0; }
    this.lock();
    this.#authPending = true;
    return this.#generation;
  }

  #ensureGeneration(generation: number): void {
    if (this.#closed || this.#generation !== generation) throw new Error('The unlock was cancelled because the profile was locked.');
  }

  #recordFailure(): void {
    this.#failedAttempts += 1;
    if (this.#failedAttempts >= 5) this.#blockedUntil = Date.now() + 30_000;
  }

  listProfiles(): Profile[] {
    this.#ensureOpen();
    return this.#database.prepare('SELECT id, username FROM profiles ORDER BY created_at, id').all() as unknown as Profile[];
  }

  session(): Profile | null { return this.#profile ? { ...this.#profile } : null; }

  async register(username: string, password: string): Promise<Profile> {
    this.#ensureOpen();
    const input = credentials(username, password);
    if (this.listProfiles().length >= MAX_PROFILES) throw new Error('This device supports up to 20 local profiles.');
    if (this.#database.prepare('SELECT id FROM profiles WHERE username_key = ?').get(input.normalized)) throw new Error('That local username already exists.');
    const generation = this.#beginAuthentication();
    let wrappingKey: Buffer | undefined;
    let vaultKey: Buffer | undefined;
    try {
      const salt = randomBytes(16);
      wrappingKey = await deriveKey(password, salt);
      this.#ensureGeneration(generation);
      const profile: Profile = { id: randomUUID(), username: input.username };
      vaultKey = randomBytes(32);
      const plaintext = serializeDocument(emptyDocument());
      let encryptedDocument: Buffer;
      try { encryptedDocument = seal(plaintext, vaultKey, profile.id, 'document'); } finally { plaintext.fill(0); }
      this.#database.prepare(`INSERT INTO profiles
        (id, username, username_key, salt, kdf_version, wrapped_key, document, created_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)`).run(
        profile.id, profile.username, input.normalized, salt,
        seal(vaultKey, wrappingKey, profile.id, 'key'), encryptedDocument, new Date().toISOString(),
      );
      this.#profile = profile;
      this.#key = vaultKey;
      vaultKey = undefined;
      // Creating another profile must not reset a failed-login throttle.
      return { ...profile };
    } finally {
      wrappingKey?.fill(0);
      vaultKey?.fill(0);
      this.#authPending = false;
    }
  }

  async unlock(username: string, password: string): Promise<Profile> {
    this.#ensureOpen();
    const input = credentials(username, password);
    const generation = this.#beginAuthentication();
    let wrappingKey: Buffer | undefined;
    let vaultKey: Buffer | undefined;
    try {
      const row = this.#database.prepare('SELECT * FROM profiles WHERE username_key = ?').get(input.normalized) as unknown as ProfileRow | undefined;
      // Profile names are intentionally visible; unknown names still pay the same KDF cost.
      const validRow = row && row.kdf_version === 1 && row.salt.length === 16 && row.wrapped_key.length === 61;
      wrappingKey = await deriveKey(password, validRow ? row.salt : randomBytes(16));
      this.#ensureGeneration(generation);
      try {
        if (!validRow) throw new Error(AUTH_ERROR);
        vaultKey = unseal(row.wrapped_key, wrappingKey, row.id, 'key');
        if (vaultKey.length !== 32) throw new Error(AUTH_ERROR);
        // Do not report success for a corrupted/tampered personal document.
        decodeDocument(row.document, vaultKey, row.id);
      } catch {
        this.#recordFailure();
        throw new Error(AUTH_ERROR);
      }
      this.#profile = { id: row.id, username: row.username };
      this.#key = vaultKey;
      vaultKey = undefined;
      this.#failedAttempts = 0;
      this.#blockedUntil = 0;
      return { ...this.#profile };
    } finally {
      wrappingKey?.fill(0);
      vaultKey?.fill(0);
      this.#authPending = false;
    }
  }

  lock(): void {
    this.#generation += 1;
    this.#key?.fill(0);
    this.#key = null;
    this.#profile = null;
  }

  read(): VaultDocument {
    const { profile, key } = this.#ensureUnlocked();
    const row = this.#database.prepare('SELECT document FROM profiles WHERE id = ?').get(profile.id);
    try {
      if (!row) throw new Error('Missing profile.');
      return decodeDocument(row.document as Uint8Array, key, profile.id);
    } catch {
      this.lock();
      throw new Error('The local vault could not be read. Restore an intact backup.');
    }
  }

  write(document: VaultDocument): void {
    const { profile, key } = this.#ensureUnlocked();
    const plaintext = serializeDocument(document);
    try {
      const encrypted = seal(plaintext, key, profile.id, 'document');
      const result = this.#database.prepare('UPDATE profiles SET document = ? WHERE id = ?').run(encrypted, profile.id);
      if (result.changes !== 1) { this.lock(); throw new Error('The local profile no longer exists.'); }
    } finally { plaintext.fill(0); }
  }

  cacheRead<T>(key: string): T | null {
    this.#ensureOpen();
    const row = this.#database.prepare('SELECT value FROM public_cache WHERE key = ?').get(key);
    if (!row || typeof row.value !== 'string' || Buffer.byteLength(row.value, 'utf8') > MAX_CACHE_BYTES) return null;
    try { return JSON.parse(row.value) as T; } catch { return null; }
  }

  cacheWrite(key: string, value: unknown): void {
    this.#ensureOpen();
    if (typeof key !== 'string' || !key.length || Buffer.byteLength(key, 'utf8') > 256) throw new Error('Invalid public cache key.');
    let json: string | undefined;
    try { json = JSON.stringify(value); } catch { throw new Error('Invalid public cache data.'); }
    if (json === undefined || Buffer.byteLength(json, 'utf8') > MAX_CACHE_BYTES) throw new Error('Public cache entry is too large.');
    this.#database.prepare('INSERT INTO public_cache (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, json);
  }

  /** VACUUM INTO copies a consistent snapshot, including committed WAL changes. */
  backup(destination: string): void {
    this.#ensureOpen();
    const target = resolve(destination);
    if (target === this.#path) throw new Error('Choose a different path for the backup.');
    // Pre-create the empty output with restrictive permissions, never overwriting an existing file.
    const descriptor = openSync(target, 'wx', 0o600);
    closeSync(descriptor);
    try { this.#database.prepare('VACUUM INTO ?').run(target); }
    catch {
      unlinkSync(target);
      throw new Error('The backup could not be created.');
    }
  }

  close(): void {
    if (this.#closed) return;
    this.lock();
    this.#closed = true;
    this.#database.close();
  }
}
