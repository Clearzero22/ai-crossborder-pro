# Browser Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, manage, and switch between named browser data profiles stored in SQLite, so all services share the active profile's data directory.

**Architecture:** Extend the existing `BrowserConfigSingleton` with profile CRUD methods. Add a `profiles` table to SQLite schema. Modify `getUserDataDir()` in `utils.ts` to resolve the active profile path. Eliminate all hardcoded paths in service files. Add profile management UI to `BrowserConfigSection.tsx`.

**Tech Stack:** Hono (API), BetterSqlite3 (database), React Context + useState (frontend), Tailwind CSS (UI)

---

### Task 1: Add `profiles` table to SQLite schema

**Files:**
- Modify: `packages/backend/src/core/drivers/sqlite-driver.ts:134-138`

- [ ] **Step 1: Add profiles table DDL to SQLITE_SCHEMA**

In `packages/backend/src/core/drivers/sqlite-driver.ts`, locate the `SQLITE_SCHEMA` constant (around line 134-138). The current `settings` table DDL ends with `);`. Add the `profiles` table immediately after it:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The full block around lines 134-139 should become:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Verify dev server starts and DB schema is created**

Run: `cd packages/backend && npx tsx src/api-server.ts`
Then: `curl http://localhost:3456/api/health`
Expected: `{"status":"ok","db":true,...}`

Verify the table exists by inspecting `packages/backend/data/crawler.db`:
Run: `sqlite3 packages/backend/data/crawler.db ".tables"`
Expected output includes `profiles`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/core/drivers/sqlite-driver.ts
git commit -m "feat: add profiles table to SQLite schema"
```

---

### Task 2: Add profile CRUD methods to BrowserConfigSingleton

**Files:**
- Modify: `packages/backend/src/core/browser-config.ts`

- [ ] **Step 1: Add Profile interface and extend DbAccess**

At the top of `packages/backend/src/core/browser-config.ts`, after the `BrowserSettings` interface (line 12), add:

```typescript
export interface Profile {
  id: string;
  name: string;
  path: string;
  created_at: string;
}
```

Update the `DbAccess` interface (lines 20-23) to add a `query` method:

```typescript
interface DbAccess {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
```

- [ ] **Step 2: Add profile methods to BrowserConfigSingleton**

Inside the `BrowserConfigSingleton` class, add these methods before the `invalidateCache()` method (around line 191):

```typescript
  // ─── Profile Management ────────────────────────────────────────

  async getProfiles(): Promise<Profile[]> {
    if (!this.db) return [];
    try {
      const result = await this.db.query('SELECT id, name, path, created_at FROM profiles ORDER BY created_at');
      return result.rows.map(r => ({
        id: r.id as string,
        name: r.name as string,
        path: r.path as string,
        created_at: r.created_at as string,
      }));
    } catch (err) {
      console.warn('[BrowserConfig] Failed to load profiles:', err);
      return [];
    }
  }

  async createProfile(name: string, dirPath: string): Promise<Profile> {
    if (!name.trim()) throw new Error('Profile name is required');
    if (!dirPath.trim()) throw new Error('Profile path is required');

    const validatedPath = path.resolve(dirPath.trim());
    fs.mkdirSync(validatedPath, { recursive: true });

    const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!this.db) throw new Error('Database not available');

    await this.db.query(
      'INSERT INTO profiles (id, name, path) VALUES ($1, $2, $3)',
      [id, name.trim(), validatedPath],
    );

