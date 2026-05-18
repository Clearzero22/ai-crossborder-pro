# BrowserConfig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement configurable browser engine selection (system Chrome vs Playwright Chromium) to fix 5 browser automation services that fail in packaged Electron builds.

**Architecture:** A `BrowserConfig` singleton manages browser mode via SQLite settings table. All 9 Playwright-using services call `browserConfig.getLaunchOptions()` to get unified launch config. Frontend settings UI allows users to switch modes and download Chromium.

**Tech Stack:** TypeScript, Playwright, better-sqlite3, Hono (SSE), React Context, Tailwind CSS

---

### Task 1: SQLite Schema — Add settings table

**Files:**
- Modify: `packages/backend/src/core/drivers/sqlite-driver.ts:133,171-175`

- [ ] **Step 1: Add settings table to SQLITE_SCHEMA**

In `packages/backend/src/core/drivers/sqlite-driver.ts`, add the settings table DDL after the last `CREATE INDEX` (after line 132, before the closing backtick of `SQLITE_SCHEMA`):

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The result: line 132 ends with `CREATE INDEX IF NOT EXISTS idx_logs_execution ON workflow_execution_logs(execution_id);` and the new lines follow immediately before the closing ``` ` ``` of the template literal.

- [ ] **Step 2: Add migration for version 2**

In the `connect()` method (lines 171-175), change:

```typescript
const version = this.db.pragma('user_version', { simple: true }) as number;
if (version < 1) {
  this.db.exec(SQLITE_SCHEMA);
  this.db.pragma('user_version = 1');
}
```

To:

```typescript
const version = this.db.pragma('user_version', { simple: true }) as number;
if (version < 2) {
  this.db.exec(SQLITE_SCHEMA);
  this.db.pragma('user_version = 2');
}
```

This is safe because all DDL uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

- [ ] **Step 3: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/core/drivers/sqlite-driver.ts
git commit -m "feat: add settings table to SQLite schema (user_version 2)"
```

---

### Task 2: DatabaseService — Add getSetting/setSetting methods

**Files:**
- Modify: `packages/backend/src/core/database-service.ts`

- [ ] **Step 1: Add getSetting and setSetting methods**

In `packages/backend/src/core/database-service.ts`, add these two methods after the `disconnect()` method (after line 34):

```typescript
async getSetting(key: string): Promise<string | null> {
  const result = await this.query(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return result.rows.length > 0 ? (result.rows[0].value as string) : null;
}

async setSetting(key: string, value: string): Promise<void> {
  await this.query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = datetime('now')",
    [key, value],
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/core/database-service.ts
git commit -m "feat: add getSetting/setSetting methods to DatabaseService"
```

---

### Task 3: BrowserConfig Singleton

**Files:**
- Create: `packages/backend/src/core/browser-config.ts`

- [ ] **Step 1: Create BrowserConfig singleton**

Create `packages/backend/src/core/browser-config.ts` with the following content:

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';

export type BrowserMode = 'system-chrome' | 'playwright-chromium';

export interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
}

export interface LaunchOptions {
  channel?: 'chrome';
  executablePath?: string;
  env?: Record<string, string>;
}

interface DbAccess {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

class BrowserConfigSingleton {
  private cached: BrowserSettings | null = null;
  private db: DbAccess | null = null;

  setDb(db: DbAccess): void {
    this.db = db;
  }

  async getConfig(): Promise<BrowserSettings> {
    if (this.cached) return this.cached;

    let mode: BrowserMode = 'system-chrome';
    let playwrightPath = '';

    // 环境变量回退（用于无 DB 访问的前端本地副本）
    if (!this.db) {
      mode = (process.env.BROWSER_MODE as BrowserMode) || 'system-chrome';
      playwrightPath = process.env.BROWSER_PLAYWRIGHT_PATH || '';
      this.cached = { mode, playwrightPath };
      return this.cached;
    }

    try {
      const modeVal = await this.db!.getSetting('browser_mode');
      const pathVal = await this.db!.getSetting('browser_playwright_path');
      if (modeVal === 'system-chrome' || modeVal === 'playwright-chromium') {
        mode = modeVal;
      }
      if (pathVal) playwrightPath = pathVal;
    } catch (err) {
      console.warn('[BrowserConfig] Failed to load settings from DB, using defaults:', err);
    }

    this.cached = { mode, playwrightPath };
    return this.cached;
  }

