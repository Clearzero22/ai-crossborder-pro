# Incremental Update System

## Status: Planned

## Goal

Enable small code updates (~5-10MB) without requiring users to download and reinstall the full package (~200MB). Hot-update frontend pages and restart the backend process without app restart.

## Problem

`electron-updater` only updates the ASAR package. The `frontend-dist/`, `backend-dist/`, and `backend_node_modules/` directories are outside ASAR and are never updated. This means every code change requires a full reinstall.

## Solution

### Update Flow

```
1. Build update package
   build-update-zip.mjs
   → Packages frontend-dist/ + backend-dist/ into update-{version}.zip
   → Computes SHA-256 hash
   → Uploads to GitHub Releases as separate asset

2. Check for updates
   → On app start, check GitHub Releases for update-{version}.zip
   → Compare version > current version
   → Download zip to temp directory
   → Verify SHA-256 hash

3. Apply update
   → Backup current frontend-dist/ and backend-dist/
   → Extract zip to temp directory
   → Replace frontend-dist/ and backend-dist/
   → Restart backend child process
   → Refresh renderer (window.reload())
   → Delete backup on success

4. Rollback on failure
   → Restore backup directories
   → Restart backend
   → Show error notification
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `packages/electron/scripts/build-update-zip.mjs` | New | Build script to create update zip |
| `packages/electron/electron/incremental-updater.ts` | New | Download, verify, apply, rollback logic |
| `packages/electron/electron/main.ts` | Modify | Add IPC handlers for incremental update |
| `packages/electron/electron/preload.ts` | Modify | Expose incremental update APIs |
| `packages/electron/electron/updater.ts` | Modify | Integrate with existing auto-update |

### Estimated Effort: 14-18 hours

### Technical Details

- Update zip contains only: `frontend-dist/` + `backend-dist/` (~5-10MB)
- `backend_node_modules/` NOT included (API compatibility changes require full reinstall)
- SHA-256 hash verification prevents corrupted updates
- Atomic replacement: extract to temp → rename (atomic on most OS)
- Backend restart: `stopBackend()` → replace files → `startBackend()`
- Frontend refresh: `mainWindow.webContents.reload()` (no Electron restart needed)

## Related

- ADR: `dev-doc/adr/003-extraresources-layout.md`
- Architecture: `dev-doc/arch/electron.md`
- Roadmap: `dev-doc/features/roadmap.md`
