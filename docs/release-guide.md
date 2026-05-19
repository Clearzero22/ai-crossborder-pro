# Release Guide — AI CrossBorder Pro

## Prerequisites

- Node.js 20+ (must match bundled `node.exe` ABI)
- npm 10+
- Git
- Windows: Visual Studio Build Tools (for native modules like `better-sqlite3`)
- macOS: Xcode Command Line Tools

## 1. Version & Release Directory

Before building, update two places:

### `package.json` (root)
```json
"version": "1.1.0"
```

### `packages/electron/electron-builder.yml`
```yaml
directories:
  output: release17   # ← bump this for each build (e.g. release18)
```

### `scripts/pre-build-clean.mjs`
Update the `releaseDir` path to match:
```js
const releaseDir = path.join(__dirname, '..', 'packages', 'electron', 'release17');
```

All three must reference the same release directory name.

## 2. Build Steps

### Windows (x64 NSIS installer)

```bash
npm run build:win
```

Output: `packages/electron/release17/AI-CrossBorder-Pro-1.0.0-win-x64-setup.exe`

### macOS (DMG)

```bash
npm run build:mac
```

Output: `packages/electron/release17/AI-CrossBorder-Pro-1.0.0-mac-arm64.dmg`

### Linux (AppImage + DEB)

```bash
npm run build:linux
```

Output: `packages/electron/release17/AI-CrossBorder-Pro-1.0.0-linux-x64.AppImage`

## 3. What `build:win` Does (Full Pipeline)

```
npm run build:win
  ├── prebuild:win → scripts/pre-build-clean.mjs  (remove old release/)
  ├── npm run build
  │   ├── build frontend → packages/frontend/dist/     (Vite → static HTML/JS/CSS)
  │   ├── build backend → packages/backend/dist/       (esbuild → single api-server.js)
  │   └── build electron → packages/electron/build     (npm run build in electron pkg)
  │       ├── compile TypeScript → dist-electron/
  │       └── scripts/build.mjs
  │           ├── [1/4] copy frontend/dist → electron/frontend-dist/
  │           ├── [2/4] copy backend/dist → electron/backend-dist/
  │           ├── [3/4] npm install --omit=dev → electron/backend_dist_node_modules/
  │           └── [4/4] bundle node.exe → electron/node-runtime/
  └── electron-builder --win --x64
      └── packages → NSIS installer in release17/
```

## 4. Packaging Structure (Installed App)

```
app/
├── AI CrossBorder Pro.exe           # Electron main process
├── resources/
│   ├── app.asar                     # Electron code (main/preload)
│   ├── backend-dist/
│   │   └── api-server.js            # Backend entry (CJS bundle)
│   ├── backend_node_modules/        # Runtime dependencies (unpacked)
│   │   ├── playwright-core/
│   │   ├── better-sqlite3/
│   │   ├── hono/
│   │   └── ...
│   ├── frontend-dist/               # Static SPA files
│   │   └── index.html + assets/
│   └── node-runtime/
│       └── node.exe                 # Standalone Node.js for backend
```

Key design decisions:
- **Backend runs via bundled `node.exe`**, not Electron's Node. This ensures native modules (better-sqlite3) work with the correct ABI.
- **`module.paths` injection** — `api-server.js` banner adds `../backend_node_modules` to `module.paths` so `require('playwright-core')` resolves at runtime.
- **No `.env` bundled** — users configure API keys through the app UI. Settings stored in SQLite under `%APPDATA%/ai-crossborder-pro/`.

## 5. Publishing to GitHub Releases

### One-time setup
```bash
# Set GitHub token for electron-updater
export GH_TOKEN=<your-github-personal-access-token>
```

The token needs `repo` scope for uploading release assets.

### Publish
```bash
# Windows
npm run publish:win

# macOS
npm run publish:mac

# Linux
npm run publish:linux
```

This runs `electron-builder --publish always`, which:
1. Builds the installer
2. Creates a GitHub Release (or updates existing) on the repo
3. Uploads the installer as a release asset

The `electron-builder.yml` publish config:
```yaml
publish:
  provider: github
  owner: Clearzero22
  repo: ai-crossborder-pro
  releaseType: release
```

## 6. Auto-Update

The app includes `electron-updater`. To enable:

1. Ensure `publish` config in `electron-builder.yml` points to your GitHub repo
2. Build with `--publish always` to upload artifacts + generate `latest.yml`
3. In `main.ts`, call `autoUpdater.checkForUpdatesAndNotify()` on app start

Users will be notified of new versions automatically.

## 7. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Cannot find package 'playwright-core'` | `backend_node_modules` missing or empty | Verify `scripts/build.mjs` step 3 completes without error |
| Chrome `exitCode=21` | `channel: 'chrome'` uses debugging pipe, version mismatch | Use `executablePath` pointing to actual Chrome binary (already fixed in `browser-config.ts`) |
| HTTP 500 on `/api/settings/browser` | DB connection closed prematurely | Fixed with `ensureBrowserDb()` singleton |
| White screen on startup | Backend not ready, or frontend-dist missing | Check backend console logs; verify `frontend-dist/` was copied |
| `better-sqlite3` native load failure | ABI mismatch (Electron Node vs system Node) | Backend uses bundled `node.exe` from `node-runtime/` |
| Build fails at step 3 (npm install) | `package-lock.json` out of sync | Run `npm install` at repo root first |
| Release directory locked (EBUSY) | Previous installer still running or file explorer open | Close all processes using the directory, retry |

## 8. Checklist Before Release

- [ ] Update version in root `package.json`
- [ ] Update `directories.output` in `electron-builder.yml`
- [ ] Update `releaseDir` in `scripts/pre-build-clean.mjs`
- [ ] Run `npm install` at root to sync `package-lock.json`
- [ ] Test `npm run dev` — all services working
- [ ] Run `npm run build:win` (or target platform)
- [ ] Test the installer on a clean machine (no dev dependencies)
- [ ] Verify: browser settings page loads, GigaB2B crawl works, keyword scrape works
- [ ] Update `CHANGELOG.md` — add new version section with changes from git log
- [ ] Git tag the release: `git tag v1.x.x && git push origin v1.x.x`
- [ ] Publish: `npm run publish:win` (if distributing via GitHub Releases)
