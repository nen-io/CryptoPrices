import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vault } from '../src/core/vault';
import { Service } from '../src/core/service';
import type { MarketSnapshot, TokenContract, WalletScan } from '../src/shared/types';

const desktop = vi.hoisted(() => {
  type Listener = (...args: any[]) => any;
  class Emitter {
    listeners = new Map<string, Listener[]>();
    on(name: string, listener: Listener) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]); return this; }
    once(name: string, listener: Listener) { return this.on(name, listener); }
    emit(name: string, ...args: any[]) { for (const listener of this.listeners.get(name) ?? []) listener(...args); }
  }
  class WebContents extends Emitter {
    mainFrame = { url: 'cryptoprices://app/index.html' };
    send = vi.fn();
    setWindowOpenHandler = vi.fn();
  }
  class Window extends Emitter {
    static instances: Window[] = [];
    webContents = new WebContents();
    show = vi.fn();
    focus = vi.fn();
    loadURL = vi.fn(async () => {});
    constructor(_options: unknown) { super(); Window.instances.push(this); }
  }
  class Worker extends Emitter {
    static instances: Worker[] = [];
    postMessage = vi.fn();
    terminate = vi.fn(async () => 0);
    constructor(..._args: unknown[]) { super(); Worker.instances.push(this); }
  }
  const handlers = new Map<string, Listener>();
  const app = Object.assign(new Emitter(), {
    isPackaged: true,
    requestSingleInstanceLock: vi.fn(() => true),
    whenReady: vi.fn(async () => {}),
    setPath: vi.fn(),
    getPath: vi.fn(() => '/tmp/cryptoprices-security-review'),
    quit: vi.fn(),
  });
  const powerMonitor = Object.assign(new Emitter(), { getSystemIdleTime: vi.fn(() => 0) });
  const electron = {
    app, BrowserWindow: Window, powerMonitor,
    ipcMain: { handle: (name: string, handler: Listener) => handlers.set(name, handler) },
    protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() },
    net: { fetch: vi.fn() },
    session: { defaultSession: { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() } },
    dialog: { showSaveDialog: vi.fn(async () => ({ canceled: true })) },
    shell: { openExternal: vi.fn(async () => {}) },
    Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn(value => value) },
  };
  return { electron, app, powerMonitor, handlers, Window, Worker };
});

