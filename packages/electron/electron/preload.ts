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

  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string; releaseDate: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes: string; releaseDate: string }): void => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  skipVersion: (version: string): Promise<void> =>
    ipcRenderer.invoke('skip-version', version),

  getCurrentVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-current-version'),
});