    return { id, name: name.trim(), path: validatedPath, created_at: new Date().toISOString() };
  }

  async updateProfile(id: string, patch: { name?: string; path?: string }): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    if (patch.name !== undefined && !patch.name.trim()) {
      throw new Error('Profile name is required');
    }

    if (patch.path !== undefined) {
      if (!patch.path.trim()) throw new Error('Profile path is required');
      const validatedPath = path.resolve(patch.path.trim());
      fs.mkdirSync(validatedPath, { recursive: true });
      await this.db.query(
        "UPDATE profiles SET path = $1 WHERE id = $2",
        [validatedPath, id],
      );
    }

    if (patch.name !== undefined) {
      await this.db.query(
        "UPDATE profiles SET name = $1 WHERE id = $2",
        [patch.name.trim(), id],
      );
    }
  }

  async deleteProfile(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const activeId = await this.db.getSetting('active_profile_id');
    if (activeId === id) {
      throw new Error('Cannot delete the active profile');
    }

    await this.db.query('DELETE FROM profiles WHERE id = $1', [id]);
  }

  async setActiveProfile(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    // Verify profile exists
    const result = await this.db.query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new Error('Profile not found');
    }

    await this.db.setSetting('active_profile_id', id);
  }

  async getActiveProfile(): Promise<Profile | null> {
    if (!this.db) return null;
    try {
      const activeId = await this.db.getSetting('active_profile_id');
      if (!activeId) return null;

      const result = await this.db.query(
        'SELECT id, name, path, created_at FROM profiles WHERE id = $1',
        [activeId],
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id as string,
        name: row.name as string,
        path: row.path as string,
        created_at: row.created_at as string,
      };
    } catch {
      return null;
    }
  }

  async getActiveDataDir(): Promise<string | null> {
    const profile = await this.getActiveProfile();
    return profile ? profile.path : null;
  }
```

- [ ] **Step 3: Verify the backend compiles**

Run: `cd packages/backend && npx tsx src/api-server.ts`
Expected: Server starts without errors. No need to test profile endpoints yet (they don't exist yet).

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/core/browser-config.ts
git commit -m "feat: add profile CRUD methods to BrowserConfigSingleton"
```

---

### Task 3: Add profile API endpoints

**Files:**
- Modify: `packages/backend/src/api-server.ts`

- [ ] **Step 1: Add profile API routes**

In `packages/backend/src/api-server.ts`, add the following routes after the existing browser config download endpoint (after line 1134, before the static files section comment). Add a helper function first, then the routes.

Insert this block before the `// ─── 全局错误处理 ────────────────────────────────────────────` comment (line 1136):

```typescript
// ─── 浏览器档案 API ────────────────────────────────────────────

async function ensureBrowserDb(): Promise<void> {
  const db = createDb();
  if (db) {
    try {
      await db.connect();
      browserConfig.setDb(db);
      await db.disconnect();
    } catch { /* DB not available */ }
  }
}

app.get('/api/settings/browser/profiles', async (c) => {
  await ensureBrowserDb();
  const profiles = await browserConfig.getProfiles();
  const activeProfile = await browserConfig.getActiveProfile();
  return c.json({ profiles, activeProfileId: activeProfile?.id || null });
});

app.post('/api/settings/browser/profiles', async (c) => {
  await ensureBrowserDb();
  try {
    const { name, path: dirPath } = await c.req.json();
    if (!name || !dirPath) {
      return c.json({ error: 'name and path are required' }, 400);
    }
    const profile = await browserConfig.createProfile(name, dirPath);
    return c.json({ profile });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

app.put('/api/settings/browser/profiles/:id', async (c) => {
  await ensureBrowserDb();
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    await browserConfig.updateProfile(id, { name: body.name, path: body.path });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

app.delete('/api/settings/browser/profiles/:id', async (c) => {
  await ensureBrowserDb();
  const id = c.req.param('id');
  try {
    await browserConfig.deleteProfile(id);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

app.put('/api/settings/browser/profiles/active', async (c) => {
  await ensureBrowserDb();
  try {
    const { id } = await c.req.json();
    if (!id) return c.json({ error: 'id is required' }, 400);
    await browserConfig.setActiveProfile(id);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});
```

- [ ] **Step 2: Test profile API endpoints manually**

Start the server: `cd packages/backend && npx tsx src/api-server.ts`

Test listing (empty):
```bash
curl http://localhost:3456/api/settings/browser/profiles
```
Expected: `{"profiles":[],"activeProfileId":null}`

Test creating a profile:
```bash
curl -X POST http://localhost:3456/api/settings/browser/profiles -H "Content-Type: application/json" -d '{"name":"Test","path":"C:\\Users\\admin\\test-profile"}'
```
Expected: Returns a profile object with id, name, path.

Test setting it active:
```bash
curl -X PUT http://localhost:3456/api/settings/browser/profiles/active -H "Content-Type: application/json" -d '{"id":"<id from above>"}'
```
Expected: `{"success":true}`

