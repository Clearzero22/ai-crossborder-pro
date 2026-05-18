# Auto-Update Feature Design

**Date:** 2026-05-19
**Status:** Approved
**Branch:** `feat/auto-update`

## Summary

Add version checking and update notification to the Electron desktop app using `electron-updater` with GitHub Releases as the hosting provider. The app will check for updates on startup (non-blocking), notify users when a new version is available, and let them download from the GitHub Releases page. No automatic download or installation.

## Requirements

1. Check for updates on app startup (non-blocking, background)
2. Show an in-app notification bar when a new version is available
3. User can click to open the GitHub Releases page in the system browser
4. User can dismiss/ignore a specific version (persisted via electron-store)
5. Publishing: local manual publish via `electron-builder --publish always` with GitHub Releases

## Architecture

```
App Startup
    └── main.ts: app.whenReady()
          ├── Start backend (existing)
          ├── Health check (existing)
          ├── Create BrowserWindow (existing)
          └── initAutoUpdater(mainWindow) [NEW]
                │
                ├── autoUpdater.checkForUpdates()
                │     └── GitHub Releases: GET latest release + latest.yml
                │           └── Compare version → IPC to renderer
                │
                └── Renderer receives "update-available"
                      └── UpdateNotifier component shows notification bar
                            ├── [View Update] → shell.openExternal(releaseUrl)
                            └── [Skip Version] → persist to electron-store
```

## Approach

**electron-updater** (from electron-builder ecosystem) with `publish.provider: github`.

- Auto-generates `latest.yml` during build with version, file hashes, download URLs
- Built-in version comparison and blockmap (incremental update) support
- Future-proof: can extend to auto-download/install with minimal changes

## Component Design

### 1. `packages/electron/electron/updater.ts` (NEW)

Isolated module handling all update logic:

- `initAutoUpdater(window: BrowserWindow)` — configure and start update check
- `autoUpdater.autoDownload = false` — never auto-download
- `autoUpdater.autoInstallOnAppQuit = false` — never auto-install
- Events:
  - `update-available` → send `{ version, releaseNotes, releaseDate }` to renderer via IPC
  - `update-not-available` → silent, no action
  - `error` → silent, log to console only
- Skip-version filtering: read `electron-store` before checking, skip if current ignored version matches

### 2. `packages/electron/electron/main.ts` (MODIFY)

After `createWindow()`, call `initAutoUpdater(mainWindow)`.

### 3. `packages/electron/electron/preload.ts` (MODIFY)

Add to `electronAPI`:

```typescript
onUpdateAvailable: (callback: (info: UpdateInfo) => void) => (() => void)
skipVersion: (version: string) => void
getCurrentVersion: () => Promise<string>
```

### 4. `packages/frontend/src/vite-env.d.ts` (MODIFY)

Extend `ElectronAPI` interface with the new methods. Keep `electronAPI` optional for browser compatibility.

### 5. Frontend `UpdateNotifier` Component (NEW)

- Position: fixed bottom banner
- Only visible when `window.electronAPI` exists (Electron env)
- UI: update version info + two action buttons
- "View Update" → opens GitHub Releases in system browser
- "Skip Version" → calls `skipVersion()`, hides banner

### 6. `packages/electron/electron-builder.yml` (MODIFY)

Add publish configuration:

```yaml
publish:
  provider: github
  owner: Clearzero22
  repo: ai-crossborder-pro
```

### 7. `package.json` (MODIFY, root)

Add publish scripts:

```json
"publish:win": "npm run build:win -- --publish always",
"publish:mac": "npm run build:mac -- --publish always",
"publish:linux": "npm run build:linux -- --publish always"
```

## Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `electron-updater` | `packages/electron/package.json` (dependencies) | Version checking and update logic |
| `electron-store` | `packages/electron/package.json` (dependencies) | Persist user preference (skipped version) |

## IPC Channels

| Channel | Direction | Data | Purpose |
|---------|----------|------|---------|
| `update-available` | Main → Renderer | `{ version: string, releaseNotes: string, releaseDate: string }` | Notify new version available |
| `skip-version` | Renderer → Main | `{ version: string }` | User ignores a version |
| `get-current-version` | Renderer ↔ Main | `string` | Get current app version |

## Error Handling

- Update check failures are silent — no user-facing errors for network issues, rate limits, etc.
- Errors logged to console with `[AutoUpdate]` prefix for debugging
- If GitHub API rate limit is hit, retry silently on next app launch

## Publishing Workflow

1. Bump version in `packages/electron/package.json`
2. Set `GH_TOKEN` environment variable (GitHub Personal Access Token with `repo` scope)
3. Run `npm run publish:win` / `publish:mac` / `publish:linux`
4. electron-builder builds, generates `latest.yml`, and publishes to GitHub Releases

## Out of Scope

- Automatic download of update files
- Automatic installation / quit-and-restart
- Update progress bar
- Beta / channel-based updates (e.g., stable vs prerelease)
- Differential / delta updates (blockmap files will be generated but not used in this phase)
