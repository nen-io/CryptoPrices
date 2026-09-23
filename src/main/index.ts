import { app, BrowserWindow, ipcMain, protocol, net, session, dialog, powerMonitor, Menu, shell } from 'electron';
import { Worker } from 'node:worker_threads';
import { resolve, join, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isArtworkSource } from './artwork-links';
import type { CommandResult } from '../shared/types';

const directory = dirname(fileURLToPath(import.meta.url));
protocol.registerSchemesAsPrivileged([{ scheme: 'cryptoprices', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
if (process.env.CRYPTOPRICES_DATA_DIR) app.setPath('userData', resolve(process.env.CRYPTOPRICES_DATA_DIR));
let worker: Worker;
let workerAvailable = false;
let window: BrowserWindow | null = null;
let sequence = 0;
let sessionEpoch = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();
function ask(payload: object, priority = false): Promise<any> {
  if (!workerAvailable) return Promise.reject(new Error('Storage is unavailable. Restart CryptoPrices.'));
  if (!priority && pending.size >= 32) return Promise.reject(new Error('Too many pending operations.'));
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ id, ...payload }); });
}
function trusted(event: Electron.IpcMainInvokeEvent): boolean {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return false;
  const url = event.senderFrame.url;
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) return new URL(url).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin;
  return url === 'cryptoprices://app/index.html';
}
async function lock(): Promise<CommandResult> {
  // Clear the visible document immediately, before any response to older requests.
  sessionEpoch++;
  window?.webContents.send('vault:locked');
  try { return await ask({ command: { type: 'lock' } }, true); }
  catch { void worker?.terminate(); return { ok: false, error: 'Storage is unavailable. Restart CryptoPrices.' }; }
}
function createWindow(): void {
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 800, minHeight: 620, show: false, title: 'CryptoPrices', backgroundColor: '#f4f3ef', titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 22, y: 22 }, webPreferences: { preload: join(directory, '../preload/index.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, spellcheck: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.once('ready-to-show', () => window?.show());
  window.on('closed', () => { window = null; void lock(); });
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadURL('cryptoprices://app/index.html');
}
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else void app.whenReady().then(() => {
  const renderer = resolve(directory, '../renderer');
  protocol.handle('cryptoprices', request => {
    const url = new URL(request.url);
    if (url.host !== 'app' || request.method !== 'GET') return new Response('Forbidden', { status: 403 });
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Invalid path', { status: 400 }); }
    const path = resolve(renderer, '.' + pathname);
    if (!path.startsWith(renderer + sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(path).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  worker = new Worker(join(directory, 'worker.js'), { workerData: { databasePath: join(app.getPath('userData'), 'cryptoprices.sqlite') } });
  workerAvailable = true;
  worker.on('message', ({ id, result }) => { pending.get(id)?.resolve(result); pending.delete(id); });
  const storageStopped = () => { workerAvailable = false; sessionEpoch++; for (const promise of pending.values()) promise.reject(new Error('Storage worker stopped. Restart CryptoPrices.')); pending.clear(); window?.webContents.send('vault:locked'); };
  worker.on('error', storageStopped);
  worker.on('exit', storageStopped);
  ipcMain.handle('vault:command', async (event, command): Promise<CommandResult> => {
    if (!trusted(event)) return { ok: false, error: 'Untrusted request.' };
    try {
      if (!command || JSON.stringify(command).length > 8192) return { ok: false, error: 'Invalid request.' };
      if (command.type === 'lock') return await lock();
      let epoch = sessionEpoch;
      if (command.type === 'register' || command.type === 'unlock') {
        epoch = ++sessionEpoch;
        await ask({ command: { type: 'lock' } }, true);
        if (epoch !== sessionEpoch) return { ok: false, error: 'The vault session changed. Please try again.' };
      }
      const result = await ask({ command });
      if (epoch !== sessionEpoch) return { ok: false, error: 'The vault session changed. Please try again.' };
      return result;
    } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Storage unavailable.' }; }
  });
  ipcMain.handle('artwork:open-source', async (event, url: unknown) => {
    if (!trusted(event) || !isArtworkSource(url)) return { ok: false, error: 'This source link is not allowed.' };
    try { await shell.openExternal(url); return { ok: true }; }
    catch { return { ok: false, error: 'Could not open the museum source.' }; }
  });
  ipcMain.handle('vault:backup', async event => {
    if (!trusted(event)) return { ok: false, error: 'Untrusted request.' };
    const result = await dialog.showSaveDialog(window!, { title: 'Export encrypted vault backup', defaultPath: 'cryptoprices-backup.sqlite', filters: [{ name: 'Encrypted CryptoPrices database', extensions: ['sqlite'] }] });
    if (result.canceled || !result.filePath) return { ok: false };
    try { return await ask({ backupPath: result.filePath }); } catch { return { ok: false, error: 'Could not export the backup.' }; }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { label: 'Vault', submenu: [{ label: 'Lock vault', accelerator: 'CmdOrCtrl+Shift+L', click: () => { void lock(); } }] }, { role: 'windowMenu' }]));
  powerMonitor.on('suspend', () => { void lock(); });
  powerMonitor.on('lock-screen', () => { void lock(); });
  const timer = setInterval(() => { if (powerMonitor.getSystemIdleTime() >= 300) void lock(); }, 15000); timer.unref();
  createWindow();
  app.on('activate', () => { if (!window) createWindow(); });
  app.on('second-instance', () => { window?.show(); window?.focus(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { void worker?.terminate(); });
