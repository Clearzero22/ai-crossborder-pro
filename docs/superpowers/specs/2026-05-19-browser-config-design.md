# BrowserConfig — 可配置浏览器设置功能设计

> **日期**: 2026-05-19
> **状态**: Approved
> **前置文档**: `docs/browser-config-analysis-report.md`

---

## 目标

解决 Electron 打包后 5 个浏览器自动化服务必定失败的问题（Playwright Chromium 未下载），提供可配置的浏览器引擎选择：系统 Chrome 或 Playwright Chromium。

---

## 背景

当前项目中 9 个使用 `chromium.launchPersistentContext()` 的服务分为两类：
- 4 个指定 `channel: 'chrome'`（依赖系统 Chrome，条件性可用）
- 5 个未指定 channel（依赖 Playwright 内置 Chromium，因构建时 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 必定失败）

失败的 5 个服务：`base-crawler.ts`、`crawler-service.ts`、`amazon-search-service.ts`、`amazon-product-service.ts`、`xiyouzhaociService.ts`（backend + frontend 共 2 份）。

---

## 架构

```
SettingsPage (BrowserConfigSection)
        │ fetch()
        ▼
Backend API (4 endpoints)
        │
        ▼
BrowserConfig Singleton
    ├── SQLite settings table (持久化)
    ├── getLaunchOptions() (统一启动配置)
    ├── checkChromeExists() (Chrome 检测)
    └── checkPlaywrightStatus() (Chromium 检测)
        │
        ├── utils.ts (2 functions)
        ├── base-crawler.ts
        ├── crawler-service.ts
        ├── amazon-search-service.ts
        ├── amazon-product-service.ts
        ├── gemini-file-service.ts
        ├── xiyouzhaociService.ts (backend)
        └── xiyouzhaociService.ts (frontend)
```

不修改的文件（不同启动机制）：`chatgpt-file-service.ts`（CDP）、`amazon-search-service-cdp.ts`（chrome-launcher）。

---

## 阶段一：统一 System Chrome + 设置 UI

### 1.1 SQLite Schema

在 `packages/backend/src/core/drivers/sqlite-driver.ts` 的 `SQLITE_SCHEMA` 末尾添加 `settings` 表：

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`user_version` 从 1 升到 2，迁移逻辑：`if (version < 2)` 执行完整 schema（`CREATE TABLE IF NOT EXISTS` 幂等）并设置 `user_version = 2`。

### 1.2 DatabaseService 新增方法

在 `packages/backend/src/core/database-service.ts` 添加：

- `getSetting(key: string): string | null`
- `setSetting(key: string, value: string): void`

### 1.3 BrowserConfig 单例

新建 `packages/backend/src/core/browser-config.ts`：

```
class BrowserConfigSingleton
  - cached: BrowserSettings | null  (内存缓存)
  + getConfig(): Promise<BrowserSettings>
  + updateConfig(patch): Promise<BrowserSettings>
  + getLaunchOptions(): Promise<LaunchOptions>
  + checkChromeExists(): { exists: boolean; path: string }
```

类型定义：
```typescript
type BrowserMode = 'system-chrome' | 'playwright-chromium';
interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
}
interface LaunchOptions {
  channel?: 'chrome';
  executablePath?: string;
  env?: Record<string, string>;
}
```

`getLaunchOptions()` 核心逻辑：
- `system-chrome` → `{ channel: 'chrome' }`
- `playwright-chromium` + 有效路径 → `{ executablePath, env: { PLAYWRIGHT_BROWSERS_PATH } }`
- `playwright-chromium` + 无效路径 → 回退 `{ channel: 'chrome' }` + warn 日志

默认配置：`mode: 'system-chrome'`, `playwrightPath: ''`

Chrome 路径检测整合自 `amazon-search-service-cdp.ts` 的最完善版本，覆盖 macOS / Windows / Linux 多个候选路径。

### 1.4 Backend API 端点

