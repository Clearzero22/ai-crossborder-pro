# Electron Build Pipeline Refactor

## Problem

The current `scripts/build.mjs` has multiple issues:
- Path resolution errors (wrong `..` count for monorepo structure)
- Only copies `packages/backend/node_modules/`, missing npm workspaces hoisted deps (root cause of white screen)
- `--ignore-scripts` prevents `better-sqlite3` native addon compilation
- `package-lock.json` never copied to temp install dir (non-deterministic)
- Backend build errors silently ignored (`ignoreError=true`)
- Frontend and backend are each built twice (once by root `npm run build`, once by `build.mjs`)

## Design

### Architecture Decision

The backend runs as an independent process via `fork()` with `NODE_PATH` pointing to `backend_node_modules` (from `extraResources`). electron-builder cannot auto-collect deps for forked processes, so a dependency installation step is still required.

**Approach: Keep `build.mjs` but reduce it to two responsibilities only:**
1. Copy build artifacts (frontend-dist, backend-dist)
2. Install backend production dependencies with native addon support

Remove all redundant builds from `build.mjs`.

### File Changes

#### 1. `packages/electron/scripts/build.mjs` — Simplified

```
Steps:
  1. Copy packages/frontend/dist  → packages/electron/frontend-dist
  2. Copy packages/backend/dist   → packages/electron/backend-dist
  3. In temp dir: copy backend package.json + root package-lock.json
  4. Run: npm install --omit=dev (NO --ignore-scripts, for native addons)
  5. Copy installed node_modules → backend-dist/node_modules
  6. Copy installed node_modules → backend_dist_node_modules (for extraResources)
  7. Cleanup temp dir
```

Key fixes:
- Copy `package-lock.json` to temp dir for deterministic installs
- Remove `--ignore-scripts` so `better-sqlite3` native addon compiles
- Remove redundant `npm run build` calls for frontend/backend
- Use `path.resolve()` for all paths
- Use `powershell.exe` as shell on Windows
- Exit on error (no `ignoreError` on backend build — it's not built here anymore)

#### 2. `package.json` (root) — Deduplicate builds

```json
{
  "scripts": {
    "build": "npm run build -w packages/frontend && npm run build -w packages/backend && npm run build:electron",
    "build:electron": "npm run build -w packages/electron",
    "build:win": "npm run build && npm run build:deps && npx electron-builder --win --x64 --project packages/electron",
    "build:deps": "node packages/electron/scripts/build.mjs"
  }
}
```

The `build:electron` script in electron's package.json becomes just `npx tsc -p tsconfig.json && node scripts/build.mjs`.

No more double-building: root `build` compiles all TS, then `build:deps` copies artifacts and installs deps, then electron-builder packages.

#### 3. `packages/electron/package.json` — Simplify scripts

```json
{
  "scripts": {
    "build": "npm run build:electron && node scripts/build.mjs",
    "build:electron": "npx tsc -p tsconfig.json"
  }
}
```

Unchanged structurally — the `build` script still chains TS compilation + artifact copy. This is called by root `npm run build`.

#### 4. `packages/electron/electron-builder.yml` — No changes needed

The `extraResources` and `asarUnpack` config remains the same. electron-builder will continue to copy `backend-dist`, `frontend-dist`, and `backend_dist_node_modules` to `resources/`.

#### 5. `packages/electron/electron/main.ts` — No changes needed

`resolvePath()` and `NODE_PATH` logic already correctly points to `process.resourcesPath/backend-dist` and `process.resourcesPath/backend_node_modules`.

### What Gets Deleted

- The `frontendDistDir` and `backendDistDir` copy steps stay (needed for electron-builder `files` and `extraResources`)
- The redundant `npm run build` calls for frontend/backend in build.mjs are removed
- `ignoreError=true` on backend build is removed (backend isn't built here)

### Build Flow (After Refactor)

```
npm run build:win
  │
  ├─ npm run build
  │     ├─ npm run build -w frontend  (tsc + vite build)
  │     ├─ npm run build -w backend   (tsc)
  │     └─ npm run build -w electron  (tsc + build.mjs)
  │                                     ├─ Copy frontend/dist → frontend-dist
  │                                     ├─ Copy backend/dist → backend-dist
  │                                     └─ npm install --omit=dev (with lockfile, with scripts)
  │
  └─ electron-builder --win --x64
        ├─ files: dist-electron/*, frontend-dist/*, backend-dist/*, package.json
        ├─ extraResources: backend-dist, frontend-dist, backend_dist_node_modules
        ├─ asarUnpack: playwright binaries
        └─ NSIS installer
```

### Risk Assessment

- `npm install` without `--ignore-scripts` may run Playwright browser download scripts. Mitigation: set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the install environment.
- Native addon (`better-sqlite3`) compilation requires build tools (node-gyp, Python, C++ compiler). These should be available in the CI/dev environment. The root `postinstall` already runs `electron-builder install-app-deps` which handles this.
- `package-lock.json` may have workspace references that don't resolve in the temp dir. Mitigation: the lockfile at root level has flat dependency entries that `npm install` can read without workspace context.

### Not In Scope

- App icons (separate task)
- Auto-update (electron-updater)
- macOS notarization / hardenedRuntime
- ARM64 builds
- Backend process crash restart logic
- Removing `electron-is-dev` dead dependency
