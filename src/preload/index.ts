import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../shared/types';
const api: DesktopApi = {
  openSource: url => ipcRenderer.invoke('artwork:open-source', url),
  command: command => ipcRenderer.invoke('vault:command', command),
  backup: () => ipcRenderer.invoke('vault:backup'),
  onLocked: callback => { const listener = () => callback(); ipcRenderer.on('vault:locked', listener); return () => ipcRenderer.removeListener('vault:locked', listener); }
};
contextBridge.exposeInMainWorld('cryptoPrices', api);