describe('service results belong to the exact active profile', () => {
  let vault: Vault;
  let service: Service;
  const passphrase = 'a long and unique test passphrase';
  const address = '0x0000000000000000000000000000000000000001';
  beforeEach(async () => {
    vault = new Vault(':memory:');
    await vault.register('Alice', passphrase);
    service = new Service(vault);
  });
  afterEach(() => vault.close());

  it.each(['register', 'unlock'])('clears the previous session even when %s credentials are invalid', async type => {
    await expect(service.command({ type, username: 'Alice', password: 'short' })).rejects.toThrow();
    expect(vault.session()).toBeNull();
    expect(service.state().vault).toBeNull();
  });

  it('cannot save an old profile scan into a newly registered profile', async () => {
    let finish!: (scan: WalletScan) => void;
    service = new Service(vault, { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn(() => new Promise<WalletScan>(resolve => { finish = resolve; })) } as any);
    await service.command({ type: 'wallet:add', name: 'Private Alice wallet', chain: 'ethereum', address });
    const walletId = vault.read().wallets[0]!.id;
    const refresh = service.command({ type: 'wallet:refresh', id: walletId, consent: true });
    await vault.register('Bob', passphrase);
    finish({ walletId, fetchedAt: '2026-09-17T00:00:00Z', balances: [{ coinId: 'ethereum', symbol: 'ETH', quantity: '99' }], complete: true, scannedContracts: 0, totalContracts: 0, warnings: [] });
    await expect(refresh).rejects.toThrow('locked');
    expect(vault.session()?.username).toBe('Bob');
    expect(vault.read().walletScans).toEqual([]);
    expect(vault.read().wallets).toEqual([]);
    await vault.unlock('Alice', passphrase);
    expect(vault.read().walletScans).toEqual([]);
  });

  it('does not resurrect a deleted wallet when its scan finishes', async () => {
    let finish!: (scan: WalletScan) => void;
    service = new Service(vault, { fetchMarkets: vi.fn(), fetchTokenCatalogue: vi.fn(), scanWallet: vi.fn(() => new Promise<WalletScan>(resolve => { finish = resolve; })) } as any);
    await service.command({ type: 'wallet:add', name: 'Private wallet', chain: 'ethereum', address });
    const walletId = vault.read().wallets[0]!.id;
    const refresh = service.command({ type: 'wallet:refresh', id: walletId, consent: true });
    await service.command({ type: 'wallet:remove', id: walletId });
    finish({ walletId, fetchedAt: '2026-09-17T00:00:00Z', balances: [], complete: true, scannedContracts: 0, totalContracts: 0, warnings: [] });
    await expect(refresh).rejects.toThrow('removed');
    expect(vault.read().wallets).toEqual([]);
    expect(vault.read().walletScans).toEqual([]);
  });

  it('does not commit either market cache after locking during catalogue retrieval', async () => {
    const prior: MarketSnapshot = { coins: [], fetchedAt: 'prior', requestedCount: 1000, pagesFetched: 4, complete: true, warnings: [] };
    vault.cacheWrite('markets', prior);
    vault.cacheWrite('catalogue', ['prior catalogue fixture']);
    let finish!: (catalogue: TokenContract[]) => void;
    service = new Service(vault, { fetchMarkets: vi.fn(async () => ({ ...prior, fetchedAt: 'new' })), fetchTokenCatalogue: vi.fn(() => new Promise<TokenContract[]>(resolve => { finish = resolve; })), scanWallet: vi.fn() } as any);
    const refresh = service.command({ type: 'markets:refresh' });
    await Promise.resolve();
    vault.lock();
    finish([]);
    await expect(refresh).rejects.toThrow('locked');
    expect(vault.cacheRead('markets')).toEqual(prior);
    expect(vault.cacheRead('catalogue')).toEqual(['prior catalogue fixture']);
  });
});

vi.mock('electron', () => desktop.electron);
vi.mock('node:worker_threads', () => ({ Worker: desktop.Worker }));

