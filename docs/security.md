# Local vault security

CryptoPrices is a watch-only portfolio tracker. A local profile belongs to this installation; it is not a cloud account. Registration and unlocking require no network. There is no remote password reset, email account, custody, wallet signing, or transaction submission.

## What is protected

Each profile has an independently generated 256-bit vault key. Its complete personal document—wallet addresses and labels, holdings, wallet balance observations, watchlist and provider API key—is encrypted using AES-256-GCM before SQLite receives it. Each write generates a fresh 96-bit nonce and a 128-bit authentication tag. Authentication binds the envelope version, profile ID and purpose, so encrypted data cannot be moved between profiles or between a wrapped key and document.

The passphrase derives a wrapping key using scrypt with a random 128-bit salt, `N=131072`, `r=8`, `p=1`, a 32-byte result and a 256 MiB allocation ceiling. This follows [OWASP's scrypt baseline](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The random vault key is encrypted with the wrapping key. Neither key nor the passphrase is stored in plaintext. Decryption and authentication of both envelopes must succeed before a session is installed.

This is encrypted-record storage, **not whole-database encryption**. Local profile names, IDs, creation times, schema, ciphertext sizes and public market data remain visible. Files use owner-only permissions on Unix. Backups contain the same encrypted records and visible metadata. SQLite itself is not presented as an encryption system.

## Authentication and locking

Names are trimmed, case-insensitively unique, and limited to 3–32 ASCII letters, numbers, spaces, dots, underscores and hyphens. Passphrases must contain at least 12 JavaScript string characters and at most 1,024 UTF-8 bytes. They are not trimmed or normalized. The database supports at most twenty profiles; a personal document is limited to 5 MiB.

Only one key derivation is accepted at a time. Five failed unlocks trigger a thirty-second in-process cooldown, which is not cleared by locking or creating a profile. This slows interactive guessing; it is not protection against a person who can copy or alter the application/database. Such an attacker faces the scrypt cost and the strength of the passphrase. Restarting the process resets the interactive cooldown.

Starting registration or unlock locks the previous session. Locking increments a session generation and overwrites the retained key buffer. A derivation that completes after lock or shutdown cannot install a session or create a profile. Code performing asynchronous network work must also capture the generation and check it before applying results. The desktop command layer must never return the provider API key to the renderer; it exposes only whether a key is configured.

Decrypted key buffers and temporary plaintext buffers are overwritten where possible. JavaScript strings, garbage collection, operating-system swap, crash dumps, and compromised processes prevent a guarantee that every copy is erased from memory. Protection of a stolen database is distinct from protection of an already unlocked application. This application does not claim resistance to malware, debuggers, administrators, or a compromised operating system.

## Desktop and network boundary

`Vault` is a privileged internal service instantiated by the database worker. Synchronous SQLite operations and the asynchronous scrypt derivation run away from the renderer and Electron's main event loop. The renderer must receive only explicit commands and sanitized views, with sandboxing, context isolation and a restrictive content security policy. Follow [Electron's security checklist](https://www.electronjs.org/docs/latest/tutorial/security); do not expose raw SQL, filesystem, shell, arbitrary IPC or arbitrary network requests.

Public addresses do not authorize spending, but associating an address with a user is private information. Adding an address can be completely offline. A refresh sends the address to the configured blockchain provider, which may associate it with the caller's IP address. The user-facing refresh flow must identify that disclosure and the supported chain/asset coverage. Cached observations need their original observation time and must not become “live” merely because the app starts. Balance precision is preserved as decimal strings, never JavaScript floating-point coin quantities.

Only public data belongs in `public_cache`. Its generic methods are internal to the worker and must not receive wallet addresses, holdings, labels or credentials. Watch-only inputs and provider responses are validated by the command/provider services; the storage layer bounds and encrypts the resulting document. Secrets and full command payloads must not enter logs or crash reports.

Museum links are the only external browser action. The main process accepts exact source and rights URLs from the bundled artwork catalogue, only from the trusted main frame. It rejects arbitrary URLs and protocols; renderer navigation and new windows remain disabled. Artwork and fonts load locally.

## Backups, recovery and migrations

The backup operation uses SQLite `VACUUM INTO` with a bound destination to produce a consistent file containing committed WAL changes. It creates a new owner-readable file and refuses to overwrite an existing path. Copying only the live main database file is unsafe while WAL transactions are present. Keep a tested backup and its passphrase; a forgotten passphrase has no reset or bypass. Recovery is restoring an intact backup and unlocking it with its original passphrase.

Schema versions are explicit. Unknown versions fail rather than recreating or discarding data. Future migrations must preserve recoverability and be tested against copies of existing vaults. The current whole-document update is one atomic SQLite statement with full synchronous durability.

## Verification

The real-SQLite tests cover offline registration, restart persistence, exact decimal amounts, normalized name uniqueness, profile isolation, wrong passphrases, authenticated tamper detection, ciphertext bound to a profile, fresh write nonces, lock/shutdown races, derivation concurrency, interactive throttling, payload limits, parameterized SQL and consistent backup restoration. They scan the database, WAL and backup files for test private values. These checks establish the implemented boundaries; they are not an independent cryptographic audit or a guarantee about future integration changes.

The built-in [`node:sqlite` API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) is currently documented as a release candidate and is synchronous. Packaged Electron builds must test availability and behavior against their actual bundled Node runtime. Runtime upgrades require repeating backup/restore and packaged-app smoke tests.
