# Verification — 23 September 2026

The Collector is implemented in the desktop app. This report separates source,
runtime and package evidence from remote CI and public distribution.

## Executed locally

A fresh local clone of implementation commit
`af1e8bb9a7118cd5b4ddeef0d8af08cbab009ea8` passed `npm ci`, `npm run check`
and the complete Electron UI smoke. It required no untracked files or copied
node_modules. Subsequent publication edits update CI artifact handling and
documentation without changing application behavior.

- `npm run check`: artwork validation, Vue/TypeScript checks, 96 tests in eight
  files, and the production build pass.
- `npm run test:e2e`: the real Electron 44.4.5 runtime passes user-facing offline
  registration, empty-vault separation, exact manual quantities, invalid/valid
  public addresses, provider-consent gating, settings, lock, full restart,
  wrong-passphrase rejection and restored data after unlock.
- Runtime: Chromium 152.0.7977.130, Node 24.21.0, SQLite 3.53.4. The host toolchain
  uses Node 24.19.0; its runtime is distinct from Electron's bundled Node.
- All 60 local artwork images decode offline. Gallery next/previous, era selection,
  keyboard range, complete index, provenance dialogs, 25-second rotation, system
  reduced motion and the app's motion preference pass. No renderer HTTP requests
  or JavaScript exceptions were observed.
- Desktop 1440×960 and narrow 390×844 views have no horizontal page overflow.
  Dialog Escape/focus restoration, a 200% zoom-equivalent viewport, and separate
  doubled text were also checked. Long tables scroll within their containers.
- `npm audit --audit-level=high`: no reported vulnerabilities, including tooling.
- `npm run package:dir`: macOS arm64 app generated with an explicit ad-hoc
  signature. `codesign --verify --deep --strict` passes. All 66 files under `out/`
  match their packaged ASAR contents byte-for-byte.
- The actual hardened packaged app launches from a disposable data directory;
  the local gallery renders and its Next control changes the displayed artwork.
- macOS DMG and ZIP were built from the verified app. They are local review
  artifacts, not notarized public releases. `hdiutil verify` confirms the DMG
  checksum.

The packaged fuses disable RunAsNode, Node environment options, CLI inspection and
file-protocol extra privileges; they enable cookie encryption, ASAR integrity and
ASAR-only loading. The renderer is sandboxed and isolated without Node globals.
Museum links accept only exact reviewed URLs from the main application frame.

The test harness disables OS-idle detection only inside its disposable process:
CDP input does not reset macOS idle time. Manual locking and a lock-screen event
are exercised separately; the normal application retains its five-minute idle
lock. Chromium is offline during the UI test. No provider scan is submitted by
that test; request cancellation, permission and provider parsing have separate
unit coverage. Live provider observations from 17 September remain dated in
[provider notes](providers.md), not presented as a new comprehensive network probe.

## Observed performance

One local automated run measured 966 ms to the rendered fresh-install UI and first
artwork, and 472 ms on restart. A three-second idle sample measured about 0.55%
summed process CPU and 434.7 MiB summed working set. Shared pages are counted more
than once and Playwright is attached. These are diagnostics, not representative
cold-cache or packaged benchmarks, and no universal low-memory/FPS claim follows.
The clean-clone smoke separately took 5.50 seconds on its first tool launch,
including Electron binary bootstrap, and 530 ms on restart. Its idle sample was
0.22% summed CPU and 426.6 MiB working set under the same measurement caveats.

The renderer is approximately 385 kB JavaScript and 50 kB CSS before compression.
The 60 offline images total 10.76 MB; normal playback loads only current/next images.
The macOS arm64 bundle is approximately 369 MiB including Electron. UI work is
bounded through market pagination, sampled charts, an isolated storage/provider
worker, cancelled requests on lock, and a pausing single-timeout gallery scheduler.

## Regression scope

Real SQLite tests cover encrypted disk contents, authenticated tampering, wrong
credentials, profile isolation, passphrase derivation races, exact quantities,
backups and restoration. Main/service/renderer tests cover pending operations and
lock, saturated queues, dead workers, profile switches, removed wallets, stale
private responses, malformed IPC, demo isolation and exact external-link policy.
Provider tests cover checksummed addresses, bounded parsing, response limits,
partial results, unlisted Solana mints and Polygon native-balance deduplication.
Gallery tests cover scheduler cleanup, reduced motion, visibility and interaction.

## Publication and distribution boundaries

GitHub Actions checks and packages macOS, Windows and Linux, with native Electron
UI smoke on macOS. The optional GitLab configuration remains available for mirrors;
its hosted Mac runners cannot run native UI interaction tests. YAML syntax was
checked locally. No remote pipeline success is claimed before a push
and an actual completed run. Windows/Linux installation and native interaction
still require their platforms.

Developer ID signing, notarization and public installer trust remain distribution
work. The ad-hoc local app runs and passes bundle-integrity checks, but its signature
does not establish a verified publisher for downloaded installations.

The disposable studies are preserved separately on `design/collector-study`.
The publishing destination is the original
[nen-io/CryptoPrices repository](https://github.com/nen-io/CryptoPrices).
