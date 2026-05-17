import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { startBackend, stopBackend, waitForReady } from './backend-launcher';

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

  startBackend(backendDistDir, {
    PORT: String(port),
    CHROME_DATA_DIR: chromeDataDir,
    DATA_DIR: dataDir,
    FRONTEND_DIR: frontendDistDir,
    NODE_PATH: nodeModulesDir,
    NODE_ENV: 'production',
  });

  try {
    await waitForReady(port, 30000);
    console.log('[Main] Backend ready');
  } catch (err) {
    console.error('[Main] Backend failed to start:', err);
    createWindow();
    return;
  }

  process.env.BACKEND_PORT = String(port);
  createWindow();
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