Test listing again:
```bash
curl http://localhost:3456/api/settings/browser/profiles
```
Expected: Returns the profile with `activeProfileId` set.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api-server.ts
git commit -m "feat: add browser profile CRUD API endpoints"
```

---

### Task 4: Update `getUserDataDir()` to resolve active profile

**Files:**
- Modify: `packages/backend/src/utils.ts:7-20`

- [ ] **Step 1: Rewrite `getUserDataDir()` with active profile priority**

Replace the entire `getUserDataDir` function (lines 7-20) in `packages/backend/src/utils.ts` with:

```typescript
export async function getUserDataDir(profileName?: string): Promise<string> {
  // Priority 1: explicit parameter
  if (profileName) {
    const electronDataDir = process.env.CHROME_DATA_DIR;
    if (electronDataDir) return path.join(electronDataDir, profileName);
    return path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', profileName);
  }

  // Priority 2: active profile from DB
  try {
    const activeDir = await browserConfig.getActiveDataDir();
    if (activeDir) return activeDir;
  } catch { /* DB not available, fall through */ }

  // Priority 3: CHROME_DATA_DIR env var (Electron production)
  const electronDataDir = process.env.CHROME_DATA_DIR;
  if (electronDataDir) return path.join(electronDataDir, 'automation');

  // Priority 4: platform default
  return path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'automation');
}
```

**Important:** The function signature changes from synchronous to **async**. This means all callers must now `await` it.

- [ ] **Step 2: Update `launchPersistent()` to await the async `getUserDataDir()`**

Replace lines 23-24 in `packages/backend/src/utils.ts`:

```typescript
export async function launchPersistent(userDataDir?: string): Promise<BrowserContext> {
  const dataDir = userDataDir || await getUserDataDir();
```

- [ ] **Step 3: Update `launchStealth()` to await the async `getUserDataDir()`**

Replace line 68 in `packages/backend/src/utils.ts`:

```typescript
  const dataDir = userDataDir || await getUserDataDir('stealth');
```

- [ ] **Step 4: Verify the backend compiles**

Run: `cd packages/backend && npx tsc --noEmit 2>&1 | head -30`
Expected: There will be type errors in service files that call the old synchronous `getUserDataDir()`. These will be fixed in Task 5. For now, just confirm the changes in `utils.ts` itself are valid.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/utils.ts
git commit -m "feat: make getUserDataDir async with active profile resolution"
```

---

### Task 5: Eliminate hardcoded paths in all service files

**Files:**
- Modify: `packages/backend/src/services/amazon-search-service.ts:24`
- Modify: `packages/backend/src/services/amazon-product-service.ts:80-83`
- Modify: `packages/backend/src/services/crawler-service.ts:81`
- Modify: `packages/backend/src/services/gemini-file-service.ts:43`
- Modify: `packages/backend/src/services/xiyouzhaociService.ts:14,208`
- Modify: `packages/backend/src/services/amazon-search-service-cdp.ts:65`
- Modify: `packages/backend/src/services/chatgpt-file-service.ts:322-324`
- Modify: `packages/backend/src/crawlers/base-crawler.ts:67`

- [ ] **Step 1: Fix `amazon-search-service.ts`**

In `packages/backend/src/services/amazon-search-service.ts`:
1. Add import at top: `import { getUserDataDir } from '../utils';`
2. Remove `import * as os from 'os';` and `import * as path from 'path';` if no longer used elsewhere in the file (check first — they may be used elsewhere).
3. Replace line 24:
```typescript
// BEFORE:
    const userDataDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'automation');

// AFTER:
    const userDataDir = await getUserDataDir();
```
Note: the `search` method must become `async` if it isn't already (it is).

- [ ] **Step 2: Fix `amazon-product-service.ts`**

In `packages/backend/src/services/amazon-product-service.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Remove dead code at line 80: `const userDataDir = path.join(os.tmpdir(), 'amazon-product-profile');`
3. Replace line 82:
```typescript
// BEFORE:
    const sharedUserDataDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'file-upload');
    this.context = await chromium.launchPersistentContext(sharedUserDataDir, {

// AFTER:
    const sharedUserDataDir = await getUserDataDir();
    this.context = await chromium.launchPersistentContext(sharedUserDataDir, {
```

- [ ] **Step 3: Fix `crawler-service.ts`**

In `packages/backend/src/services/crawler-service.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Replace line 81:
```typescript
// BEFORE:
      const sharedProfileDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'file-upload');

// AFTER:
      const sharedProfileDir = await getUserDataDir();
```

- [ ] **Step 4: Fix `gemini-file-service.ts`**

In `packages/backend/src/services/gemini-file-service.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Replace line 43:
```typescript
// BEFORE:
    const sharedProfileDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'file-upload');

// AFTER:
    const sharedProfileDir = await getUserDataDir();
```

- [ ] **Step 5: Fix `xiyouzhaociService.ts`**

In `packages/backend/src/services/xiyouzhaociService.ts`:
1. Add import: `import { getUserDataDir } from './utils';` (note: this file may import from `../utils` — check the actual import path used)
2. Remove the module-level constant at line 14: `const DATA_DIR = join(homedir(), '.node-plawright-test', 'chrome-profile', 'file-upload');`
3. In the `scrapeXiyouzhaociKeywords` function (around line 208), replace the launch call. The function already uses `DATA_DIR` for the context launch. Change it to:
```typescript
    const profileDir = await getUserDataDir();
    console.log(`[Xiyouzhaoci] Using browser profile: ${profileDir}`);
    const context = await chromium.launchPersistentContext(profileDir, {
```
4. Check if `DATA_DIR` is used for anything else besides the browser context. If `CSV_OUTPUT_DIR` at line 15 still uses it, that's a separate concern (output directory, not browser data) — leave `CSV_OUTPUT_DIR` as-is.

- [ ] **Step 6: Fix `amazon-search-service-cdp.ts`**

In `packages/backend/src/services/amazon-search-service-cdp.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Replace line 65:
```typescript
// BEFORE:
    const userDataDir = options.userDataDir || path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'automation');

// AFTER:
    const userDataDir = options.userDataDir || await getUserDataDir();
```

- [ ] **Step 7: Fix `chatgpt-file-service.ts`**

In `packages/backend/src/services/chatgpt-file-service.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Replace the `getProfileDir()` method (lines 322-324):
```typescript
// BEFORE:
  private getProfileDir(): string {
    return path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'automation');
  }

// AFTER:
  private async getProfileDir(): Promise<string> {
    return await getUserDataDir();
  }
```
3. Find all calls to `this.getProfileDir()` in the file and ensure they `await` it. Check around line 84 where `sharedProfileDir` is assigned.

- [ ] **Step 8: Fix `base-crawler.ts`**

In `packages/backend/src/crawlers/base-crawler.ts`:
1. Add import: `import { getUserDataDir } from '../utils';`
2. Replace line 67:
```typescript
// BEFORE:
        run.dirs.root + '/chrome-profile',

// AFTER:
        await getUserDataDir(),
```
Note: `base-crawler.ts` uses per-run ephemeral profiles. This change makes it use the global profile instead, which is the desired behavior per the spec.

- [ ] **Step 9: Verify all files compile**

Run: `cd packages/backend && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only errors in test files which are not part of this task).

- [ ] **Step 10: Commit**

```bash
git add packages/backend/src/services/amazon-search-service.ts packages/backend/src/services/amazon-product-service.ts packages/backend/src/services/crawler-service.ts packages/backend/src/services/gemini-file-service.ts packages/backend/src/services/xiyouzhaociService.ts packages/backend/src/services/amazon-search-service-cdp.ts packages/backend/src/services/chatgpt-file-service.ts packages/backend/src/crawlers/base-crawler.ts
git commit -m "refactor: eliminate hardcoded browser data paths, use getUserDataDir()"
```

---

### Task 6: Extend frontend `useBrowserSettings` hook with profile support

**Files:**
- Modify: `packages/frontend/src/hooks/useBrowserSettings.tsx`

- [ ] **Step 1: Add Profile type and state to the hook**

In `packages/frontend/src/hooks/useBrowserSettings.tsx`, add the `Profile` interface after the existing type definitions (after line 32):

```typescript
interface Profile {
  id: string;
  name: string;
  path: string;
  created_at: string;
}
```

Add new state variables inside `BrowserSettingsProvider` (after line 64):

```typescript
const [profiles, setProfiles] = useState<Profile[]>([]);
const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
```

- [ ] **Step 2: Add profile methods to the provider**

Add these methods inside `BrowserSettingsProvider` after the `downloadPlaywright` callback (after line 183):

```typescript
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/browser/profiles`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles);
        setActiveProfileId(data.activeProfileId);
      }
    } catch { /* ignore */ }
  }, []);

  const createProfile = useCallback(async (name: string, dirPath: string) => {
    const res = await fetch(`${API_BASE}/settings/browser/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path: dirPath }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    await fetchProfiles();
  }, [fetchProfiles]);

  const updateProfile = useCallback(async (id: string, patch: { name?: string; path?: string }) => {
    const res = await fetch(`${API_BASE}/settings/browser/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    await fetchProfiles();
  }, [fetchProfiles]);

  const deleteProfile = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE}/settings/browser/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    await fetchProfiles();
  }, [fetchProfiles]);

  const setActiveProfile = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE}/settings/browser/profiles/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    await fetchProfiles();
  }, [fetchProfiles]);
