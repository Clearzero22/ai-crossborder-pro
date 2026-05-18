# Browser Data Profile Management — Design Spec

**Date:** 2026-05-19
**Status:** Approved

---

## Goal

Allow users to create, manage, and switch between named browser data profiles. Each profile is a directory that stores Chrome/Chromium persistent data (cookies, login state, extensions). All services share the single active profile.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Profile scope | One global active profile | Simplicity; users don't need per-service isolation |
| Profile storage | Named profiles in SQLite | Persist across sessions; queryable |
| UI location | Embedded in existing BrowserConfigSection | Logical grouping with browser mode config |
| Migration | None | Old hardcoded paths remain untouched; users create profiles manually |
| `is_active` column | Not used on profiles table | Avoid dual-source inconsistency; use `settings.active_profile_id` only |

---

## Data Model

### SQLite: `profiles` table

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### SQLite: `settings` table (existing)

New key:
- `active_profile_id` (TEXT) — ID of the currently active profile

---

## Backend Changes

### 1. `browser-config.ts` — new profile methods

```typescript
getProfiles(): Promise<Profile[]>
createProfile(name: string, path: string): Promise<Profile>
updateProfile(id: string, patch: { name?: string; path?: string }): Promise<void>
deleteProfile(id: string): Promise<void>
setActiveProfile(id: string): Promise<void>
getActiveProfile(): Promise<Profile | null>
getActiveDataDir(): Promise<string>
```

**Path validation on create/update:**
- Check directory exists (or can be created)
- Check directory is writable
- Reject empty strings

### 2. `getUserDataDir()` modification in `utils.ts`

New priority chain:
1. Explicit `userDataDir` parameter passed to caller
2. Active profile path from `browserConfig.getActiveDataDir()`
3. `CHROME_DATA_DIR` env var (Electron production)
4. Platform default fallback (unchanged for backward compat)

**Remove** the Windows/macOS default name inconsistency. Both platforms default to `automation` when no profile is active.

### 3. Eliminate hardcoded paths in services

Files that bypass `getUserDataDir()` and hardcode `~/.node-plawright-test/chrome-profile/file-upload` or `/automation`:

| File | Current | Change To |
|------|---------|-----------|
| `services/amazon-search-service.ts:24` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/amazon-product-service.ts:82` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/crawler-service.ts:81` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/gemini-file-service.ts:43` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/xiyouzhaociService.ts:14` | `join(homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/amazon-search-service-cdp.ts:65` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |
| `services/chatgpt-file-service.ts:89,323` | `path.join(os.homedir(), '.node-plawright-test', ...)` | `getUserDataDir()` |

All become: `import { getUserDataDir } from '../utils'; ... getUserDataDir()`.

### 4. New API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings/browser/profiles` | GET | List all profiles |
| `/api/settings/browser/profiles` | POST | Create profile `{ name, path }` |
| `/api/settings/browser/profiles/:id` | PUT | Update profile `{ name?, path? }` |
| `/api/settings/browser/profiles/:id` | DELETE | Delete profile (reject if active) |
| `/api/settings/browser/profiles/active` | PUT | Set active profile `{ id }` |

### 5. `api-server.ts` — register new routes

Add the above endpoints alongside existing browser config routes.

---

## Frontend Changes

### 1. `useBrowserSettings.tsx` hook extension

New state:
- `profiles: Profile[]` — all profiles
- `activeProfileId: string | null` — current active profile

New methods:
- `createProfile(name, path)` — POST
- `updateProfile(id, patch)` — PUT
- `deleteProfile(id)` — DELETE
- `setActiveProfile(id)` — PUT active

### 2. `BrowserConfigSection.tsx` — new profile management UI

Placed above the "浏览器模式" radio buttons:

```
┌─────────────────────────────────────────────────┐
│ 🌐 浏览器配置                                    │
├─────────────────────────────────────────────────┤
│ 数据档案  [▼ 店铺 A        ]  [+ 新建]  [🗑]     │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 路径: C:\Users\xxx\chrome-profiles\store-a  │  │
│ │ 状态: ● 可用  大小: 128MB                   │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ 浏览器模式  ◉ 系统 Chrome  ○ Playwright Chromium  │
│ ...                                              │
└─────────────────────────────────────────────────┘
```

**新建档案弹窗（内联）：**
- 档案名称（文本输入）
- 数据目录路径（文本输入 + 说明文字）
- 创建 / 取消 按钮

**交互规则：**
- 不能删除当前活跃档案
- 切换档案即时生效（下次服务启动使用新路径）
- 路径显示为只读信息，编辑走更新接口

---

## Architecture Flow

```
User switches profile
  → Frontend: setActiveProfile(newId)
  → PUT /api/settings/browser/profiles/active { id: newId }
  → Backend: UPDATE settings SET value = newId WHERE key = 'active_profile_id'
  → Backend: return updated profiles list

Service starts browser
  → calls getUserDataDir()
  → getUserDataDir() calls browserConfig.getActiveDataDir()
  → reads active_profile_id from settings
  → reads path from profiles table
  → returns path
  → chromium.launchPersistentContext(path, ...)
```

---

## Out of Scope (YAGNI)

- Profile templates / presets
- Import / export profiles
- Auto-migration of old hardcoded paths
- Per-service profile assignment
- Profile locking for concurrent access
- Profile size management / cleanup

---

## Risk

**Concurrent browser sessions:** If a user switches the active profile while a browser is running, the running session keeps its original directory. Only the next launch picks up the new path. This is acceptable and requires no special handling.