describe('desktop lock and IPC trust boundary', () => {
  let requests: Promise<any>[];
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    desktop.Worker.instances.length = 0;
    desktop.Window.instances.length = 0;
    desktop.handlers.clear();
    desktop.app.listeners.clear();
    desktop.powerMonitor.listeners.clear();
    requests = [];
    await import('../src/main/index');
    await vi.dynamicImportSettled();
  });
  afterEach(async () => {
    desktop.Worker.instances[0]?.emit('error', new Error('Test cleanup'));
    await Promise.allSettled(requests);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function command(input: unknown, event?: unknown): Promise<any> {
    const contents = desktop.Window.instances[0]!.webContents;
    const result = desktop.handlers.get('vault:command')!(event ?? { sender: contents, senderFrame: contents.mainFrame }, input);
    requests.push(result);
    return result;
  }

  it('rejects foreign senders and subframes without reaching the worker', async () => {
    const contents = desktop.Window.instances[0]!.webContents;
    const untrusted = await command({ type: 'state' }, { sender: {}, senderFrame: contents.mainFrame });
    const subframe = await command({ type: 'state' }, { sender: contents, senderFrame: { url: contents.mainFrame.url } });
    expect(untrusted.ok).toBe(false);
    expect(subframe.ok).toBe(false);
    expect(desktop.Worker.instances[0]!.postMessage).not.toHaveBeenCalled();
  });

  it('opens only reviewed museum URLs from the main application frame', async () => {
    const contents = desktop.Window.instances[0]!.webContents;
    const open = desktop.handlers.get('artwork:open-source')!;
    const event = { sender: contents, senderFrame: contents.mainFrame };
    const url = 'https://clevelandart.org/art/2000.203';
    desktop.electron.shell.openExternal.mockClear();
    expect((await open({ ...event, sender: {} }, url)).ok).toBe(false);
    expect((await open({ ...event, senderFrame: { url: contents.mainFrame.url } }, url)).ok).toBe(false);
    expect((await open(event, 'file:///etc/passwd')).ok).toBe(false);
    expect((await open(event, url + '?redirect=evil')).ok).toBe(false);
    expect(desktop.electron.shell.openExternal).not.toHaveBeenCalled();
    expect((await open(event, url)).ok).toBe(true);
    expect(desktop.electron.shell.openExternal).toHaveBeenCalledExactlyOnceWith(url);
  });

  it('delivers an OS lock even when all ordinary request slots are occupied', async () => {
    const worker = desktop.Worker.instances[0]!;
    for (let index = 0; index < 32; index += 1) void command({ type: 'state' });
    desktop.powerMonitor.emit('lock-screen');
    await Promise.resolve();
    expect(worker.postMessage.mock.calls.some(([message]) => message.command?.type === 'lock')).toBe(true);
    expect(desktop.Window.instances[0]!.webContents.send).toHaveBeenCalledWith('vault:locked');
  });

  it('does not return a private response that arrives after an OS lock', async () => {
    const worker = desktop.Worker.instances[0]!;
    const response = command({ type: 'state' });
    const requestId = worker.postMessage.mock.calls[0]![0].id;
    desktop.powerMonitor.emit('lock-screen');
    worker.emit('message', { id: requestId, result: { ok: true, state: { profile: { username: 'Private owner' }, vault: { secretFixture: 'old-private-state' } } } });
    const result = await response;
    expect(JSON.stringify(result)).not.toContain('old-private-state');
    expect(result.ok === false || result.state?.vault === null).toBe(true);
  });

  it('fences the lock command response across a later session transition', async () => {
    const worker = desktop.Worker.instances[0]!;
    const response = command({ type: 'lock' });
    const lockId = worker.postMessage.mock.calls[0]![0].id;
    worker.emit('message', { id: lockId, result: { ok: true, state: { profile: null, vault: null } } });
    await vi.advanceTimersByTimeAsync(0);
    const followup = worker.postMessage.mock.calls.find(([message]) => message.command?.type === 'state')?.[0];
    if (followup) {
      // A follow-up read can already have observed an intervening unlock when another OS lock arrives.
      desktop.powerMonitor.emit('lock-screen');
      worker.emit('message', { id: followup.id, result: { ok: true, state: { profile: { username: 'Private owner' }, vault: { secretFixture: 'new-private-state' } } } });
    }
    const result = await response;
    expect(JSON.stringify(result)).not.toContain('new-private-state');
    expect(result.ok === false || result.state?.vault === null).toBe(true);
  });

  it('does not forward credentials if the screen locks during authentication preparation', async () => {
    const worker = desktop.Worker.instances[0]!;
    const response = command({ type: 'unlock', username: 'Alice', password: 'a valid test passphrase' });
    const preparation = worker.postMessage.mock.calls[0]![0];
    expect(preparation.command.type).toBe('lock');
    desktop.powerMonitor.emit('lock-screen');
    worker.emit('message', { id: preparation.id, result: { ok: true, state: { profile: null, vault: null } } });
    await vi.advanceTimersByTimeAsync(0);
    const forwarded = worker.postMessage.mock.calls.find(([message]) => message.command?.type === 'unlock')?.[0];
    if (forwarded) worker.emit('message', { id: forwarded.id, result: { ok: false, error: 'Test cleanup' } });
    expect(forwarded).toBeUndefined();
    expect((await response).ok).toBe(false);
  });

  it.each(['error', 'exit'])('rejects requests promptly after worker %s', async event => {
    const worker = desktop.Worker.instances[0]!;
    worker.emit(event, event === 'error' ? new Error('Worker failure') : 1);
    const response = command({ type: 'state' });
    const timed = Promise.race([response, new Promise(resolve => setTimeout(() => resolve('unsettled'), 50))]);
    await vi.advanceTimersByTimeAsync(50);
    const result = await timed;
    expect(result).not.toBe('unsettled');
    expect(result.ok).toBe(false);
  });
});
