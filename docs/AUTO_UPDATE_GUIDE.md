# Auto-Update 功能文档

## 概述

应用内置自动更新机制，基于 `electron-updater` + GitHub Releases 实现。启动时自动检查更新，发现新版本后在页面顶部显示通知条，用户可一键下载安装。设置页面也提供手动检查更新入口。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Electron 主进程                         │
│                                                         │
│  updater.ts                                             │
│    ├── autoUpdater.checkForUpdates()                    │
│    │       ↓ GitHub Releases API                        │
│    │       ↓ 读取 latest.yml 比较版本号                    │
│    │                                                    │
│    ├── update-available → IPC → 渲染进程（通知条/设置页）   │
│    ├── download-progress → IPC → 渲染进程（进度条）        │
│    ├── update-downloaded → IPC → 渲染进程（重启安装按钮）  │
│    └── update-not-available → IPC → 渲染进程（已是最新）   │
│                                                         │
│  main.ts                                                │
│    ├── IPC handlers: skip-version, download-update,      │
│    │   install-update, check-for-updates, get-current-version │
│    └── initAutoUpdater(window) 在三个路径中调用            │
│        ├── dev 模式（直接启动）                           │
│        ├── prod 成功路径（后端就绪后）                     │
│        └── prod catch 路径（后端启动失败时）               │
│                                                         │
│  preload.ts                                             │
│    └── contextBridge 暴露 8 个更新相关 API                 │
└─────────────────────────────────────────────────────────┘
                           ↓ IPC
┌─────────────────────────────────────────────────────────┐
│                     渲染进程（前端）                        │
│                                                         │
│  UpdateNotifier.tsx（固定顶部通知条）                     │
│    ├── 发现新版本 → [立即更新] [稍后提醒]                  │
│    ├── 下载中   → 进度条 xx%                             │
│    └── 下载完成 → [重启安装] [稍后安装]                    │
│                                                         │
│  SoftwareUpdateSection.tsx（设置页区块）                  │
│    ├── 显示当前版本号                                    │
│    ├── [检查更新] 按钮 → 手动触发检查                     │
│    ├── 发现新版本 → [下载更新]                            │
│    ├── 下载中   → 进度条                                 │
│    └── 下载完成 → [重启并安装]                            │
└─────────────────────────────────────────────────────────┘
```

## 文件清单

| 文件 | 说明 |
|------|------|
| `packages/electron/electron/updater.ts` | 核心更新逻辑：检查、下载、安装、忽略版本 |
| `packages/electron/electron/main.ts` | IPC handlers，三个启动路径中初始化更新 |
| `packages/electron/electron/preload.ts` | contextBridge 暴露更新 API |
| `packages/electron/electron-builder.yml` | publish 配置 + releaseType |
| `packages/frontend/src/components/UpdateNotifier.tsx` | 顶部通知条组件 |
| `packages/frontend/src/components/SoftwareUpdateSection.tsx` | 设置页更新区块 |
| `packages/frontend/src/components/Layout.tsx` | 挂载 UpdateNotifier |
| `packages/frontend/src/pages/SettingsPage.tsx` | 挂载 SoftwareUpdateSection |
| `packages/frontend/src/vite-env.d.ts` | ElectronAPI 类型定义 |

## IPC 通道

| 通道名 | 方向 | 数据 | 说明 |
|--------|------|------|------|
| `update-available` | Main → Renderer | `{ version, releaseNotes, releaseDate }` | 通知有新版本 |
| `update-not-available` | Main → Renderer | 无 | 已是最新版本 |
| `update-download-progress` | Main → Renderer | `{ percent, transferred, total, speed }` | 下载进度 |
| `update-downloaded` | Main → Renderer | `{ version }` | 下载完成 |
| `skip-version` | Renderer → Main | `{ version: string }` | 忽略某版本 |
| `download-update` | Renderer → Main | 无 | 触发下载 |
| `install-update` | Renderer → Main | 无 | 重启并安装 |
| `check-for-updates` | Renderer → Main | 无 | 手动触发检查 |
| `get-current-version` | Renderer ↔ Main | `string` | 获取当前版本号 |

## 版本忽略机制

用户点击"稍后提醒"或"忽略此版本"后，版本号会持久化到 `app.getPath('userData')/update-config.json`：

```json
{
  "skippedVersion": "1.0.1"
}
```

下次启动时，如果 GitHub 上的最新版本等于已忽略的版本，不会显示通知。

## 发布流程

### 前置条件

1. **GitHub Token** — Fine-grained Personal Access Token，权限：
   - Repository access: `Clearzero22/ai-crossborder-pro`（Only select repositories）
   - Permissions: **Contents** → **Read and write**
2. **版本号递增** — 每次发布必须比上次版本号高（`1.0.0` → `1.0.1` → `1.0.2`）

### 发布步骤

```bash
# 1. 设置 Token（只需设置一次，新开终端需重新设置）
set GH_TOKEN=github_pat_xxxxxxxxxxxx

