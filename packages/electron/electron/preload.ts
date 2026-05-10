import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: (): string => process.platform,

  getUserDataPath: (): Promise<string> =>
    ipcRenderer.invoke('get-user-data-path'),

  getChromePath: (): Promise<string> =>
    ipcRenderer.invoke('get-chrome-path'),

  openExternal: (url: string): void => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
  },

  onBackendReady: (callback: () => void): (() => void) => {
    const handler = (): void => callback();
    ipcRenderer.on('backend-ready', handler);
    return () => ipcRenderer.removeListener('backend-ready', handler);
  },
});
