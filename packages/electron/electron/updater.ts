import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';

const store = new ElectronStore<{ skippedVersion: string | null }>({
  defaults: { skippedVersion: null },
});

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    const updateInfo: UpdateInfo = {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : JSON.stringify(info.releaseNotes),
      releaseDate: info.releaseDate ?? new Date().toISOString(),
    };

    const skipped = store.get('skippedVersion');
    if (skipped === updateInfo.version) {
      console.log(`[AutoUpdate] Version ${updateInfo.version} is skipped by user`);
      return;
    }

    console.log(`[AutoUpdate] Update available: ${updateInfo.version}`);
    mainWindow.webContents.send('update-available', updateInfo);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] App is up to date');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdate] Error:', err == null ? 'unknown' : (err as Error).message ?? err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdate] Failed to check for updates:', (err as Error).message);
  });
}

export function skipVersion(version: string): void {
  store.set('skippedVersion', version);
}
