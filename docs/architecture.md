# CryptoPrices, from first principles

The 2018 project established the idea. Its screens, Firebase identity model, hidden data window, and build chain do not define the new product.

The product answers four questions: what assets are tracked, what they are worth based on available observations, where those observations came from, and how old or incomplete they are. It never signs transactions, accepts wallet secrets, or treats unavailable balances as zero.

## Boundaries

```text
Vue renderer (sandboxed, local assets, no network or Node)
       │ typed commands through a narrow preload bridge
Electron main (sender validation, native lifecycle, backup dialog)
       │ bounded requests, session generation fences
Storage / provider worker
       ├─ SQLite: public market cache and encrypted personal documents
       ├─ scrypt + AES-GCM: passphrase unlock and random per-profile keys
       └─ HTTPS adapters: CoinGecko, Blockstream, selected chain RPC
```

SQLite and password derivation run outside both the renderer and Electron main loop. The renderer cannot issue SQL, filesystem operations, shell commands, arbitrary IPC, or arbitrary HTTP requests. Remote provider content is parsed as data; images and executable HTML are never loaded from it.

## Decisions

- **Electron 44 + Vue 3.** Consistent Chromium rendering, mature desktop lifecycle, and a small TypeScript application surface. Tauri has an installer-size advantage, but adopting Rust and differing system webviews would add a second implementation language and a larger rendering test matrix. This is a reasoned tradeoff, not a claim that Electron uses less memory.
- **Node 24 built-in SQLite.** No native addon rebuilding per desktop platform. Its release-candidate stability means the pinned Electron runtime is part of the tested storage contract. Synchronous DB operations stay in the worker.
- **Encrypted documents in SQLite.** The unit of ownership is a local profile. Its entire portfolio document is encrypted with a random key; a passphrase-derived key wraps that key. Profile names and public market caches remain plaintext. This is not whole-file SQLCipher encryption.
- **No background address requests.** Adding a wallet is offline. Refreshing names the provider and requires consent. Market requests do not contain wallet addresses. There is no telemetry, login service, analytics, remote font, or embedded shared API key.
- **Coverage is data.** A scan records completion, contract counts, warnings, and observation time. Top-1,000 price coverage does not mean every blockchain, DeFi protocol, NFT, or staked balance can be discovered.
- **Exact asset quantities.** Base-unit balances use bigint and decimal strings. Floating point is confined to estimated fiat display. No trading, execution, tax, or cost-basis claims.
- **Offline is a normal state.** Registration, unlock, portfolio edits, and reading cached observations work without a network. Missing prices stay unknown. Sample values belong only to a visibly separate demo.

## Concurrency

Locking advances a generation before any asynchronous result can be applied. A network result must still belong to the same unlocked generation; edits made while it was pending are re-read before commit. A removed wallet cannot be resurrected by an old result. Main-process response fencing also prevents an already-computed private response crossing a lock boundary. Lock requests bypass the normal work queue's capacity. The service also aborts in-flight provider requests on lock or profile switch, and cancels a wallet scan when its address is removed.

## Performance targets, not promises

Bound DOM work through market pagination, downsample real sparkline observations, animate opacity/transforms, respect reduced motion, avoid perpetual polling, and keep expensive work in the worker. Record actual packaged launch/renderer size/idle CPU/memory on the tested machine before making performance claims. The app is optimized for responsiveness; no blanket “ultra performant” claim substitutes for measurement.

## Current compatibility choices

Dependency versions were checked against npm and official documentation on 2026-09-23. Vite 7.3.6 is the supported major for electron-vite 5; Vite 8 is newer but outside that peer contract. TypeScript 6.0.3 is used because current vue-tsc 3.3.11 cannot load TypeScript 7's removed `typescript/lib/tsc` entry. The lockfile pins the working combination. GitLab CI checks Windows and Linux; its hosted macOS job is opt-in for eligible plans. The retained GitHub Actions workflow also covers all three platforms. Configuration is distinct from a successful remote run.

Primary sources: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Electron performance](https://www.electronjs.org/docs/latest/tutorial/performance), [Node 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [electron-vite](https://electron-vite.org/guide/), [Vue](https://vuejs.org/guide/introduction.html), [Tauri architecture](https://v2.tauri.app/start/).
