# Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add version checking and update notification to the Electron app using electron-updater with GitHub Releases, showing an in-app notification bar that lets users manually download.

**Architecture:** `electron-updater` runs in the main process, checks GitHub Releases on startup (non-blocking), sends update info to the renderer via IPC. A frontend `UpdateNotifier` component displays a notification bar (following the existing `PlanAlert` pattern). Users can open the release page or skip a version (persisted via `electron-store`).

**Tech Stack:** electron-updater, electron-store, React + Tailwind CSS

---

### Task 1: Install dependencies

**Files:**
- Modify: `packages/electron/package.json`

- [ ] **Step 1: Install electron-updater and electron-store**

Run:
```bash
cd packages/electron && npm install electron-updater electron-store
```

Expected: two new entries in `dependencies` of `packages/electron/package.json`

- [ ] **Step 2: Verify installation**

Run: `ls packages/electron/node_modules/electron-updater && ls packages/electron/node_modules/electron-store`
Expected: both directories exist

- [ ] **Step 3: Commit**

```bash
git add packages/electron/package.json packages/electron/package-lock.json
git commit -m "chore: add electron-updater and electron-store dependencies"
```

---

### Task 2: Configure electron-builder publish provider

**Files:**
- Modify: `packages/electron/electron-builder.yml`

- [ ] **Step 1: Add publish block to electron-builder.yml**

Append this to the end of `packages/electron/electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: Clearzero22
  repo: ai-crossborder-pro
```

This tells electron-builder to generate `latest.yml` during build and publish artifacts to GitHub Releases when `--publish always` is passed.

- [ ] **Step 2: Commit**

```bash
git add packages/electron/electron-builder.yml
git commit -m "feat: configure GitHub Releases as publish provider for auto-update"
```

---

### Task 3: Add publish scripts to root package.json

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add publish scripts**

In root `package.json`, add these three scripts after the existing `build:linux` line:

```json
"publish:win": "npm run build:win -- --publish always",
"publish:mac": "npm run build:mac -- --publish always",
"publish:linux": "npm run build:linux -- --publish always"
```

Note: `--` is needed to forward the flag to the underlying `electron-builder` command in the `build:*` scripts.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: add publish scripts for GitHub Releases"
```

---

### Task 4: Create updater module (main process)

**Files:**
- Create: `packages/electron/electron/updater.ts`

- [ ] **Step 1: Create `updater.ts`**

Create `packages/electron/electron/updater.ts` with this content:

```typescript
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';

const store = new ElectronStore<{ skippedVersion: string | null }>({
  defaults: { skippedVersion: null },
});

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    const updateInfo: UpdateInfo = {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : JSON.stringify(info.releaseNotes),
      releaseDate: info.releaseDate ?? new Date().toISOString(),
    };

    const skipped = store.get('skippedVersion');
    if (skipped === updateInfo.version) {
      console.log(`[AutoUpdate] Version ${updateInfo.version} is skipped by user`);
      return;
    }

    console.log(`[AutoUpdate] Update available: ${updateInfo.version}`);
    mainWindow.webContents.send('update-available', updateInfo);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] App is up to date');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdate] Error:', err == null ? 'unknown' : (err as Error).message ?? err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdate] Failed to check for updates:', (err as Error).message);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/electron/electron/updater.ts
git commit -m "feat: add updater module with electron-updater integration"
```

---

### Task 5: Wire updater into main.ts

**Files:**
- Modify: `packages/electron/electron/main.ts`

- [ ] **Step 1: Add import and IPC handlers**

At the top of `packages/electron/electron/main.ts`, add this import after the existing imports (line 5):

```typescript
import { initAutoUpdater } from './updater';
```

- [ ] **Step 2: Add IPC handler for skip-version**

Add this IPC handler after the existing `get-chrome-path` handler (after line 145), alongside the other handlers:

```typescript
ipcMain.on('skip-version', (_event, version: string) => {
  // electron-store is imported in updater.ts, but we need it here too
  // Instead, use a simple approach: store.set will be called from renderer
  // We handle this via a dedicated handler
});
```

Actually, since `electron-store` is already used in `updater.ts`, we should share the store instance. Replace the above with: import ElectronStore at the top of main.ts and handle the skip-version IPC properly.

**Revised Step 2:** Add this import at the top (after line 5):

```typescript
import { initAutoUpdater } from './updater';
import ElectronStore from 'electron-store';