```

- [ ] **Step 3: Update the context value to include new state and methods**

Update the `BrowserContext.Provider` value (around line 191) to include the new fields:

```typescript
    <BrowserContext.Provider value={{
      settings, chromeStatus, playwrightStatus, chromiumVersion, loading, error,
      testResult, testing, downloading, downloadProgress, downloadError,
      refresh, updateSettings, testBrowser, downloadPlaywright,
      profiles, activeProfileId,
      createProfile, updateProfile, deleteProfile, setActiveProfile,
    }}>
```

- [ ] **Step 4: Update `BrowserContextValue` interface**

Update the `BrowserContextValue` interface (lines 34-50) to include:

```typescript
interface BrowserContextValue {
  settings: BrowserSettings;
  chromeStatus: ChromeStatus;
  playwrightStatus: PlaywrightStatus;
  chromiumVersion: string;
  loading: boolean;
  error: string | null;
  testResult: TestResult | null;
  testing: boolean;
  downloading: boolean;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<BrowserSettings>) => Promise<void>;
  testBrowser: () => Promise<void>;
  downloadPlaywright: (targetPath: string) => Promise<void>;
  profiles: Profile[];
  activeProfileId: string | null;
  createProfile: (name: string, path: string) => Promise<void>;
  updateProfile: (id: string, patch: { name?: string; path?: string }) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
}
```

- [ ] **Step 5: Load profiles on mount**

In the existing `useEffect` that calls `refresh()` (around line 185), add `fetchProfiles()` to it:

```typescript
  useEffect(() => {
    refresh();
    fetchProfiles();
    return () => { abortRef.current?.abort(); };
  }, [refresh, fetchProfiles]);
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/hooks/useBrowserSettings.tsx
git commit -m "feat: add profile state and CRUD methods to useBrowserSettings hook"
```

---

### Task 7: Build profile management UI in BrowserConfigSection

**Files:**
- Modify: `packages/frontend/src/components/BrowserConfigSection.tsx`

- [ ] **Step 1: Destructure new profile props from useBrowserSettings**

Update the destructured values from `useBrowserSettings()` (line 5-9) to include:

```typescript
  const {
    settings, chromeStatus, playwrightStatus, chromiumVersion, loading, error,
    testResult, testing, downloading, downloadProgress, downloadError,
    updateSettings, testBrowser, downloadPlaywright,
    profiles, activeProfileId,
    createProfile, updateProfile, deleteProfile, setActiveProfile,
  } = useBrowserSettings();
