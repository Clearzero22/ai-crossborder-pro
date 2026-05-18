/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

interface ElectronAPI {
  getPlatform: () => string;
  getUserDataPath: () => Promise<string>;
  getChromePath: () => Promise<string>;
  openExternal: (url: string) => void;
  onBackendReady: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  skipVersion: (version: string) => Promise<void>;
  getCurrentVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