在 `packages/backend/src/api-server.ts` 添加 4 个端点：

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/settings/browser` | 返回 `{ settings, status: { chrome, playwright } }` |
| PUT | `/api/settings/browser` | 更新 mode / playwrightPath |
| POST | `/api/settings/browser/download` | 下载 Chromium（SSE 流式进度） |
| POST | `/api/settings/browser/test` | 测试浏览器启动，返回版本信息 |

### 1.5 浏览器启动集成

9 个文件统一通过 `browserConfig.getLaunchOptions()` 获取启动配置：

```typescript
// 每个文件改动 2-3 行
import { browserConfig } from '../core/browser-config';
const launchExtras = await browserConfig.getLaunchOptions();
const context = await chromium.launchPersistentContext(dataDir, {
  ...launchExtras,
  headless: false,
  args: [...],
});
```

需修改的 9 个文件：
1. `backend/src/utils.ts` — `launchPersistent()` (+2 行)
2. `backend/src/utils.ts` — `launchStealth()` (+2 行)
3. `backend/src/crawlers/base-crawler.ts` — `run()` (+3 行)
4. `backend/src/services/crawler-service.ts` — `runGigaB2B()` (+3 行)
5. `backend/src/services/amazon-search-service.ts` — `search()` (+3 行)
6. `backend/src/services/amazon-product-service.ts` — `scrape()` (+3 行)
7. `backend/src/services/xiyouzhaociService.ts` — `scrapeXiyouzhaociKeywords()` (+3 行)
8. `backend/src/services/gemini-file-service.ts` — `launchBrowser()` (+2 行)
9. `frontend/backend/services/xiyouzhaociService.ts` — `scrapeXiyouzhaociKeywords()` (+3 行)

### 1.6 前端 Hook

新建 `packages/frontend/src/hooks/useBrowserSettings.tsx`：
- 遵循 `useSoundSettings.tsx` 模式（Context + Provider + Hook）
- 返回值：`{ settings, chromeStatus, playwrightStatus, loading, refresh, updateSettings, downloadPlaywright, testBrowser }`
- 下载进度通过 `fetch` + `ReadableStream` 读取 SSE

### 1.7 设置页 UI

新建 `BrowserConfigSection` 组件，添加到 `SettingsPage.tsx`（在 SoundSection 和 AppearanceSection 之间）：

```
┌─────────────────────────────────────────────────┐
│ 🌐 浏览器配置                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  浏览器模式                                      │
│  ● 系统 Chrome (推荐)   ○ Playwright Chromium    │
│                                                 │
│  系统 Chrome 状态                                │
│  ✅ 已检测到 /path/to/chrome                    │
│                                                 │
│  ── 仅 Playwright 模式下显示 ──                   │
│  Chromium 安装路径: [____________] [保存]         │
│  [下载 Chromium]  ████████░░ 80%               │
│  [测试浏览器连接]                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

- SectionIcon 添加 `'browser'` SVG path
- 复用现有 Tailwind 类名，深色模式自动生效
- 中文文案，匹配现有 UI 风格

### 1.8 Provider 注册

`App.tsx` 中在 `SoundProvider` 内嵌套 `BrowserSettingsProvider`。

---

## 阶段二：Chromium 下载 + 模式切换

### 2.1 Chromium 下载

`BrowserConfig.downloadPlaywrightChromium(targetPath, onProgress)`：
- 调用 `playwright install chromium` CLI
- 通过 `PLAYWRIGHT_BROWSERS_PATH` 环境变量指定安装路径
- 解析 stdout/stderr 获取下载进度
- 通过 `onProgress({ percent, stage })` 回调实时报告

### 2.2 测试浏览器

`BrowserConfig.testBrowser()`：
- 使用当前模式的配置启动浏览器，获取版本信息后关闭
- 返回 `{ success, version, browserName }`

### 2.3 SSE 下载端点

`POST /api/settings/browser/download` 返回 `text/event-stream`：
```
data: {"type":"progress","percent":30,"stage":"downloading"}
data: {"type":"progress","percent":80,"stage":"installing"}
data: {"type":"complete","path":"/path/to/ms-playwright"}
```

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 系统未检测到 Chrome | 设置页显示警告，提示切换到 Playwright 模式 |
| Playwright Chromium 路径无效 | 自动回退 system-chrome + warn 日志 |
| Chromium 下载失败 | 显示错误信息，支持重试 |
| 磁盘空间不足 | 下载前检查，提示用户 |
| 运行中切换模式 | 已运行的实例不受影响，仅新启动生效 |

---

## 前端 xiyouzhaociService.ts 特殊处理

`packages/frontend/backend/services/xiyouzhaociService.ts` 是前端本地副本，没有数据库访问能力。

处理方式：增加环境变量回退 — `BROWSER_MODE` 和 `BROWSER_PLAYWRIGHT_PATH`。`getLaunchOptions()` 优先读 DB，DB 中无配置时检查环境变量，最后回退默认值 `system-chrome`。

---

## 不做的事

- 不修改 `chatgpt-file-service.ts` 和 `amazon-search-service-cdp.ts`（不同启动机制）
- 不修改任何 `test-*.ts` 脚本
- 不引入新依赖
- 不重构反检测脚本（5 个文件中的重复 stealth 代码不在本次范围）
- 不修改 Electron 构建脚本（`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 保持不变）
- 不修改 `electron/preload.ts` 和 IPC 通道（通过 HTTP API 交互）

---

## 文件变更清单

### 新建（3 个）
- `packages/backend/src/core/browser-config.ts`
- `packages/frontend/src/hooks/useBrowserSettings.tsx`
- `packages/frontend/src/components/BrowserConfigSection.tsx`

### 修改（12 个）
- `packages/backend/src/core/drivers/sqlite-driver.ts` — settings 表 + 迁移
- `packages/backend/src/core/database-service.ts` — getSetting/setSetting
- `packages/backend/src/api-server.ts` — 4 个 API 端点
- `packages/backend/src/utils.ts` — 2 个函数集成
- `packages/backend/src/crawlers/base-crawler.ts` — 集成
- `packages/backend/src/services/crawler-service.ts` — 集成
- `packages/backend/src/services/amazon-search-service.ts` — 集成
- `packages/backend/src/services/amazon-product-service.ts` — 集成
- `packages/backend/src/services/xiyouzhaociService.ts` — 集成
- `packages/backend/src/services/gemini-file-service.ts` — 集成
- `packages/frontend/src/pages/SettingsPage.tsx` — 添加 BrowserConfigSection
- `packages/frontend/src/App.tsx` — Provider 注册