```

- [ ] **Step 2: Add inline create-profile form state**

After the existing `useState` for `customPath` (line 11), add:

```typescript
const [showNewProfile, setShowNewProfile] = useState(false);
const [newProfileName, setNewProfileName] = useState('');
const [newProfilePath, setNewProfilePath] = useState('');
const [profileError, setProfileError] = useState('');
```

- [ ] **Step 3: Add helper functions for profile operations**

After the state declarations, add:

```typescript
const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

const handleCreateProfile = async () => {
  setProfileError('');
  if (!newProfileName.trim() || !newProfilePath.trim()) {
    setProfileError('请填写档案名称和路径');
    return;
  }
  try {
    await createProfile(newProfileName.trim(), newProfilePath.trim());
    setNewProfileName('');
    setNewProfilePath('');
    setShowNewProfile(false);
  } catch (err) {
    setProfileError(String(err));
  }
};

const handleDeleteProfile = async (id: string) => {
  try {
    await deleteProfile(id);
  } catch (err) {
    setProfileError(String(err));
  }
};
```

- [ ] **Step 4: Add profile management UI section**

In the JSX, insert the profile management section **before** the "Browser Mode Selection" section (before line 39, the `<div className="px-5 py-3.5">` that starts "浏览器模式"). Insert this block:

```tsx
        {/* Profile Management */}
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-gray-900">数据档案</div>
              <div className="text-xs text-gray-500 mt-0.5">选择浏览器数据目录，保存登录状态和 cookies</div>
            </div>
            <button
              onClick={() => setShowNewProfile(!showNewProfile)}
              className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              {showNewProfile ? '取消' : '+ 新建'}
            </button>
          </div>

          {/* Profile selector */}
          <div className="flex items-center gap-2">
            <select
              value={activeProfileId || ''}
              onChange={(e) => {
                if (e.target.value) setActiveProfile(e.target.value);
              }}
              className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">默认路径</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {activeProfile && (
              <button
                onClick={() => handleDeleteProfile(activeProfile.id)}
                className="px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="删除档案"
              >
                删除
              </button>
            )}
          </div>

          {/* Active profile info */}
          {activeProfile && (
            <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">
                路径: <span className="text-gray-700 font-mono">{activeProfile.path}</span>
              </div>
            </div>
          )}

          {/* New profile form */}
          {showNewProfile && (
            <div className="mt-3 space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="档案名称（如：店铺 A）"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newProfilePath}
                onChange={(e) => setNewProfilePath(e.target.value)}
                placeholder="数据目录路径（如：C:\Users\xxx\chrome-profiles\store-a）"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {profileError && (
                <div className="text-xs text-red-500">{profileError}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProfile}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  创建
                </button>
                <button
                  onClick={() => { setShowNewProfile(false); setProfileError(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd packages/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/components/BrowserConfigSection.tsx
git commit -m "feat: add profile management UI to BrowserConfigSection"
```

---

### Task 8: Fix remaining callers of synchronous `getUserDataDir()`

**Files:**
- Scan: All test files under `packages/backend/src/` that import `getUserDataDir` or `launchPersistent`

- [ ] **Step 1: Find all remaining callers**

Run: `cd packages/backend && grep -rn "getUserDataDir\|launchPersistent\|launchStealth" src/ --include="*.ts" | grep -v "export \|node_modules" | grep -v "utils.ts"`

For each file found, check if it uses `getUserDataDir()` without `await`. These are test files and scripts. They need to be updated to `await getUserDataDir()` since the function is now async.

For test files (e.g., `test-gemini-simple.ts`, `test-amazon-search.ts`, etc.), the change is typically just adding `await` before the call, since these test scripts are already async.

- [ ] **Step 2: Update each file to use async `getUserDataDir()`**

For each file found in Step 1:
1. If it calls `getUserDataDir()` without `await`, add `await`
2. If it passes the result to `launchPersistent()`, change to:
```typescript
const dataDir = await getUserDataDir();
const context = await launchPersistent(dataDir);
```

- [ ] **Step 3: Verify the backend compiles cleanly**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/
git commit -m "fix: update all callers to await async getUserDataDir()"
```

---

### Task 9: Integration test — verify end-to-end profile flow

**Files:**
- No new files

- [ ] **Step 1: Start both frontend and backend**

```bash
# Terminal 1
cd packages/backend && npx tsx src/api-server.ts

# Terminal 2
cd packages/frontend && npm run dev
```

- [ ] **Step 2: Test the full flow in the browser**

1. Open `http://localhost:5173`
2. Navigate to Settings (系统设置)
3. Scroll to Browser Config (浏览器配置) section
4. Verify the "数据档案" section appears with an empty dropdown showing "默认路径"
5. Click "+ 新建" button
6. Enter name "Test Profile" and a valid path (e.g., `C:\Users\admin\test-chrome-profile`)
7. Click "创建"
8. Verify the dropdown now shows "Test Profile" and it's automatically set as active
9. Verify the path is displayed below the dropdown
10. Switch back to "默认路径" in the dropdown
11. Click the delete button on "Test Profile"
12. Verify the profile is deleted

- [ ] **Step 3: Commit (no files to commit — this is a verification step)**

If all steps pass, the implementation is complete.