# 2. 修改版本号
# 编辑 packages/electron/package.json，将 version 改为新版本号

# 3. 执行发布（构建 + 打包 + 上传到 GitHub Releases）
npm run publish:win      # Windows
npm run publish:mac      # macOS
npm run publish:linux    # Linux
```

### 发布后自动生成

| 文件 | 说明 |
|------|------|
| `latest.yml` | 版本信息、文件哈希、下载链接（electron-updater 检查更新时读取） |
| `*.exe.blockmap` | 增量更新映射文件（支持差量下载） |
| `AI-CrossBorder-Pro-x.x.x-win-x64-setup.exe` | Windows NSIS 安装包 |

### 注意事项

- `releaseType: release` 已配置，发布的 Release 直接为正式版（非草稿）
- 私有仓库需要 `GH_TOKEN` 才能访问 GitHub Releases API
- 构建产物输出目录为 `packages/electron/release6/`

## 用户端更新流程

### 自动更新（启动时检查）

```
应用启动
  │
  ├── 检查 GitHub Releases (latest.yml)
  │     │
  │     ├── 有新版本 → 页面顶部显示蓝色通知条
  │     │     ├── [立即更新] → 后台下载 → 显示进度条
  │     │     │                  → 下载完成 → [重启安装] → 退出并安装
  │     │     └── [稍后提醒] → 隐藏通知，下次启动再提醒
  │     │
  │     └── 已是最新 → 静默，无任何提示
  │
  └── 网络失败 → 静默，不打扰用户
```

### 手动更新（设置页面）

```
设置页 → 软件更新区块
  │
  ├── [检查更新] → 调用主进程 checkForUpdates()
  │     │
  │     ├── 有新版本 → 显示版本号 + [下载更新]
  │     ├── 已是最新 → 显示 "已是最新版本"
  │     └── 超时 15 秒 → 显示 "已是最新版本"
  │
  ├── [下载更新] → 后台下载 + 进度条
  └── [重启并安装] → 退出应用并安装新版本
```

## 开发模式

开发模式下（`npm run dev`）更新功能也可用，但需要：

```bash
set GH_TOKEN=github_pat_xxxxxxxxxxxx
npm run dev
```

配置说明：
- `forceDevUpdateConfig = true` — 强制 dev 模式也执行更新检查
- `setFeedURL()` — dev 模式下手动配置 GitHub provider（因为没有 `app-update.yml`）
- `autoDownload = false` — 不自动下载，需要用户手动触发
- `autoInstallOnAppQuit = true` — 退出时如果有已下载的更新会自动安装

## 错误处理

所有错误均为静默处理（日志输出到控制台，不打扰用户）：

| 错误场景 | 行为 |
|----------|------|
| 网络不可达 | 静默，仅控制台 `[AutoUpdate] Error` 日志 |
| GitHub API 限流 | 静默，下次启动重试 |
| Token 过期/无效 | 静默 |
| 下载失败 | 静默，用户可手动重新触发 |
| 私有仓库无权限 | 静默 |

## 故障排查

### 问题：启动时没有看到更新通知

1. 确认 GitHub 上有正式 Release（非 draft），且版本号高于本地 `package.json`
2. dev 模式下确认设置了 `GH_TOKEN` 环境变量
3. 查看终端（不是 DevTools）中 `[AutoUpdate]` 日志
4. 检查是否之前点击过"稍后提醒"，删除 `userData/update-config.json` 可重置

### 问题：发布后 GitHub Releases 页面没有 Release

1. 确认 `GH_TOKEN` 有 `Contents: Read and write` 权限
2. 确认 `electron-builder.yml` 中 `releaseType: release` 已配置
3. 查看构建日志中是否有 `creating GitHub release` 字样

### 问题：dev 模式报 "No published versions on GitHub"

1. 确认 Release 不是 draft 状态
2. 确认 Token 有权访问私有仓库

### 问题：设置页"检查更新"按钮一直转圈

1. 查看终端是否有 `[AutoUpdate] Error` 日志
2. 可能是网络问题，15 秒后会自动超时显示"已是最新版本"
