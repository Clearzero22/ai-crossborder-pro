# ADR-003: extraResources Layout (Code Outside ASAR)

## Status: Accepted (with known limitations)

## Context

Electron packages the application into an ASAR archive for performance and integrity. However, certain files must be placed outside the ASAR:

1. **Playwright native modules** — Binary files that must be accessible as regular files on disk
2. **Frontend static assets** — Served by the backend's static file handler
3. **Backend Node.js code** — Run as a forked child process
4. **Backend node_modules** — Required by the forked process

## Decision

Place `frontend-dist/`, `backend-dist/`, and `backend_node_modules/` in `extraResources` (outside ASAR). Also bundle a separate `node-runtime/node.exe` for Windows.

```yaml
# electron-builder.yml
extraResources:
  - from: backend-dist
    to: backend-dist
  - from: frontend-dist
    to: frontend-dist
  - from: backend_dist_node_modules
    to: backend_node_modules
  - from: node-runtime/node.exe
    to: node-runtime/node.exe
```

Inside ASAR (via `files` config):
```yaml
files:
  - dist-electron/**/*
  - package.json
```

## Reasons

1. **Playwright binary access:** Native modules (Chromium) cannot run from inside ASAR
2. **Child process execution:** `fork()` needs a real file path for `api-server.js`
3. **Static file serving:** Backend reads files from disk using `fs.readFileSync()`
4. **Node.js module resolution:** Forked process needs `node_modules/` on real filesystem

## Consequences

### Critical: Auto-Update Limitation

`electron-updater` only updates the ASAR package. The `extraResources` directories are **never updated** by the standard update mechanism.

This means:
- Electron version bumps work via auto-update (they're in ASAR)
- Frontend/backend code changes do NOT work via auto-update
- Users must download and reinstall for any code change

### Positive
- Playwright and native modules work correctly
- Backend can be forked as a separate process
- Static files served correctly by backend
- Separate Node.js runtime ensures ABI compatibility

### Negative
- Auto-update only works for Electron itself
- Larger update payloads (full reinstall needed for code changes)
- No incremental/hot update capability

### Future Improvement: Incremental Update

To fix the auto-update limitation:
1. Publish `update-{version}.zip` containing only `frontend-dist/` + `backend-dist/`
2. Download to temp directory
3. Verify hash
4. Replace `extraResources` directories
5. Restart backend process
6. Refresh frontend (no app restart needed)

See `dev-doc/features/active/incremental-update.md` for full design.