  async updateConfig(patch: Partial<BrowserSettings>): Promise<BrowserSettings> {
    const current = await this.getConfig();
    const updated = { ...current, ...patch };
    this.cached = updated;

    if (this.db) {
      if (patch.mode !== undefined) await this.db.setSetting('browser_mode', patch.mode);
      if (patch.playwrightPath !== undefined) await this.db.setSetting('browser_playwright_path', patch.playwrightPath || '');
    }

    return updated;
  }

  async getLaunchOptions(): Promise<LaunchOptions> {
    const config = await this.getConfig();

    if (config.mode === 'playwright-chromium' && config.playwrightPath) {
      const exePath = this.resolvePlaywrightExecutable(config.playwrightPath);
      if (exePath && fs.existsSync(exePath)) {
        return {
          executablePath: exePath,
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: config.playwrightPath },
        };
      }
      console.warn(`[BrowserConfig] Playwright Chromium not found at ${config.playwrightPath}, falling back to system Chrome`);
    }

    return { channel: 'chrome' };
  }

  checkChromeExists(): { exists: boolean; path: string } {
    const paths: Record<string, string[]> = {
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ],
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ],
      linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
    };

    for (const p of paths[process.platform] || []) {
      if (fs.existsSync(p)) return { exists: true, path: p };
    }
    return { exists: false, path: '' };
  }

  checkPlaywrightStatus(targetPath: string): { installed: boolean; executablePath: string | null } {
    if (!targetPath) return { installed: false, executablePath: null };
    const exePath = this.resolvePlaywrightExecutable(targetPath);
    if (exePath && fs.existsSync(exePath)) {
      return { installed: true, executablePath: exePath };
    }
    return { installed: false, executablePath: null };
  }

  private resolvePlaywrightExecutable(browserPath: string): string | null {
    // Playwright stores Chromium in a versioned directory under the browser path
    const platform = process.platform;
    let chromiumDir: string;

    if (fs.existsSync(path.join(browserPath, 'chromium'))) {
      chromiumDir = path.join(browserPath, 'chromium');
    } else if (fs.existsSync(path.join(browserPath, 'chromium-'))) {
      // Find versioned directory (e.g., chromium-1161)
      const entries = fs.readdirSync(browserPath)
        .filter(e => e.startsWith('chromium-') && fs.statSync(path.join(browserPath, e)).isDirectory())
        .sort()
        .reverse();
      if (entries.length === 0) return null;
      chromiumDir = path.join(browserPath, entries[0]);
    } else {
      return null;
    }

    if (platform === 'win32') {
      return path.join(chromiumDir, 'chrome-win', 'chrome.exe');
    } else if (platform === 'darwin') {
      return path.join(chromiumDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
    } else {
      return path.join(chromiumDir, 'chrome-linux', 'chrome');
    }
  }

  invalidateCache(): void {
    this.cached = null;
  }
}

export const browserConfig = new BrowserConfigSingleton();
```

- [ ] **Step 2: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/core/browser-config.ts
git commit -m "feat: add BrowserConfig singleton for unified browser launch options"
```

---

### Task 4: Backend API — 4 browser settings endpoints

**Files:**
- Modify: `packages/backend/src/api-server.ts:23-36 (imports), after line 1078 (before serve)`

- [ ] **Step 1: Add import**

In `packages/backend/src/api-server.ts`, add this import after line 36 (`import { ChatGPTFileService }`):

```typescript
import { browserConfig } from './core/browser-config';
```

