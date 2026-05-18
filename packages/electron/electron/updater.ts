import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

const CONFIG_FILE = 'update-config.json';

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function loadConfig(): { skippedVersion: string | null } {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore parse errors, return defaults
  }
  return { skippedVersion: null };
}

function saveConfig(config: { skippedVersion: string | null }): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
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

    const config = loadConfig();
    if (config.skippedVersion === updateInfo.version) {
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
  const config = loadConfig();
  config.skippedVersion = version;
  saveConfig(config);
}