const updateStore = new ElectronStore<{ skippedVersion: string | null }>({
  defaults: { skippedVersion: null },
});
```

**Revised Step 3:** Add this IPC handler after the existing handlers (after line 145):

```typescript
ipcMain.handle('skip-version', (_event, version: string) => {
  updateStore.set('skippedVersion', version);
});
```

Wait — this creates a duplicate store. Let me simplify: export the store from `updater.ts` and import it in `main.ts`.

**Final approach — skip-version goes through updater.ts:**

Export a `skipVersion` function from `updater.ts` instead. This is cleaner.

- [ ] **Step 1 (final): Add import to main.ts**

Add after line 5 in `packages/electron/electron/main.ts`:

```typescript
import { initAutoUpdater } from './updater';
```

- [ ] **Step 2 (final): Add IPC handler and call initAutoUpdater**

After line 145 (after the `get-chrome-path` handler), add:

```typescript
ipcMain.handle('skip-version', (_event, version: string) => {
  const ElectronStore = require('electron-store');
  const store = new ElectronStore({ defaults: { skippedVersion: null } });
  store.set('skippedVersion', version);
});
```

Actually, let's keep it simple and clean. We'll use a standalone `electron-store` in main.ts for the IPC handler, and a separate one in updater.ts. The store reads the same file so they share state. But that's two instances of the same store — which is fine since electron-store reads from disk.

**Simplest correct approach:** Add a `skipVersion` export to `updater.ts`, and call it from main.ts.

Let me revise `updater.ts` from Task 4 to also export `skipVersion`. I'll note this as a modification.

- [ ] **Step 1 (revised): Modify updater.ts to export skipVersion**

In `packages/electron/electron/updater.ts`, add this export at the bottom:

```typescript
export function skipVersion(version: string): void {
  store.set('skippedVersion', version);
}
```

- [ ] **Step 2 (revised): Wire into main.ts**

Add after line 5 in `packages/electron/electron/main.ts`:

```typescript
import { initAutoUpdater, skipVersion } from './updater';
```

Add after line 145 (after the `get-chrome-path` handler):

```typescript
ipcMain.handle('skip-version', (_event, version: string) => {
  skipVersion(version);
});
```

- [ ] **Step 3 (revised): Call initAutoUpdater after window creation**

In the `onReady()` function, after `createWindow()` on line 131, add:

```typescript
if (mainWindow) {
  initAutoUpdater(mainWindow);
}
```

Also add the same call after `createWindow()` in the dev branch of `onReady()` (after line 87):

```typescript
createWindow();
if (mainWindow) {
  initAutoUpdater(mainWindow);
}
return;
```

And after `createWindow()` inside the catch block (after line 125):

```typescript
createWindow();
if (mainWindow) {
  initAutoUpdater(mainWindow);
}
return;
```

Note: In dev mode (`!app.isPackaged`), electron-updater will still work but may log warnings. This is acceptable — it allows testing the update notification flow during development.

- [ ] **Step 4: Commit**

```bash
git add packages/electron/electron/updater.ts packages/electron/electron/main.ts
git commit -m "feat: wire auto-update checker into main process"
```

---

### Task 6: Add IPC channels to preload.ts

**Files:**
- Modify: `packages/electron/electron/preload.ts`

- [ ] **Step 1: Add update-related methods to contextBridge**

In `packages/electron/electron/preload.ts`, add these three methods inside the `contextBridge.exposeInMainWorld('electronAPI', { ... })` call, after the existing `onBackendReady` method:

```typescript
onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string; releaseDate: string }) => void): (() => void) => {
  const handler = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes: string; releaseDate: string }): void => callback(info);
  ipcRenderer.on('update-available', handler);
  return () => ipcRenderer.removeListener('update-available', handler);
},

skipVersion: (version: string): Promise<void> =>
  ipcRenderer.invoke('skip-version', version),

getCurrentVersion: (): Promise<string> =>
  ipcRenderer.invoke('get-current-version'),
```

- [ ] **Step 2: Add get-current-version IPC handler in main.ts**

In `packages/electron/electron/main.ts`, add this handler after the `skip-version` handler:

```typescript
ipcMain.handle('get-current-version', () => app.getVersion());
```

- [ ] **Step 3: Commit**

```bash
git add packages/electron/electron/preload.ts packages/electron/electron/main.ts
git commit -m "feat: add update IPC channels to preload and main process"
```

---

### Task 7: Update frontend type definitions

**Files:**
- Modify: `packages/frontend/src/vite-env.d.ts`

- [ ] **Step 1: Extend ElectronAPI interface**

Replace the `ElectronAPI` interface in `packages/frontend/src/vite-env.d.ts` (lines 16-22) with:

```typescript
interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

