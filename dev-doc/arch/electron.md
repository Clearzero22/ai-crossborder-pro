# Electron Architecture

## Process Model

```
┌──────────────────────────────────────────┐
│  Main Process (main.ts, 228 lines)        │
│  - BrowserWindow management               │
│  - IPC handlers (8 handlers)             │
│  - Auto-updater                           │
│  - Backend lifecycle                      │
├──────────────────────────────────────────┤
│  Backend Process (api-server.js, forked)  │
│  - Hono HTTP server on port 3456         │
│  - Playwright browser automation          │
│  - AI provider calls                      │
│  - Static file serving (production)       │
├──────────────────────────────────────────┤
│  Renderer Process (BrowserWindow)         │
│  - React SPA                              │
│  - preload.ts (contextBridge)             │
│  - 14 exposed APIs                        │
└──────────────────────────────────────────┘
```

## Startup Sequence

### Development Mode
```
npm run dev
  → concurrently:
    1. Vite dev server (port 5173)
    2. Backend (tsx api-server.ts, port 3456)
    3. Electron (build TS → electron .)
       → createWindow()
       → mainWindow.loadURL('http://localhost:5173')
       → openDevTools({ mode: 'detach' })
```

### Production Mode
```
App Launch
  → app.whenReady()
  → onReady()
    → findAvailablePort(3456)           // Find free port
    → resolvePath('backend-dist')        // ASAR-external resources
    → loadEnvVarsFromFile({userData}/.env)
    → startBackend(backendDistDir, env)  // fork(api-server.js)
    → waitForReady(port, 30000)          // Poll /api/health every 500ms
    → createWindow()
    → mainWindow.loadURL(`http://localhost:{port}`)
    → initAutoUpdater(mainWindow)
```

## IPC Handlers (Main Process)

| Channel | Method | Description |
|---------|--------|-------------|
| `get-user-data-path` | invoke | Returns `app.getPath('userData')` |
| `get-env-status` | invoke | Returns env file status and configured keys |
| `get-chrome-path` | invoke | Returns platform-specific Chrome path |
| `skip-version` | invoke | Skips a specific update version |
| `download-update` | invoke | Triggers update download |
| `install-update` | invoke | Triggers update installation |
| `check-for-updates` | invoke | Checks for available updates |
| `get-current-version` | invoke | Returns `app.getVersion()` |

## Preload APIs (Renderer)

| API | Type | Description |
|-----|------|-------------|
| `getPlatform()` | sync | Returns `process.platform` |
| `getUserDataPath()` | async invoke | User data directory |
| `getChromePath()` | async invoke | Chrome executable path |
| `openExternal(url)` | sync | Opens URL in system browser |
| `onBackendReady(cb)` | event | Backend ready notification |
| `onUpdateAvailable(cb)` | event | New version available |
| `onUpdateDownloadProgress(cb)` | event | Download progress |
| `onUpdateDownloaded(cb)` | event | Download complete |
| `onUpdateNotAvailable(cb)` | event | No updates available |
| `downloadUpdate()` | async invoke | Download update |
| `installUpdate()` | async invoke | Install update |
| `skipVersion(v)` | async invoke | Skip version |
| `checkForUpdates()` | async invoke | Check for updates |
| `getCurrentVersion()` | async invoke | Current version |

### Dead APIs

| API | Issue |
|-----|-------|
| `onBackendReady` | Main process never sends `backend-ready` event |
| `getChromePath` | Works but renderer cannot access `get-chrome-path` from main (no handler mismatch — actually the handler exists, this is functional) |

## Backend Process Management

```typescript
// backend-launcher.ts
startBackend(backendDistDir, env, nodeRuntime?)
  → fork(api-server.js, [], { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })

waitForReady(port, timeout = 30000)
  → Poll http://localhost:{port}/api/health every 500ms
  → Return on HTTP 200

stopBackend()
  → backendProcess.kill('SIGTERM')
  → After 5s: backendProcess.kill('SIGKILL')

findAvailablePort(startPort)
  → Try startPort, startPort+1, ... until available
```

## Auto-Updater

```typescript
// updater.ts — electron-updater
autoDownload = false        // User must manually trigger
autoInstallOnAppQuit = true // Install on quit
forceDevUpdateConfig = true // ⚠️ Active in production!
publish: {
  provider: 'github',
  owner: 'Clearzero22',
  repo: 'ai-crossborder-pro'
}
```

### Update Flow
```
checkForUpdates() → GitHub Releases API
  → update-available → UI notification
  → downloadUpdate() → Progress events → update-downloaded
  → installUpdate() → Quit and install (or install on next quit)
  → skipVersion(v) → Persisted in {userData}/update-config.json
```

## Packaging

### electron-builder.yml

```
App ID: com.crossborder.pro
Output: release19/

Inside ASAR:
  dist-electron/**/*   (Electron main + preload)
  package.json

Outside ASAR (extraResources):
  backend-dist/        (compiled backend JS)
  frontend-dist/       (compiled React SPA)
  backend_dist_node_modules/  (backend dependencies)
  node-runtime/node.exe       (Windows: separate Node runtime)
```

### Platform Outputs

| Platform | Format | Artifact Name |
|----------|--------|---------------|
| Windows | NSIS installer | `AI-CrossBorder-Pro-{ver}-win-{arch}-setup.exe` |
| macOS | DMG | `AI-CrossBorder-Pro-{ver}-mac-{arch}.dmg` |
| Linux | AppImage + DEB | `AI-CrossBorder-Pro-{ver}-linux-{arch}` |

### Critical Issue: extraResources Not Updated

`electron-updater` only updates the ASAR package. The `frontend-dist/`, `backend-dist/`, and `backend_dist_node_modules/` directories are **outside ASAR** and are **never updated** by the standard update mechanism.

This means only Electron major version bumps work via auto-update. Frontend/backend code changes require a full reinstall.

## Security

- `contextIsolation: true` — Renderer cannot access Node APIs directly
- `nodeIntegration: false` — No Node.js in renderer
- `preload.ts` uses `contextBridge.exposeInMainWorld` — Safe API exposure
- `setWindowOpenHandler` forces external URLs through `shell.openExternal`
- **Risk:** `forceDevUpdateConfig: true` in production
