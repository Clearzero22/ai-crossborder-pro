# Deployment Guide

## Build Pipeline

### Full Build

```bash
npm run build
```

Sequential: frontend → backend → electron.

| Step | Command | Output |
|------|---------|--------|
| 1. Frontend | `npm run build` (frontend) | `packages/electron/frontend-dist/` |
| 2. Backend | `npm run build` (backend) | `packages/electron/backend-dist/` |
| 3. Electron | `npm run build` (electron) | `packages/electron/dist-electron/` |

### Backend Build Details

The backend uses esbuild to bundle into `backend-dist/api-server.js`:

```bash
cd packages/backend
npm run build  # scripts/build.mjs
```

This bundles all TypeScript + node_modules into a single file (or uses the custom build script with separate bundling).

### Electron Build Details

```bash
cd packages/electron
npm run build  # build:electron + scripts/build.mjs
```

The `scripts/build.mjs` script:
1. Runs `npm run build` in frontend package
2. Runs `npm run build` in backend package
3. Copies frontend dist to `electron/frontend-dist/`
4. Copies backend dist to `electron/backend-dist/`
5. Copies backend node_modules to `electron/backend_dist_node_modules/`

## Platform Packaging

```bash
# Windows (NSIS installer)
npm run build:win

# macOS (DMG)
npm run build:mac

# Linux (AppImage + DEB)
npm run build:linux
```

### Build Artifacts

| Platform | Format | Location | Name Pattern |
|----------|--------|----------|-------------|
| Windows | NSIS | `release19/` | `AI-CrossBorder-Pro-{ver}-win-x64-setup.exe` |
| macOS | DMG | `release19/` | `AI-CrossBorder-Pro-{ver}-mac-arm64.dmg` |
| Linux | AppImage | `release19/` | `AI-CrossBorder-Pro-{ver}-linux-amd64.AppImage` |
| Linux | DEB | `release19/` | `ai-crossborder-pro_{ver}_amd64.deb` |

## App Structure (Installed)

```
Install Dir/
├── resources/
│   ├── app.asar                    # Electron main + preload
│   ├── backend-dist/               # Compiled backend (outside ASAR)
│   │   └── api-server.js
│   ├── frontend-dist/              # Compiled React SPA (outside ASAR)
│   │   ├── index.html
│   │   └── assets/
│   ├── backend_node_modules/       # Backend dependencies (outside ASAR)
│   └── node-runtime/
│       └── node.exe                # Windows: separate Node runtime
└── AI-CrossBorder-Pro.exe          # Electron launcher
```

## Auto-Update

### Current Mechanism

Uses `electron-updater` with GitHub Releases:

```
app.checkForUpdates()
  → GitHub Releases API (Clearzero22/ai-crossborder-pro)
  → Compare versions
  → Download new ASAR
  → Install on quit
```

### Limitations

**Only the ASAR package is updated.** These directories are outside ASAR and NOT updated:
- `frontend-dist/` (React app)
- `backend-dist/` (API server)
- `backend_node_modules/` (dependencies)

This means **only Electron major version bumps** work via auto-update. Code changes to frontend or backend require a full reinstall.

### Publish to GitHub Releases

```bash
npm run publish:win     # Build + publish Windows
npm run publish:mac     # Build + publish macOS
npm run publish:linux   # Build + publish Linux
```

Requires `GH_TOKEN` environment variable with repo write permissions.

## User Data Directory

Installed app stores user data in OS-specific location:

| Platform | Path |
|----------|------|
| Windows | `C:\Users\{user}\AppData\Roaming\ai-crossborder-pro\` |
| macOS | `~/Library/Application Support/ai-crossborder-pro/` |
| Linux | `~/.config/ai-crossborder-pro/` |

Contents:
```
{userData}/
├── data/
│   └── crawler.db              # SQLite database
├── chrome-profile/             # Browser automation data
│   └── automation/
├── .env                        # User-configured API keys
├── .ai-crossborder-machine-id  # Machine-specific encryption key
└── update-config.json          # Update preferences (skipped versions)
```

## Clean Build

```bash
npm run clean
```

Removes all dist/ and release/ artifacts from all packages.

## Pre-build Script

Windows and Linux have a pre-build clean script:
```bash
node scripts/pre-build-clean.mjs
```

Ensures clean state before packaging.
