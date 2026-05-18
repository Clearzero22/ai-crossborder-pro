import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { startBackend, stopBackend, waitForReady } from './backend-launcher';
import { initAutoUpdater, skipVersion } from './updater';

// API key names to forward from .env to the backend process
const API_KEY_ENV_VARS = [
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'CLAUDE_API_KEY',
  'CLAUDE_BASE_URL',
  'GEMINI_API_KEY',
  'GEMINI_BASE_URL',
];

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function resolvePath(...segments: string[]): string {
  if (isDev) {
    return path.join(__dirname, '..', ...segments);
  }
  return path.join(process.resourcesPath, ...segments);
}

function getChromeDataDir(): string {
  return path.join(app.getPath('userData'), 'chrome-profile');
}

function loadEnvVarsFromFile(envPath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return result;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (API_KEY_ENV_VARS.includes(key) && value) {
      result[key] = value;
    }
  }
  return result;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AI CrossBorder Pro',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const port = (process.env.BACKEND_PORT as string) || '3456';
    mainWindow.loadURL(`http://localhost:${port}`);
  }
}

async function onReady(): Promise<void> {
  if (isDev) {
    createWindow();
    if (mainWindow) {
      initAutoUpdater(mainWindow);
    }
    return;
  }

  const backendDistDir = resolvePath('backend-dist');
  const frontendDistDir = resolvePath('frontend-dist');
  const chromeDataDir = getChromeDataDir();
  const port = 3456;

  console.log(`[Main] resourcesPath: ${app.getAppPath()}`);
  console.log(`[Main] process.resourcesPath: ${process.resourcesPath}`);
  console.log(`[Main] Starting backend: ${backendDistDir}`);
  console.log(`[Main] Chrome data dir: ${chromeDataDir}`);
  console.log(`[Main] Frontend dir: ${frontendDistDir}`);
  console.log(`[Main] Frontend dir exists: ${fs.existsSync(frontendDistDir)}`);
  console.log(`[Main] index.html exists: ${fs.existsSync(path.join(frontendDistDir, 'index.html'))}`);

  const nodeModulesDir = resolvePath('backend_node_modules');

  const dataDir = getChromeDataDir(); // same userData base, used for output/runs etc.

  const envFromFile = loadEnvVarsFromFile(path.join(backendDistDir, '.env'));

  startBackend(backendDistDir, {
    PORT: String(port),
    CHROME_DATA_DIR: chromeDataDir,
    DATA_DIR: dataDir,
    FRONTEND_DIR: frontendDistDir,
    NODE_PATH: nodeModulesDir,
    NODE_ENV: 'production',
    ...envFromFile,
  });

  try {
    await waitForReady(port, 30000);
    console.log('[Main] Backend ready');
  } catch (err) {
    console.error('[Main] Backend failed to start:', err);
    createWindow();
    if (mainWindow) {
      initAutoUpdater(mainWindow);
    }
    return;
  }

  process.env.BACKEND_PORT = String(port);
  createWindow();
  if (mainWindow) {
    initAutoUpdater(mainWindow);
  }
}

// ── IPC handlers ──
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.handle('get-chrome-path', () => {
  const platform = os.platform();
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  return '/usr/bin/google-chrome';
});

ipcMain.handle('skip-version', (_event, version: string) => {
  skipVersion(version);
});

ipcMain.handle('get-current-version', () => app.getVersion());

app.whenReady().then(onReady);

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