interface ElectronAPI {
  getPlatform: () => string;
  getUserDataPath: () => Promise<string>;
  getChromePath: () => Promise<string>;
  openExternal: (url: string) => void;
  onBackendReady: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  skipVersion: (version: string) => Promise<void>;
  getCurrentVersion: () => Promise<string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/vite-env.d.ts
git commit -m "feat: add update types to ElectronAPI interface"
```

---

### Task 8: Create UpdateNotifier frontend component

**Files:**
- Create: `packages/frontend/src/components/UpdateNotifier.tsx`

- [ ] **Step 1: Create the UpdateNotifier component**

Create `packages/frontend/src/components/UpdateNotifier.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

const GITHUB_RELEASES_URL = 'https://github.com/Clearzero22/ai-crossborder-pro/releases';

export default function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanup = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    return cleanup;
  }, []);

  if (!updateInfo) return null;

  const handleViewUpdate = () => {
    window.electronAPI?.openExternal(GITHUB_RELEASES_URL);
  };

  const handleSkip = () => {
    window.electronAPI?.skipVersion(updateInfo.version);
    setUpdateInfo(null);
  };

  return (
    <div className="border-t border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 flex items-center justify-between">
      <span className="font-medium">
        发现新版本 v{updateInfo.version}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleViewUpdate}
          className="underline hover:text-blue-900 transition-colors"
        >
          查看更新
        </button>
        <button
          onClick={handleSkip}
          className="text-blue-400 hover:text-blue-600 transition-colors"
        >
          忽略此版本
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/components/UpdateNotifier.tsx
git commit -m "feat: add UpdateNotifier component for in-app update notifications"
```

---

### Task 9: Mount UpdateNotifier in Layout

**Files:**
- Modify: `packages/frontend/src/components/Layout.tsx`

- [ ] **Step 1: Import and render UpdateNotifier**

In `packages/frontend/src/components/Layout.tsx`:

Add import after line 2:
```typescript
import UpdateNotifier from './UpdateNotifier';
```

Add `<UpdateNotifier />` after `<PlanAlert />` on line 29:
```tsx
<PlanAlert />
<UpdateNotifier />
{header}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/components/Layout.tsx
git commit -m "feat: mount UpdateNotifier in Layout alongside PlanAlert"
```

---

### Task 10: Build verification

**Files:**
- No new files

- [ ] **Step 1: Verify TypeScript compilation**

Run: `cd packages/electron && npx tsc -p tsconfig.json --noEmit`
Expected: no errors

- [ ] **Step 2: Verify frontend build**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Verify dev mode starts**

Run: `npm run dev` and confirm:
- Electron launches
- Console shows `[AutoUpdate]` log messages (update check runs)
- App UI renders normally with no console errors

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -u
git commit -m "fix: resolve any build issues from auto-update integration"
```

---

### Task 11: Commit design doc and plan

**Files:**
- Existing: `docs/superpowers/specs/2026-05-19-auto-update-design.md`
- Existing: `docs/superpowers/plans/2026-05-19-auto-update.md`

- [ ] **Step 1: Commit all documentation**

```bash
git add docs/superpowers/specs/2026-05-19-auto-update-design.md docs/superpowers/plans/2026-05-19-auto-update.md
git commit -m "docs: add auto-update design spec and implementation plan"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| Check for updates on startup (non-blocking) | Task 4 + 5 |
| Show in-app notification bar | Task 8 + 9 |
| Open GitHub Releases in browser | Task 8 (handleViewUpdate) |
| Skip/ignore version (persisted) | Task 4 (electron-store) + Task 5 (skipVersion) + Task 6 (IPC) |
| GitHub Releases hosting | Task 2 (publish config) |
| electron-updater dependency | Task 1 |
| electron-store dependency | Task 1 |
| IPC: update-available | Task 4 + 6 |
| IPC: skip-version | Task 5 + 6 |
| IPC: get-current-version | Task 6 + 7 |
| Preload bridge | Task 6 |
| Frontend type definitions | Task 7 |
| No auto-download | Task 4 (autoDownload = false) |
| No auto-install | Task 4 (autoInstallOnAppQuit = false) |
| Silent error handling | Task 4 (error event logged only) |
| Local manual publish scripts | Task 3 |

No gaps found. All spec requirements are covered.
