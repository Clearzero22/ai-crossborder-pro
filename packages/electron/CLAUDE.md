## 📦 Electron 包详细分析

### 架构概览

这个 Electron 包是一个**桌面应用壳**，它将前端、后端和 Electron 环境整合在一起。

---

### 📁 核心文件分析

#### 1. `package.json` - 项目配置

```json
{
  "name": "@ai-crossborder/electron",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "npm run dev:electron",           // 开发模式
    "build:electron": "npx tsc -p tsconfig.json",
    "dev:electron": "npm run build:electron && electron .",
    "build": "npm run build:electron && node scripts/build.mjs"
  },
  "dependencies": {
    "electron-is-dev": "^2.0.0",
    "@ai-crossborder/backend": "*",         // 本地 monorepo 依赖
    "@ai-crossborder/frontend": "*"         // 本地 monorepo 依赖
  }
}
```

**特点：**
- 使用 monorepo 工作空间，依赖本地的 `backend` 和 `frontend` 包
- 构建流程通过 `scripts/build.mjs` 自定义脚本完成

---

#### 2. `electron/main.ts` - 主进程入口

**核心功能：**

| 功能 | 实现 |
|------|------|
| **窗口创建** | 1440x900 窗口，Mac 支持隐藏标题栏 |
| **开发模式** | 加载 `http://localhost:5173`（Vite 开发服务器） |
| **生产模式** | 启动后端服务，然后加载后端服务的 URL |
| **IPC 处理** | 提供系统信息（用户数据目录、Chrome 路径） |
| **生命周期** | 管理窗口关闭、应用退出、后端进程清理 |

**关键代码片段：**

```typescript
// 生产模式启动流程
async function onReady(): Promise<void> {
  if (isDev) {
    createWindow();  // 开发模式直接启动
    return;
  }

  // 生产模式：启动后端服务
  startBackend(backendDistDir, {
    PORT: '3456',
    CHROME_DATA_DIR: chromeDataDir,
    DATA_DIR: dataDir,
    FRONTEND_DIR: frontendDistDir,
    NODE_ENV: 'production',
  });

  await waitForReady(port, 30000);  // 等待后端就绪
  createWindow();
}
```

---

#### 3. `electron/preload.ts` - 预加载脚本

暴露给渲染进程的 API：

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => process.platform,                          // 获取平台
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'), // 用户数据目录
  getChromePath: () => ipcRenderer.invoke('get-chrome-path'),   // Chrome 路径
  openExternal: (url: string) => shell.openExternal(url),       // 打开外部链接
  onBackendReady: (callback: () => void) => { ... }             // 后端就绪事件
});
```

**安全特点：**
- `contextIsolation: true` - 上下文隔离
- `nodeIntegration: false` - 禁用 Node.js 集成
- 只暴露必要的 API

---

#### 4. `electron/backend-launcher.ts` - 后端进程管理器

负责在 Electron 内部启动和管理后端服务：

| 功能 | 说明 |
|------|------|
| `startBackend()` | 使用 `child_process.fork()` 启动后端进程 |
| `waitForReady()` | 轮询 `/api/health` 端点，等待后端就绪 |
| `stopBackend()` | 优雅退出（SIGTERM），5秒后强制退出（SIGKILL） |
| `healthCheck()` | 健康检查 HTTP 请求 |

**关键代码：**

```typescript
export function startBackend(backendDistDir: string, env: Record<string, string>): void {
  const entryPath = path.join(backendDistDir, 'api-server.js');
  
  backendProcess = fork(entryPath, [], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],  // IPC 通信
  });
  
  // 管道输出到 Electron 控制台
  backendProcess.stdout?.on('data', data => {
    console.log(`[Backend] ${data}`);
  });
}
```

---

#### 5. `scripts/build.mjs` - 自定义构建脚本

**构建流程（4个步骤）：**

```
1. Build Frontend → npm run build (frontend)
2. Build Backend → npm run build (backend)
3. Copy Artifacts → 复制 dist 到 electron 目录
4. Copy node_modules → 复制后端依赖到打包目录
```

**重要路径配置：**

```javascript
const rootDir = path.join(__dirname, '..', '..');      // monorepo 根目录
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

const frontendDistDir = path.join(electronDir, 'frontend-dist');
const backendDistDir = path.join(electronDir, 'backend-dist');
```

---

#### 6. `electron-builder.yml` - 打包配置

**打包文件结构：**
```
release/
├── frontend-dist/     → 前端构建产物
├── backend-dist/      → 后端构建产物
└── dist-electron/     → Electron 主进程代码
```

**关键配置：**

```yaml
asarUnpack:            # 解压出来的文件（Playwright 必须解压）
  - backend-dist/node_modules/playwright/**
  - backend-dist/node_modules/playwright-core/**

extraResources:
  - from: backend-dist
    to: backend-dist
  - from: backend_dist_node_modules
    to: backend_node_modules
```

**平台支持：**
- **macOS** → DMG 格式
- **Windows** → NSIS 安装包（支持选择目录）
- **Linux** → AppImage + DEB 包

---

### 🎯 工作流程

#### 开发模式
```
┌─────────────────────────────────────┐
│  开发模式                           │
│  1. Vite 服务器 (localhost:5173)  │
│  2. 后端独立运行 (localhost:3456) │
│  3. Electron 加载 Vite URL        │
└─────────────────────────────────────┘
```

#### 生产模式
```
┌─────────────────────────────────────┐
│  生产模式                           │
│  1. Electron 启动                   │
│  2. 启动后端子进程                  │
│  3. 等待 /api/health 返回 200      │
│  4. 加载 http://localhost:3456     │
└─────────────────────────────────────┘
```

---

### 🔑 关键设计特点

| 特点 | 说明 |
|------|------|
| **Monorepo 集成** | 使用本地 workspace 依赖，无需 npm publish |
| **单进程树** | Electron 主进程 → 后端子进程 |
| **健康检查** | 后端就绪检测，避免加载失败 |
| **资源隔离** | 用户数据目录、Chrome 配置目录独立 |
| **Playwright 特殊处理** | 解压到 asar 外，避免二进制问题 |
| **跨平台** | Windows/macOS/Linux 完整支持 |

---

### 📊 依赖关系图

```
@ai-crossborder/electron
  ├── @ai-crossborder/frontend (workspace:*)
  └── @ai-crossborder/backend (workspace:*)
```

---

这个 Electron 包设计得非常完整和专业，是一个很好的桌面应用打包示例！