- [ ] **Step 2: Initialize BrowserConfig with DB**

In the `createDb()` factory function area (around line 54), after the db is created and connected, add `browserConfig.setDb(db)`. Find the pattern where `createDb()` is called (the factory function around line 54-59) and add the initialization there. The `createDb()` function should be modified to also set the db on browserConfig after connecting:

Find the existing `createDb()` function (around lines 54-59) and after the `await db.connect()` line add:

```typescript
browserConfig.setDb(db);
```

- [ ] **Step 3: Add 4 API endpoints**

Add these 4 endpoints after the last existing route (before the static file serving block, which starts around line 1022). Insert them before the `// ─── 静态文件服务` comment:

```typescript
// ─── 浏览器配置 API ───────────────────────────────────────────

app.get('/api/settings/browser', async (c) => {
  try {
    const settings = await browserConfig.getConfig();
    const chromeStatus = browserConfig.checkChromeExists();
    const playwrightStatus = browserConfig.checkPlaywrightStatus(settings.playwrightPath);
    return c.json({ settings, status: { chrome: chromeStatus, playwright: playwrightStatus } });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.put('/api/settings/browser', async (c) => {
  try {
    const body = await c.req.json();
    const updated = await browserConfig.updateConfig({
      mode: body.mode,
      playwrightPath: body.playwrightPath,
    });
    return c.json({ settings: updated });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post('/api/settings/browser/test', async (c) => {
  try {
    const { chromium } = await import('playwright');
    const launchOpts = await browserConfig.getLaunchOptions();
    const browser = await chromium.launch({
      ...launchOpts,
      headless: true,
      args: ['--no-sandbox'],
    });
    const version = browser.version();
    await browser.close();
    return c.json({ success: true, version, browserName: browser.browserType().name() });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});
```

Note: The download endpoint (`POST /api/settings/browser/download`) is deferred to Phase 2 (Task 10). For now, only 3 endpoints are added.

- [ ] **Step 4: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/api-server.ts
git commit -m "feat: add browser settings API endpoints (GET/PUT/test)"
```

---

### Task 5: Integrate BrowserConfig into utils.ts (2 functions)

**Files:**
- Modify: `packages/backend/src/utils.ts:22-53 (launchPersistent), 65-157 (launchStealth)`

- [ ] **Step 1: Add import and modify launchPersistent**

In `packages/backend/src/utils.ts`, add import at the top (after line 3):

```typescript
import { browserConfig } from './core/browser-config';
```

Modify `launchPersistent()` (lines 22-53). Change lines 27-39 from:

```typescript
  const launchOptions: any = {
    headless: false,
    channel: 'chrome', // 使用本地Chrome
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--start-maximized',
    ],
    viewport: null,
  };
```

To:

```typescript
  const launchExtras = await browserConfig.getLaunchOptions();
  const launchOptions: any = {
    ...launchExtras,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--start-maximized',
    ],
    viewport: null,
  };
```

- [ ] **Step 2: Modify launchStealth**

In `launchStealth()` (starts around line 65), find the launchOptions object. Change:

```typescript
    channel: 'chrome',
