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

  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number }): void => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }): void => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  onUpdateNotAvailable: (callback: () => void): (() => void) => {
    const handler = (): void => callback();
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },

  downloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke('download-update'),

  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('install-update'),

  skipVersion: (version: string): Promise<void> =>
    ipcRenderer.invoke('skip-version', version),

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke('check-for-updates'),

  getCurrentVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-current-version'),
});
