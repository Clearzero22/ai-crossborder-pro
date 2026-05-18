# 浏览器配置功能深度分析报告

> **项目**: AI CrossBorder Pro — 跨境电商自动化平台
> **日期**: 2026-05-18
> **范围**: 浏览器自动化缺失问题根因分析 + 可配置浏览器设置功能可行性方案

---

## 目录

1. [问题概述](#1-问题概述)
2. [现有架构全景](#2-现有架构全景)
3. [根因分析](#3-根因分析)
4. [Playwright 浏览器启动模式全面审计](#4-playwright-浏览器启动模式全面审计)
5. [Electron 打包流水线分析](#5-electron-打包流水线分析)
6. [现有设置系统分析](#6-现有设置系统分析)
7. [可行性行方案设计](#7-可行性行方案设计)
8. [实施步骤详解](#8-实施步骤详解)
9. [风险评估与缓解](#9-风险评估与缓解)
10. [文件变更清单](#10-文件变更清单)

---

## 1. 问题概述

### 1.1 用户报告的现象

用户安装 Windows/Mac 打包版本后，使用浏览器自动化功能时出现以下错误：

```
Executable doesn't exist at /Users/xxx/.cache/ms-playwright/chromium-xxxx/chrome-mac/chrome
```

或类似提示 Playwright 浏览器未安装的错误。

### 1.2 问题影响范围

| 用户场景 | 是否受影响 | 说明 |
|----------|-----------|------|
| GigaB2B 爬虫 | **必定失败** | 依赖 Playwright 内置 Chromium |
| Amazon 关键词搜索 | **必定失败** | 依赖 Playwright 内置 Chromium |
| Amazon 商品抓取 | **必定失败** | 依赖 Playwright 内置 Chromium |
| 西柚找词关键词 | **必定失败** | 依赖 Playwright 内置 Chromium |
| Gemini 文件上传 | 条件性失败 | 依赖系统 Chrome，需用户已安装 |
| ChatGPT 文件上传 | 条件性失败 | 依赖系统 Chrome（CDP 方式），需用户已安装 |
| 工作流节点（通用） | 条件性失败 | 取决于节点使用的浏览器启动方式 |

---

## 2. 现有架构全景

### 2.1 Monorepo 结构

```
ai-crossborder-pro/
├── package.json                    # 根配置，workspaces 定义
├── packages/
│   ├── frontend/                   # React + Vite + Tailwind (端口 5173)
│   │   ├── src/
│   │   │   ├── pages/SettingsPage.tsx   # 设置页面（已存在）
│   │   │   ├── hooks/useSoundSettings.tsx
│   │   │   ├── hooks/useTheme.tsx
│   │   │   ├── context/PlanContext.tsx
│   │   │   ├── components/Layout.tsx
│   │   │   ├── components/Sidebar.tsx
│   │   │   └── styles/index.css        # 深色模式完整覆盖
│   │   └── backend/services/xiyouzhaociService.ts  # 前端本地副本
│   │
│   ├── backend/                    # Express/Hono + Playwright (端口 3456)
│   │   ├── src/
│   │   │   ├── api-server.ts            # API 入口，32+ 路由
│   │   │   ├── utils.ts                 # 共享浏览器启动函数
│   │   │   ├── core/
│   │   │   │   ├── database-service.ts  # 数据库服务
│   │   │   │   └── drivers/
│   │   │   │       ├── sqlite-driver.ts # SQLite 驱动，8 张表
│   │   │   │       └── types.ts         # 驱动接口定义
│   │   │   ├── services/
│   │   │   │   ├── gemini-file-service.ts      # Gemini 上传
│   │   │   │   ├── chatgpt-file-service.ts     # ChatGPT 上传（CDP）
│   │   │   │   ├── amazon-search-service.ts    # Amazon 搜索
│   │   │   │   ├── amazon-product-service.ts   # Amazon 商品
│   │   │   │   ├── amazon-search-service-cdp.ts # Amazon CDP 变体
│   │   │   │   ├── crawler-service.ts          # GigaB2B 爬虫
│   │   │   │   └── xiyouzhaociService.ts       # 西柚找词
│   │   │   └── crawlers/
│   │   │       ├── base-crawler.ts             # 爬虫基类
│   │   │       └── gigab2b/crawler.ts          # GigaB2B 实现
│   │   └── package.json             # playwright + playwright-core + better-sqlite3
│   │
│   └── electron/                   # Electron 桌面壳
│       ├── electron/
│       │   ├── main.ts             # 主进程，fork 后端
│       │   ├── preload.ts          # IPC 桥接（5 个 API）
│       │   └── backend-launcher.ts # 后端进程管理
│       ├── scripts/build.mjs       # 构建脚本（安装依赖 + 打包）
│       ├── electron-builder.yml    # electron-builder 配置
│       └── package.json
```

### 2.2 技术栈概览

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React | 18 |
| 构建工具 | Vite | 5 |
| CSS 框架 | Tailwind CSS | 3.4.4 |
| UI 组件库 | **无**（全部自定义） | - |
| 路由 | **无**（客户端状态切换） | - |
| 状态管理 | React Context + useState | - |
| API 调用 | 原生 `fetch()` | - |
| 后端框架 | Hono | - |
| 浏览器自动化 | Playwright | 1.59.1 |
| 数据库 | better-sqlite3 (SQLite) | 12.10.0 |
| Electron | electron + electron-builder | 42.0.1 / 26.8.1 |
| 国际化 | **无**（全部中文硬编码） | - |

---

## 3. 根因分析

### 3.1 根因 #1：构建时主动跳过浏览器下载

**文件**: `packages/electron/scripts/build.mjs:72`

```javascript
execSync('npm install --omit=dev', {
  cwd: tmpDir,
  stdio: 'inherit',
  shell,
  env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
});
```

构建 Electron 包时，安装后端依赖时明确设置 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`。这是有意为之 —— 避免在构建过程中下载约 200-400MB 的浏览器文件。但 **没有任何后续步骤** 补偿下载。

### 3.2 根因 #2：无 `playwright install` 步骤

整个构建流水线（`npm run build` → `npm run build:mac` / `build:win`）中：
- 根 `package.json` 的 `postinstall` 仅执行 `npx electron-builder install-app-deps`（重编译原生模块如 better-sqlite3）
- Backend `package.json` 无 `postinstall` 脚本
- 无任何 CI/CD 步骤执行 `npx playwright install`
- 无首运行（first-run）逻辑安装浏览器

### 3.3 根因 #3：两类服务使用不同浏览器源，5 个服务注定失败

| 类别 | 浏览器源 | 文件 | 状态 |
|------|---------|------|------|
| **A: `channel: 'chrome'`** | 系统安装的 Chrome | `utils.ts` × 2, `gemini-file-service.ts`, `chatgpt-file-service.ts` | 需用户已装 Chrome |
| **B: 无 channel** | Playwright 内置 Chromium（从未下载） | `base-crawler.ts`, `crawler-service.ts`, `amazon-search-service.ts`, `amazon-product-service.ts`, `xiyouzhaociService.ts` × 2 | **必定失败** |

类别 B 的 5 个生产服务调用了 `chromium.launchPersistentContext()` 但未指定 `channel`，因此 Playwright 回退到使用其内置 Chromium —— 而这个 Chromium 因为根因 #1 从未被下载。

### 3.4 根因 #4：`asarUnpack` 配置有误导性

**文件**: `packages/electron/electron-builder.yml:16-18`

```yaml
asarUnpack:
  - backend-dist/node_modules/playwright/**
  - backend-dist/node_modules/playwright-core/**
```

这个配置将 `playwright` 和 `playwright-core` **npm 包的 JavaScript 文件**从 asar 归档中解包出来。但它 **不包含** 浏览器二进制文件。Playwright 浏览器存储在 `~/.cache/ms-playwright/`（macOS）或 `%LOCALAPPDATA%\ms-playwright\`（Windows），不在 `node_modules` 内。

### 3.5 根因 #5：运行时无 `PLAYWRIGHT_BROWSERS_PATH` 环境变量

**文件**: `packages/electron/electron/main.ts:104-115`

```typescript
const backendDistDir = resolvePath('backend-dist');
const nodeModulesDir = resolvePath('backend_node_modules');

startBackend(backendDistDir, {
  PORT: '3456',
  CHROME_DATA_DIR: chromeDataDir,
  DATA_DIR: dataDir,
  FRONTEND_DIR: frontendDistDir,
  NODE_PATH: nodeModulesDir,
  NODE_ENV: 'production',
  ...envFromFile,
});
```

传递给后端进程的环境变量中包含 `CHROME_DATA_DIR` 和 `DATA_DIR`，但 **不包含** `PLAYWRIGHT_BROWSERS_PATH`。即使浏览器被下载了，后端也不知道去哪里找。

### 3.6 根因 #6：`copyDir` 跳过 `.cache` 目录

**文件**: `packages/electron/scripts/build.mjs:90`

```javascript
if (entry.name === '.cache' || entry.name === '.package-lock.json') continue;
```

构建脚本的目录复制函数显式跳过名为 `.cache` 的目录。虽然 Playwright 浏览器不存储在 `.cache` 目录中（它存储在 `~/Library/Caches/ms-playwright/` 或 `%LOCALAPPDATA%\ms-playwright\`），但这仍然是一个潜在的风险点。

### 3.7 根因 #7：无用户友好的错误提示

当 Playwright 找不到浏览器时，抛出的错误信息类似：

```
Error: Executable doesn't exist at /Users/xxx/.cache/ms-playwright/chromium-1161/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

这是一个对非技术用户毫无意义的错误信息。没有任何首运行检查、没有引导安装 Chrome 的提示、没有错误恢复机制。

---

## 4. Playwright 浏览器启动模式全面审计

### 4.1 审计概览

对代码库中 **所有** 浏览器启动调用进行了全面审计，共发现 **18 个启动点**，分布在 **14 个文件**中。使用 **3 种不同的启动机制**。

### 4.2 启动机制分类

#### 机制 1：`chromium.launchPersistentContext()` — 占 13 个启动点

这是最主要的模式。在 9 个生产文件和 4 个测试脚本中使用。

**模式 A：指定 `channel: 'chrome'`（依赖系统 Chrome）**

```typescript
// packages/backend/src/utils.ts:27-39
const launchOptions: any = {
  headless: false,
  channel: 'chrome',  // ← 使用系统 Chrome
  args: ['--no-sandbox', '--disable-setuid-sandbox', ...],
  viewport: null,
};
const context = await chromium.launchPersistentContext(dataDir, launchOptions);
```

| 文件 | 函数 | 行号 | headless | 反检测 |
|------|------|------|----------|--------|
| `utils.ts` | `launchPersistent()` | 22-53 | false | 基础 |
| `utils.ts` | `launchStealth()` | 65-157 | false | 完整（12+项） |
| `gemini-file-service.ts` | `launchBrowser()` | 41-107 | 可配置 | 完整 + WebGL |
| `chatgpt-file-service.ts` | N/A（用 CDP） | 69-119 | N/A | 无需（真实 Chrome） |
| `test-gemini-simple.ts` | IIFE | 12-19 | false | 无 |
| `test-gemini-real-profile.ts` | IIFE | 23-48 | false | 基础 |
| `test-gemini-stealth.ts` | IIFE | 14-59 | false | 完整 |
| `test-gemini-cdp.ts` | IIFE | 20-37 | false | 无 |

**模式 B：未指定 channel（依赖 Playwright 内置 Chromium —— 必定失败）**

```typescript
// packages/backend/src/crawlers/base-crawler.ts:64-70
const context = await chromium.launchPersistentContext(
  run.dirs.root + '/chrome-profile',
  {
    headless: true,
    args: ['--no-sandbox'],
    // ⚠️ 没有 channel，也没有 executablePath
  }
);
```

| 文件 | 函数 | 行号 | headless | 反检测 | 状态 |
|------|------|------|----------|--------|------|
| `base-crawler.ts` | `run()` | 64-70 | true | 无 | **必定失败** |
| `crawler-service.ts` | `runGigaB2B()` | 81-84 | 可配置 | 无 | **必定失败** |
| `amazon-search-service.ts` | `search()` | 27-41 | 可配置 | 基础 | **必定失败** |
| `amazon-product-service.ts` | `scrape()` | 82-86 | 可配置 | 无 | **必定失败** |
| `xiyouzhaociService.ts` (backend) | `scrapeXiyouzhaociKeywords()` | 207-213 | 可配置 | 无 | **必定失败** |
| `xiyouzhaociService.ts` (frontend) | `scrapeXiyouzhaociKeywords()` | 200-206 | 可配置 | 无 | **必定失败** |
| `open-amazon-url.ts` | `openAmazonUrl()` | 20-25 | false | 基础 | **必定失败** |

#### 机制 2：`chromium.connectOverCDP()` — 1 个生产文件

```typescript
// packages/backend/src/services/chatgpt-file-service.ts:69-119
const data = await fetchCDP('/json/version');
if (data.webSocketDebuggerUrl) {
  const browser = await chromium.connectOverCDP(data.webSocketDebuggerUrl);
  return browser;
}
// 如果没有运行中的 Chrome，自动启动
this.ownProcess = spawn(chromePath, args, { detached: true, stdio: 'ignore' });
```

- **不使用 `launchPersistentContext`**，而是连接到已运行的 Chrome DevTools 协议
- 通过 `child_process.spawn()` 自动启动 Chrome（如果未运行）
- Chrome 路径硬编码（`chatgpt-file-service.ts:312-320`）
- **不受 Playwright 浏览器缺失影响**（因为它启动的是系统 Chrome）

#### 机制 3：`chrome-launcher` + `chrome-remote-interface` — 1 个生产文件

```typescript
// packages/backend/src/services/amazon-search-service-cdp.ts:64-115
const launcher = await launch({
  chromePath: this.chromePath || undefined,
  chromeFlags: [...flags, `--user-data-dir=${userDataDir}`],
  port: 0,
});
const client = await CDP({ port: this.chromePort });
```

- **完全不使用 Playwright**，使用独立的 `chrome-launcher` 和 `chrome-remote-interface` 库
- 有最完善的 Chrome 路径发现机制（`findChromePath()` 检查多个路径）
- **不受 Playwright 浏览器缺失影响**

### 4.3 浏览器 Profile 目录使用情况

| Profile 路径 | 使用文件 | 说明 |
|-------------|---------|------|
| `~/.node-plawright-test/chrome-profile/automation` | `utils.ts`, `amazon-search-service.ts`, `crawler-service.ts`, `chatgpt-file-service.ts` | 主要自动化目录 |
| `~/.node-plawright-test/chrome-profile/stealth` | `utils.ts` (`launchStealth()`) | 隐身模式专用 |
| `~/.node-plawright-test/chrome-profile/file-upload` | `gemini-file-service.ts`, `amazon-product-service.ts`, `crawler-service.ts` | 文件上传专用 |
| `<run-dir>/chrome-profile` | `base-crawler.ts` | 每次爬取独立目录 |
| `./.chrome-data` | `frontend/backend/services/xiyouzhaociService.ts` | 前端本地副本（不同路径） |

### 4.4 Chrome 路径硬编码情况

| 文件 | 行号 | macOS | Windows | Linux |
|------|------|-------|---------|-------|
| `electron/main.ts` | 136-145 | `/Applications/Google Chrome.app/.../Google Chrome` | `C:\Program Files\...\chrome.exe` | `/usr/bin/google-chrome` |
| `chatgpt-file-service.ts` | 312-320 | `/Applications/Google Chrome.app/.../Google Chrome` | `C:\Program Files\...\chrome.exe` | `/usr/bin/google-chrome` |
| `amazon-search-service-cdp.ts` | 36-61 | `/Applications/Google Chrome.app/.../Google Chrome` + Chromium | `C:\Program Files\...\chrome.exe` + `Program Files (x86)` + `AppData\Local` | `/usr/bin/google-chrome` + `chromium-browser` + `chromium` |

**注意**: Chrome 路径在 3 个文件中重复定义，各版本略有不同。`amazon-search-service-cdp.ts` 有最全面的路径列表。

### 4.5 反检测脚本重复情况

反检测（stealth）脚本在至少 **5 个文件**中存在近似重复的实现：

| 文件 | 覆盖项数 | 特殊项 |
|------|---------|--------|
| `utils.ts` `launchStealth()` | 12+ | navigator.webdriver, chrome.runtime, plugins, languages, permissions, __playwright, screen, deviceMemory, hardwareConcurrency |
| `gemini-file-service.ts` | 12+ | 同上 + WebGL 指纹 |
| `amazon-search-service.ts` | 5 | navigator.webdriver, plugins, languages, chrome.runtime, permissions |
| `test-gemini-stealth.ts` | 12+ | 同 `launchStealth()` |
| `amazon-search-service-cdp.ts` | 6 | 通过 CDP `Page.addScriptToEvaluateOnNewDocument` |

---

## 5. Electron 打包流水线分析

### 5.1 构建流程

```
npm run build:mac
  └── npm run build
       ├── npm run build:frontend   → packages/frontend/dist/
       ├── npm run build:backend    → packages/backend/dist/
       └── npm run build:electron
            ├── npx tsc -p tsconfig.json  → dist-electron/
            └── node scripts/build.mjs
                 ├── Copy frontend-dist/   → packages/electron/frontend-dist/
                 ├── Copy backend-dist/    → packages/electron/backend-dist/
                 └── Install backend deps
                      ├── npm install --omit=dev
                      │   └── PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1  ← 跳过浏览器下载
                      ├── Copy node_modules/ → backend-dist/node_modules/
                      └── Copy node_modules/ → backend_dist_node_modules/
  └── npx electron-builder --mac
       ├── Pack into app.asar
       ├── asarUnpack: playwright/**, playwright-core/**
       └── extraResources:
            ├── backend-dist/       → resources/backend-dist/       [重复]
            ├── frontend-dist/      → resources/frontend-dist/      [重复]
            └── backend_dist_node_modules/ → resources/backend_node_modules/  [重复]
```

### 5.2 安装后的文件结构

```
<app>/
├── app.asar                          # (包含:)
│   ├── dist-electron/                # Electron 主进程代码
│   ├── frontend-dist/                # 前端静态文件
│   ├── backend-dist/                 # 后端编译 JS
│   │   ├── api-server.js             # 后端入口
│   │   ├── services/                 # 业务服务
│   │   ├── .env                      # API 密钥
│   │   └── node_modules/             # 后端依赖
│   └── package.json
├── app.asar.unpacked/
│   └── backend-dist/node_modules/
│       ├── playwright/               # ← JS 代码，不是浏览器
│       └── playwright-core/          # ← JS 代码，不是浏览器
└── resources/
    ├── backend-dist/                 # [重复副本]
    ├── frontend-dist/                # [重复副本]
    └── backend_node_modules/         # [重复副本，通过 NODE_PATH 使用]
```

**关键问题**: Playwright 浏览器二进制文件（Chromium, Firefox, WebKit）**不在上述任何位置**。它们正常存储在：
- macOS: `~/Library/Caches/ms-playwright/`
- Windows: `%LOCALAPPDATA%\ms-playwright\`
- Linux: `~/.cache/ms-playwright/`

### 5.3 三重副本冗余

| 内容 | app.asar 内 | app.asar.unpacked | resources/ |
|------|-------------|-------------------|------------|
| backend-dist/ | ✅ | - | ✅ [重复] |
| frontend-dist/ | ✅ | - | ✅ [重复] |
| node_modules/ | ✅ (在 backend-dist/ 内) | playwright 部分 | ✅ [重复] |

`backend-dist/`、`frontend-dist/` 和 `node_modules/` 各存在两份。这意味着如果 Playwright 浏览器被包含进来，理论上也会有类似的双重副本问题。

### 5.4 环境变量传递链

```
Electron 主进程 (main.ts)
  ├── 读取 .env 文件 (API keys)
  ├── 设置 CHROME_DATA_DIR = userData/chrome-profile
  ├── 设置 DATA_DIR = userData
  ├── 设置 NODE_PATH = resources/backend_node_modules
  └── fork 后端进程 (backend-launcher.ts)
       └── 传递上述所有环境变量
```

**缺失**: `PLAYWRIGHT_BROWSERS_PATH` 从未被设置。

---

## 6. 现有设置系统分析

### 6.1 前端设置页面现状

**文件**: `packages/frontend/src/pages/SettingsPage.tsx`

现有 6 个设置区块，只有 2 个有实际功能：

| 区块 | ID | 状态 | 说明 |
|------|-----|------|------|
| 账户设置 | `account` | **纯静态** | 硬编码值，按钮无功能 |
| 工作流默认设置 | `workflow` | **纯静态** | 硬编码值，下拉无功能 |
| API 密钥 | `api` | **纯静态** | 硬编码掩码值，无实际存储 |
| 团队管理 | `team` | **纯静态** | 硬编码值，按钮无功能 |
| 声音设置 | `sound` | **真实功能** | 3 个开关，保存到 localStorage |
| 外观设置 | `appearance` | **真实功能** | 主题切换 + 5 种配色，保存到 localStorage |

页面底部的"保存设置"、"重置"、"删除账户"按钮 **均无功能**（无 onClick 处理器）。

### 6.2 持久化机制现状

| 机制 | 用途 | 位置 |
|------|------|------|
| localStorage `workflow-editor-theme` | 主题模式 + 配色 | 前端 |
| localStorage `workflow-editor-sound` | 声音开关 | 前端 |
| localStorage `plan_cache` | 订阅计划缓存 | 前端 |
| SQLite `crawler_runs` 等 8 张表 | 业务数据 | 后端 |
| `.env` 文件 | API 密钥、数据库配置 | 后端 |

**没有 settings/config 数据库表，没有设置 CRUD API，没有运行时配置修改机制。**

### 6.3 后端 API 现状

32+ 个 API 端点，**无任何设置相关端点**。所有配置通过 `.env` 环境变量在启动时加载，运行时不可修改。

### 6.4 Electron IPC 现状

仅暴露 5 个 API：

| API | 方向 | 用途 |
|-----|------|------|
| `getPlatform()` | 同步 | 返回 `process.platform` |
| `getUserDataPath()` | IPC invoke | 返回用户数据目录 |
| `getChromePath()` | IPC invoke | 返回 Chrome 二进制路径 |
| `openExternal(url)` | 直接 | 打开外部浏览器 |
| `onBackendReady(cb)` | IPC event | 监听后端就绪 |

### 6.5 前端 UI 模式

- **无组件库**: 全部自定义 Tailwind CSS
- **无路由库**: 通过 `useWorkflowState()` 中的 `navActiveId` 状态切换
- **无表单库**: 原生 HTML input/select/checkbox
- **无 Toast 系统**: 使用 `alert()` 处理错误
- **深色模式**: 通过 CSS `.dark` 类覆盖 Tailwind 工具类（200+ 行覆盖规则）
- **标准输入框样式**: `w-full pl-3 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`
- **卡片容器样式**: `bg-white rounded-xl border border-gray-200 overflow-hidden`
- **分隔线样式**: `divide-y divide-gray-50`

---

## 7. 可行性行方案设计

### 7.1 方案对比

| 维度 | 方案 A: 统一使用系统 Chrome | 方案 B: 可配置（推荐） |
|------|---------------------------|----------------------|
| 包体积 | 不增加（~150MB 节省） | 不增加（用户自行下载时） |
| 用户体验 | 简单但受限 | 灵活，用户自主选择 |
| 兼容性 | 依赖用户已装 Chrome | 两种模式都支持 |
| 实现复杂度 | 低（仅修改启动代码） | 中（需设置 UI + API + 下载逻辑） |
| 离线使用 | 不可用 | 可用（下载后） |
| CI/CD 友好 | 是 | 是 |

**结论**: 方案 B 是最佳选择，提供了最大灵活性，且不影响包体积。

### 7.2 方案 B 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    SettingsPage                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          BrowserConfigSection (新增)              │  │
│  │                                                   │  │
│  │  ○ 系统 Chrome    ○ Playwright Chromium           │  │
│  │                                                   │  │
│  │  Chrome 状态: ✅ 已检测到 /path/to/chrome          │  │
│  │                                                   │  │
│  │  Chromium 路径: [_____________] [保存]            │  │
│  │  [下载 Chromium]  ████████░░ 80%  [测试浏览器]     │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │ fetch()
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (api-server.ts)                │
│  GET  /api/settings/browser        → 获取配置 + 状态    │
│  PUT  /api/settings/browser        → 更新配置           │
│  POST /api/settings/browser/download → 下载 Chromium (SSE)│
│  POST /api/settings/browser/test    → 测试浏览器启动     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│          BrowserConfig Singleton (新增)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  getLaunchOptions()                             │    │
│  │  ├─ system-chrome   → { channel: 'chrome' }     │    │
│  │  └─ playwright      → { executablePath, env }   │    │
│  │                                                 │    │
│  │  checkChromeExists()     checkPlaywrightStatus() │    │
│  │  downloadPlaywrightChromium()                    │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ SQLite       │  │ utils.ts     │  │ 9 个服务文件  │
│ settings 表  │  │ launch*()    │  │ ...launchOpts │
│ (持久化)     │  │ (集中配置)   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 7.3 核心设计原则

1. **单一修改点**: 所有浏览器启动代码通过 `browserConfig.getLaunchOptions()` 获取配置，不直接硬编码 `channel` 或路径
2. **向后兼容**: 默认使用 `system-chrome` 模式，不影响现有行为
3. **优雅降级**: 如果 Playwright Chromium 路径无效，自动回退到系统 Chrome 并记录警告
4. **最小侵入**: 每个文件的修改仅 2-3 行（import + spread）
5. **KISS**: 不引入新依赖，复用现有的 SQLite、fetch、Tailwind 模式

---

## 8. 实施步骤详解

### Step 1: SQLite Schema — 添加 settings 表

**修改文件**: `packages/backend/src/core/drivers/sqlite-driver.ts`

在 `SQLITE_SCHEMA` 常量末尾（第 133 行之前）添加：

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

版本迁移逻辑（第 171-175 行）：

```typescript
// 之前:
if (version < 1) {
  this.db.exec(SQLITE_SCHEMA);
  this.db.pragma('user_version = 1');
}

// 之后:
if (version < 2) {
  this.db.exec(SQLITE_SCHEMA);
  this.db.pragma('user_version = 2');
}
```

**修改文件**: `packages/backend/src/core/database-service.ts`

添加 3 个方法：`getSetting(key)`, `setSetting(key, value)`, `getAllSettings()`。

### Step 2: BrowserConfig 单例服务

**新建文件**: `packages/backend/src/core/browser-config.ts`

```typescript
export type BrowserMode = 'system-chrome' | 'playwright-chromium';

export interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
  configured: boolean;
}

export interface LaunchOptions {
  channel?: 'chrome';
  executablePath?: string;
  env?: Record<string, string>;
}

class BrowserConfigSingleton {
  // 内存缓存，首次访问时从 DB 加载
  private cached: BrowserSettings | null = null;

  async getConfig(): Promise<BrowserSettings> { ... }
  async updateConfig(patch: Partial<BrowserSettings>): Promise<BrowserSettings> { ... }
  async getLaunchOptions(): Promise<LaunchOptions> { ... }
  checkChromeExists(): { exists: boolean; path: string } { ... }
  checkPlaywrightStatus(path: string): { installed: boolean; executablePath: string | null; version: string | null } { ... }
  async downloadPlaywrightChromium(path: string, onProgress?: (p: { percent: number; stage: string }) => void): Promise<{ success: boolean; error?: string }> { ... }
}

export const browserConfig = new BrowserConfigSingleton();
```

**`getLaunchOptions()` 核心逻辑**:

```typescript
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
```

**Chrome 路径检测** (整合自 `amazon-search-service-cdp.ts` 的最完善版本):

```typescript
checkChromeExists(): { exists: boolean; path: string } {
  const paths: Record<string, string[]> = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
  };

  for (const p of paths[process.platform] || []) {
    if (fs.existsSync(p)) return { exists: true, path: p };
  }
  return { exists: false, path: '' };
}
```

**下载 Chromium** (使用 `playwright install` CLI):

```typescript
async downloadPlaywrightChromium(targetPath: string, onProgress?: (...) => void) {
  const playwrightCLI = require.resolve('playwright/cli');
  const child = spawn(process.execPath, [playwrightCLI, 'install', 'chromium'], {
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: targetPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // 解析 stdout/stderr 获取下载进度，通过 onProgress 回调
}
```

### Step 3: Backend API 端点

**修改文件**: `packages/backend/src/api-server.ts`

添加 4 个端点：

```
GET  /api/settings/browser         → { settings, status: { chrome, playwright } }
PUT  /api/settings/browser         → 更新 mode / playwrightPath
POST /api/settings/browser/download → SSE 流式下载进度
POST /api/settings/browser/test     → 测试启动，返回浏览器版本
```

下载端点使用 Server-Sent Events 实时报告进度：

```typescript
app.post('/api/settings/browser/download', async (c) => {
  const { path: targetPath } = await c.req.json();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        const result = await browserConfig.downloadPlaywrightChromium(targetPath, send);
        // 下载成功后自动更新配置
        if (result.success) await browserConfig.updateConfig({ mode: 'playwright-chromium', playwrightPath: targetPath });
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
  );
});
```

### Step 4: 集中浏览器启动配置（9 个文件）

**修改模式**（每个文件 2-3 行变更）：

```typescript
// 之前:
const context = await chromium.launchPersistentContext(dataDir, {
  channel: 'chrome',  // 硬编码
  headless: false,
  args: [...],
});

// 之后:
import { browserConfig } from '../core/browser-config';
// ...
const launchExtras = await browserConfig.getLaunchOptions();
const context = await chromium.launchPersistentContext(dataDir, {
  ...launchExtras,     // ← 来自配置：channel 或 executablePath
  headless: false,
  args: [...],
});
```

**需修改的 9 个文件**:

| # | 文件 | 函数 | 当前 channel | 变更行数 |
|---|------|------|-------------|---------|
| 1 | `backend/src/utils.ts` | `launchPersistent()` | `'chrome'` | +2 |
| 2 | `backend/src/utils.ts` | `launchStealth()` | `'chrome'` | +2 |
| 3 | `backend/src/crawlers/base-crawler.ts` | `run()` | 无（失败） | +3 |
| 4 | `backend/src/services/crawler-service.ts` | `runGigaB2B()` | 无（失败） | +3 |
| 5 | `backend/src/services/amazon-search-service.ts` | `search()` | 无（失败） | +3 |
| 6 | `backend/src/services/amazon-product-service.ts` | `scrape()` | 无（失败） | +3 |
| 7 | `backend/src/services/xiyouzhaociService.ts` | `scrapeXiyouzhaociKeywords()` | 无（失败） | +3 |
| 8 | `backend/src/services/gemini-file-service.ts` | `launchBrowser()` | `'chrome'` | +2 |
| 9 | `frontend/backend/services/xiyouzhaociService.ts` | `scrapeXiyouzhaociKeywords()` | 无（失败） | +3 |

**不修改的文件**（不同的启动机制）:
- `chatgpt-file-service.ts` — 使用 CDP `connectOverCDP()` + `spawn()`
- `amazon-search-service-cdp.ts` — 使用 `chrome-launcher` + `chrome-remote-interface`
- `utils.ts` 中的 `connectCDP()` — CDP 连接帮助函数
- 所有 `test-*.ts` 脚本 — 开发用独立脚本

### Step 5: 前端 Hook

**新建文件**: `packages/frontend/src/hooks/useBrowserSettings.tsx`

```typescript
// 遵循 useSoundSettings.tsx 的模式
export function BrowserSettingsProvider({ children }) { ... }
export function useBrowserSettings() { ... }
// 返回: { settings, chromeStatus, playwrightStatus, loading, refresh, updateSettings, downloadPlaywright, testBrowser }
```

### Step 6: SettingsPage 浏览器配置区块

**修改文件**: `packages/frontend/src/pages/SettingsPage.tsx`

在 `SoundSection` 和 `AppearanceSection` 之间插入 `BrowserConfigSection`。

UI 结构（遵循现有卡片模式）：

```
┌─────────────────────────────────────────────────┐
│ 🌐 浏览器配置                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  浏览器模式                                      │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ ● 系统 Chrome    │  │ ○ Playwright    │      │
│  │   (推荐)        │  │   Chromium      │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│  系统 Chrome 状态                                │
│  ✅ 已检测到 /Applications/Google Chrome.app/... │
│                                                 │
│  ── 以下仅在 Playwright 模式下显示 ──            │
│                                                 │
│  Chromium 安装路径                               │
│  [~/ms-playwright_________________________] [保存]│
│                                                 │
│  下载状态                                       │
│  [下载 Chromium]  ████████████░░░░ 80%           │
│  ✅ Chromium 已安装 (版本: 124.0.6367.91)        │
│                                                 │
│  [测试浏览器连接]                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

- 在 `SectionIcon.paths` 中添加 `'browser'` 键（地球/显示器 SVG）
- 所有文本使用中文，匹配现有 UI 风格
- 使用标准输入框类名和卡片容器类名
- 深色模式自动生效（CSS `.dark` 覆盖已包含 `bg-white`, `border-gray-200`, `text-gray-900` 等）

### Step 7: Provider 注册

**修改文件**: `packages/frontend/src/App.tsx`

```tsx
// 之前:
<PlanProvider wsUrl={WS_URL}>
  <SoundProvider>
    <AppContent />
  </SoundProvider>
</PlanProvider>

// 之后:
<PlanProvider wsUrl={WS_URL}>
  <SoundProvider>
    <BrowserSettingsProvider>
      <AppContent />
    </BrowserSettingsProvider>
  </SoundProvider>
</PlanProvider>
```

### Step 8: Electron 构建兼容性

**无需修改**:
- `electron-builder.yml` — `asarUnpack` 已处理 playwright 包
- `electron/main.ts` — 后端通过 HTTP API 访问，无需新 IPC
- `electron/preload.ts` — 无需新 IPC 通道
- `scripts/build.mjs` — `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 保持不变

---

## 9. 风险评估与缓解

### 9.1 技术风险

| 风险 | 严重度 | 可能性 | 缓解措施 |
|------|--------|--------|---------|
| Playwright 可执行路径检测失败（版本间目录名变化） | 中 | 中 | 提供测试按钮验证 + 回退到系统 Chrome |
| Chromium 下载过程中网络中断 | 低 | 中 | 支持重试下载 + 错误提示 |
| 并发修改配置（爬虫运行中用户切换模式） | 低 | 低 | 已运行的浏览器实例不受影响，仅影响新启动 |
| SQLite 迁移失败（旧版本数据库） | 低 | 极低 | 使用 `CREATE TABLE IF NOT EXISTS`，幂等操作 |
| 磁盘空间不足（Chromium ~200-400MB） | 中 | 低 | 下载前检查可用空间 |

### 9.2 兼容性风险

| 风险 | 缓解措施 |
|------|---------|
| `frontend/backend/services/xiyouzhaociService.ts` 无 DB 访问 | BrowserConfig 增加 env var 回退（`BROWSER_MODE`, `BROWSER_PLAYWRIGHT_PATH`） |
| CDP 服务不受 BrowserConfig 影响 | 在设置 UI 中注明：ChatGPT 上传服务始终使用系统 Chrome |
| 深色模式下新增 UI 元素样式问题 | 复用已有 Tailwind 类名，`.dark` 覆盖已全面 |
| Electron 打包后 Chromium 下载路径权限 | `PLAYWRIGHT_BROWSERS_PATH` 指向用户指定目录，不受 asar 影响 |

---

## 10. 文件变更清单

### 新建文件（3 个）

| 文件 | 说明 |
|------|------|
| `packages/backend/src/core/browser-config.ts` | BrowserConfig 单例（~200 行） |
| `packages/frontend/src/hooks/useBrowserSettings.tsx` | 前端 Hook + Provider（~120 行） |

### 修改文件（12 个）

| 文件 | 变更说明 | 变更量 |
|------|---------|--------|
| `packages/backend/src/core/drivers/sqlite-driver.ts` | 添加 settings 表 + 版本迁移 | +10 行 |
| `packages/backend/src/core/database-service.ts` | 添加 getSetting/setSetting/getAllSettings | +25 行 |
| `packages/backend/src/api-server.ts` | 添加 4 个 API 端点 | +80 行 |
| `packages/backend/src/utils.ts` | 2 个函数使用 browserConfig | +4 行 |
| `packages/backend/src/crawlers/base-crawler.ts` | 使用 browserConfig | +3 行 |
| `packages/backend/src/services/crawler-service.ts` | 使用 browserConfig | +3 行 |
| `packages/backend/src/services/amazon-search-service.ts` | 使用 browserConfig | +3 行 |
| `packages/backend/src/services/amazon-product-service.ts` | 使用 browserConfig | +3 行 |
| `packages/backend/src/services/xiyouzhaociService.ts` | 使用 browserConfig | +3 行 |
| `packages/backend/src/services/gemini-file-service.ts` | 使用 browserConfig | +2 行 |
| `packages/frontend/src/pages/SettingsPage.tsx` | 添加 BrowserConfigSection | +120 行 |
| `packages/frontend/src/App.tsx` | 注册 BrowserSettingsProvider | +3 行 |

### 可选修改（1 个）

| 文件 | 说明 |
|------|------|
| `packages/frontend/backend/services/xiyouzhaociService.ts` | 前端本地副本，如需在 Electron 外使用 |

### 总变更量估算

- **新增代码**: ~550 行
- **修改代码**: ~50 行（主要是 spread 替换）
- **新建文件**: 2 个
- **修改文件**: 12 个