```

To use `getLaunchOptions()`. The function currently has:

```typescript
  const launchOptions: any = {
    headless: false,
    channel: 'chrome',
    args: [
```

Change to:

```typescript
  const launchExtras = await browserConfig.getLaunchOptions();
  const launchOptions: any = {
    ...launchExtras,
    headless: false,
    args: [
```

- [ ] **Step 3: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/utils.ts
git commit -m "feat: integrate BrowserConfig into utils.ts launch functions"
```

---

### Task 6: Integrate BrowserConfig into 5 service files

**Files:**
- Modify: `packages/backend/src/crawlers/base-crawler.ts:64-70`
- Modify: `packages/backend/src/services/crawler-service.ts:81-84`
- Modify: `packages/backend/src/services/amazon-search-service.ts:27-40`
- Modify: `packages/backend/src/services/amazon-product-service.ts:82-86`
- Modify: `packages/backend/src/services/xiyouzhaociService.ts:207-213`

- [ ] **Step 1: Modify base-crawler.ts**

In `packages/backend/src/crawlers/base-crawler.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change lines 64-70 from:

```typescript
      const { chromium } = await import('playwright');
      const context = await chromium.launchPersistentContext(
        run.dirs.root + '/chrome-profile',
        {
          headless: true,
          args: ['--no-sandbox'],
        }
      );
```

To:

```typescript
      const { chromium } = await import('playwright');
      const launchExtras = await browserConfig.getLaunchOptions();
      const context = await chromium.launchPersistentContext(
        run.dirs.root + '/chrome-profile',
        {
          ...launchExtras,
          headless: true,
          args: ['--no-sandbox'],
        }
      );
```

- [ ] **Step 2: Modify crawler-service.ts**

In `packages/backend/src/services/crawler-service.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change lines 81-84 from:

```typescript
      const context = await chromium.launchPersistentContext(
        sharedProfileDir,
        { headless, args: ['--no-sandbox'] }
      );
```

To:

```typescript
      const launchExtras = await browserConfig.getLaunchOptions();
      const context = await chromium.launchPersistentContext(
        sharedProfileDir,
        { ...launchExtras, headless, args: ['--no-sandbox'] }
      );
```

- [ ] **Step 3: Modify amazon-search-service.ts**

In `packages/backend/src/services/amazon-search-service.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change the browser launch block (lines 27-40) from:

```typescript
    if (!this.context) {
      console.log(`[Playwright] Launching browser (headless: ${options.headless !== false ? 'true' : 'false'})...`);
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: options.headless !== false,
        viewport: { width: 1280, height: 900 },
        locale: 'en-US',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }
```

To:

```typescript
    if (!this.context) {
      console.log(`[Playwright] Launching browser (headless: ${options.headless !== false ? 'true' : 'false'})...`);
      const launchExtras = await browserConfig.getLaunchOptions();
      this.context = await chromium.launchPersistentContext(userDataDir, {
        ...launchExtras,
        headless: options.headless !== false,
        viewport: { width: 1280, height: 900 },
        locale: 'en-US',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }
```

- [ ] **Step 4: Modify amazon-product-service.ts**

In `packages/backend/src/services/amazon-product-service.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change lines 82-86 from:

```typescript
    this.context = await chromium.launchPersistentContext(sharedUserDataDir, {
      headless,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    });
```

To:

```typescript
    const launchExtras = await browserConfig.getLaunchOptions();
    this.context = await chromium.launchPersistentContext(sharedUserDataDir, {
      ...launchExtras,
      headless,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    });
```

- [ ] **Step 5: Modify xiyouzhaociService.ts (backend)**

In `packages/backend/src/services/xiyouzhaociService.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change lines 207-213 from:

```typescript
  const context = await chromium.launchPersistentContext(DATA_DIR, {
    headless,
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  });
```

To:

```typescript
  const launchExtras = await browserConfig.getLaunchOptions();
  const context = await chromium.launchPersistentContext(DATA_DIR, {
    ...launchExtras,
    headless,
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  });
```

- [ ] **Step 6: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/crawlers/base-crawler.ts packages/backend/src/services/crawler-service.ts packages/backend/src/services/amazon-search-service.ts packages/backend/src/services/amazon-product-service.ts packages/backend/src/services/xiyouzhaociService.ts
git commit -m "feat: integrate BrowserConfig into 5 backend service files"
```

---

### Task 7: Integrate BrowserConfig into gemini-file-service.ts

**Files:**
- Modify: `packages/backend/src/services/gemini-file-service.ts:44-67`

- [ ] **Step 1: Add import and modify launchBrowser**

In `packages/backend/src/services/gemini-file-service.ts`, add import at the top:

```typescript
import { browserConfig } from '../core/browser-config';
```

Change lines 44-67 from:

```typescript
    this.context = await chromium.launchPersistentContext(sharedProfileDir, {
      headless,
      channel: 'chrome',
      args: [
```

To:

```typescript
    const launchExtras = await browserConfig.getLaunchOptions();
    this.context = await chromium.launchPersistentContext(sharedProfileDir, {
      ...launchExtras,
      headless,
      args: [
```

Remove the `channel: 'chrome',` line since `launchExtras` now provides it.

- [ ] **Step 2: Verify build compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/services/gemini-file-service.ts
git commit -m "feat: integrate BrowserConfig into gemini-file-service"
```

---

### Task 8: Frontend Hook — useBrowserSettings

**Files:**
- Create: `packages/frontend/src/hooks/useBrowserSettings.tsx`

- [ ] **Step 1: Create useBrowserSettings hook**

Create `packages/frontend/src/hooks/useBrowserSettings.tsx` following the `useSoundSettings.tsx` pattern:

```tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

type BrowserMode = 'system-chrome' | 'playwright-chromium';

interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
}

interface ChromeStatus {
  exists: boolean;
  path: string;
}

interface PlaywrightStatus {
  installed: boolean;
  executablePath: string | null;
}

interface BrowserContextValue {
  settings: BrowserSettings;
  chromeStatus: ChromeStatus;
  playwrightStatus: PlaywrightStatus;
  loading: boolean;
  error: string | null;
  testResult: { success: boolean; version?: string; error?: string } | null;
  testing: boolean;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<BrowserSettings>) => Promise<void>;
  testBrowser: () => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BrowserSettings>({ mode: 'system-chrome', playwrightPath: '' });
  const [chromeStatus, setChromeStatus] = useState<ChromeStatus>({ exists: false, path: '' });
  const [playwrightStatus, setPlaywrightStatus] = useState<PlaywrightStatus>({ installed: false, executablePath: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; version?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/settings/browser`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data.settings);
      setChromeStatus(data.status.chrome);
      setPlaywrightStatus(data.status.playwright);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (patch: Partial<BrowserSettings>) => {
    try {
      const res = await fetch(`${API_BASE}/settings/browser`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data.settings);
      await refresh();
    } catch (err) {
      setError(String(err));
    }
  }, [refresh]);

  const testBrowser = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/browser/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: String(err) });
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BrowserContext.Provider value={{ settings, chromeStatus, playwrightStatus, loading, error, testResult, testing, refresh, updateSettings, testBrowser }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserSettings(): BrowserContextValue {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error('useBrowserSettings must be used within BrowserSettingsProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/hooks/useBrowserSettings.tsx
git commit -m "feat: add useBrowserSettings hook with API integration"
```

---

### Task 9: BrowserConfigSection UI component

**Files:**
- Create: `packages/frontend/src/components/BrowserConfigSection.tsx`
- Modify: `packages/frontend/src/pages/SettingsPage.tsx` (add import + render)

- [ ] **Step 1: Create BrowserConfigSection component**

Create `packages/frontend/src/components/BrowserConfigSection.tsx`:

```tsx
import { useBrowserSettings } from '../hooks/useBrowserSettings';

export default function BrowserConfigSection() {
  const { settings, chromeStatus, playwrightStatus, loading, error, testResult, testing, updateSettings, testBrowser } = useBrowserSettings();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <SectionIcon />
          <h2 className="font-semibold text-gray-900">浏览器配置</h2>
        </div>
        <div className="px-5 py-8 text-center text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <SectionIcon />
        <h2 className="font-semibold text-gray-900">浏览器配置</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {/* Browser Mode Selection */}
        <div className="px-5 py-3.5">
          <div className="text-sm font-medium text-gray-900 mb-2">浏览器模式</div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="browserMode"
                checked={settings.mode === 'system-chrome'}
                onChange={() => updateSettings({ mode: 'system-chrome' })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">系统 Chrome</span>
              <span className="text-xs text-gray-400">(推荐)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="browserMode"
                checked={settings.mode === 'playwright-chromium'}
                onChange={() => updateSettings({ mode: 'playwright-chromium' })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Playwright Chromium</span>
            </label>
          </div>
        </div>

        {/* Chrome Status */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <div className="text-sm font-medium text-gray-900">系统 Chrome 状态</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {chromeStatus.exists ? chromeStatus.path : '未检测到 Chrome，请先安装 Google Chrome'}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${chromeStatus.exists ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {chromeStatus.exists ? '已检测到' : '未安装'}
          </span>
        </div>

        {/* Playwright-only section */}
        {settings.mode === 'playwright-chromium' && (
          <>
            <div className="px-5 py-3.5">
              <div className="text-sm font-medium text-gray-900 mb-1">Chromium 安装路径</div>
              <div className="text-xs text-gray-500 mb-2">Playwright Chromium 的存储目录</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.playwrightPath}
                  onChange={(e) => updateSettings({ playwrightPath: e.target.value })}
                  placeholder="例如: C:\Users\xxx\ms-playwright"
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mt-1.5">
                {playwrightStatus.installed ? (
                  <span className="text-xs text-green-600">Chromium 已安装</span>
                ) : settings.playwrightPath ? (
                  <span className="text-xs text-amber-600">指定路径下未找到 Chromium</span>
                ) : (
                  <span className="text-xs text-gray-400">请输入 Chromium 路径或使用下载功能（即将推出）</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-sm font-medium text-gray-900">测试浏览器连接</div>
                <div className="text-xs text-gray-500 mt-0.5">启动浏览器验证配置是否正确</div>
              </div>
              <button
                onClick={testBrowser}
                disabled={testing}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
            </div>

            {testResult && (
              <div className={`px-5 py-3.5 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success
                  ? `连接成功 — ${testResult.browserName} ${testResult.version}`
                  : `连接失败: ${testResult.error}`}
              </div>
            )}
          </>
        )}

        {/* Info note */}
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            ChatGPT 文件上传和 Amazon CDP 搜索服务始终使用系统 Chrome，不受此设置影响。
          </p>
        </div>

        {error && (
          <div className="px-5 py-3.5 text-sm text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}
```

- [ ] **Step 2: Add BrowserConfigSection to SettingsPage**

In `packages/frontend/src/pages/SettingsPage.tsx`, add the import at the top (after line 8):

```typescript
import BrowserConfigSection from '../components/BrowserConfigSection';
```

In the render section, add `<BrowserConfigSection />` between the `<SoundSection />` and `<AppearanceSection />` components. Find these lines (around line 253):

```tsx
          {/* 声音设置 */}
          <SoundSection />

          {/* 外观设置 */}
          <AppearanceSection />
```

Change to:

```tsx
          {/* 声音设置 */}
          <SoundSection />

          {/* 浏览器配置 */}
          <BrowserConfigSection />

          {/* 外观设置 */}
          <AppearanceSection />
```

- [ ] **Step 3: Verify build compiles**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/components/BrowserConfigSection.tsx packages/frontend/src/pages/SettingsPage.tsx
git commit -m "feat: add BrowserConfigSection settings UI component"
```

---

### Task 10: Register BrowserSettingsProvider in App.tsx

**Files:**
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: Add import and wrap AppContent**

In `packages/frontend/src/App.tsx`, add import:

```typescript
import { BrowserSettingsProvider } from './hooks/useBrowserSettings';
```

Find the Provider wrapping block (around lines 174-181):

```tsx
<PlanProvider wsUrl={WS_URL}>
  <SoundProvider>
    <AppContent />
  </SoundProvider>
</PlanProvider>
```

Change to:

```tsx
<PlanProvider wsUrl={WS_URL}>
  <SoundProvider>
    <BrowserSettingsProvider>
      <AppContent />
    </BrowserSettingsProvider>
  </SoundProvider>
</PlanProvider>
```

- [ ] **Step 2: Verify build compiles**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "feat: register BrowserSettingsProvider in App.tsx"
```

---

### Task 11: Integrate BrowserConfig into frontend xiyouzhaociService.ts (env var fallback)

**Files:**
- Modify: `packages/frontend/backend/services/xiyouzhaociService.ts:200-206`

- [ ] **Step 1: Add import and modify browser launch**

In `packages/frontend/backend/services/xiyouzhaociService.ts`, add import at the top:

```typescript
import { browserConfig } from '../../src/hooks/useBrowserSettings';
```

Wait — the frontend backend service doesn't have access to React hooks. Instead, import directly from the backend module. Since this is a frontend-local copy that runs outside the main backend, we need a different approach. Change the import to:

```typescript
import { browserConfig } from '../../../backend/src/core/browser-config';
```

Then change lines 200-206 from:

```typescript
  const context = await chromium.launchPersistentContext(DATA_DIR, {
    headless,
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  });
```

To:

```typescript
  const launchExtras = await browserConfig.getLaunchOptions();
  const context = await chromium.launchPersistentContext(DATA_DIR, {
    ...launchExtras,
    headless,
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  });
```

Note: `browserConfig.getLaunchOptions()` will fall back to env vars (`BROWSER_MODE`, `BROWSER_PLAYWRIGHT_PATH`) when no DB is set (since `setDb()` is never called in this context), and defaults to `system-chrome`.

- [ ] **Step 2: Verify no import errors**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No errors. If there's a path resolution issue with the cross-package import, the fallback env var approach still works.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/backend/services/xiyouzhaociService.ts
git commit -m "feat: integrate BrowserConfig into frontend xiyouzhaociService (env var fallback)"
```

---

### Task 12: Full integration test

**Files:**
- No new files

- [ ] **Step 1: Start backend and verify API**

Run: `cd packages/backend && npx tsx src/api-server.ts`

In another terminal:
```bash
curl http://localhost:3456/api/settings/browser
```
Expected: JSON with `settings: { mode: "system-chrome", playwrightPath: "" }` and `status: { chrome: { exists: true/false, path: "..." } }`

- [ ] **Step 2: Start frontend and verify UI**

Run: `cd packages/frontend && npm run dev`

Open http://localhost:5173, navigate to Settings page, verify BrowserConfigSection renders with:
- Radio buttons for system-chrome / playwright-chromium
- Chrome status indicator
- Mode switching works (PUT request sent)

- [ ] **Step 3: Test browser test endpoint**

```bash
curl -X POST http://localhost:3456/api/settings/browser/test
```
Expected: `{ success: true, version: "...", browserName: "chromium" }` if Chrome is installed

- [ ] **Step 4: Commit any fixes if needed**

If any issues were found and fixed during testing:
```bash
git add -u
git commit -m "fix: resolve integration issues found during testing"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - SQLite settings table → Task 1 ✅
   - DatabaseService getSetting/setSetting → Task 2 ✅
   - BrowserConfig singleton → Task 3 ✅
   - 4 API endpoints → Task 4 (3 endpoints for Phase 1, download deferred) ✅
   - 9 files browser launch integration → Tasks 5, 6, 7, 11 ✅
   - Frontend hook → Task 8 ✅
   - Settings page UI → Task 9 ✅
   - Provider registration → Task 10 ✅
   - Frontend xiyouzhaociService env var fallback → Task 11 ✅

2. **Placeholder scan:** No TBD, TODO, or vague steps found.

3. **Type consistency:** `BrowserMode`, `BrowserSettings`, `LaunchOptions` defined once in Task 3, used consistently across all tasks. `getLaunchOptions()` returns `LaunchOptions` everywhere.

4. **Phase scope:** Phase 1 is self-contained (all 12 tasks produce working software). Phase 2 (Chromium download SSE endpoint) is noted as deferred.
