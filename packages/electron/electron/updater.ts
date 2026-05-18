import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  speed: number;
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
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.forceDevUpdateConfig = true;

  if (!app.isPackaged) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Clearzero22',
      repo: 'ai-crossborder-pro',
      token: process.env.GH_TOKEN,
    });
  }

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

  autoUpdater.on('download-progress', (progress) => {
    const progressInfo: DownloadProgress = {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      speed: progress.bytesPerSecond,
    };
    mainWindow.webContents.send('update-download-progress', progressInfo);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdate] Update downloaded: ${info.version}`);
    mainWindow.webContents.send('update-downloaded', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] App is up to date');
    mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdate] Error:', err == null ? 'unknown' : (err as Error).message ?? err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdate] Failed to check for updates:', (err as Error).message);
  });
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[AutoUpdate] Download failed:', (err as Error).message);
  });
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdate] Manual check failed:', (err as Error).message);
  });
}

export function skipVersion(version: string): void {
  const config = loadConfig();
  config.skippedVersion = version;
  saveConfig(config);
}
