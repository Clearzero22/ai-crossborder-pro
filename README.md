# AI CrossBorder Pro

AI 跨境电商自动化工作台 — 基于可视化工作流 + Playwright 浏览器自动化 + AI 能力，实现 Amazon 竞品搜索、商品文案优化、关键词挖掘等自动化流程。

## 功能特性

- **可视化工作流编辑器** — 拖拽节点编排自动化流程
- **Amazon 竞品搜索** — 通过 Playwright 控制真实 Chrome 浏览器搜索 Amazon，获取竞品 ASIN 列表（含反自动化检测绕过）
- **Amazon 商品抓取** — 抓取商品详情、图片、评价等数据
- **AI 商品文案优化** — 接入通义千问 / Gemini / ChatGPT，AI 生成/优化商品 Listing
- **西柚找词关键词挖掘** — 自动抓取 Amazon 搜索排名关键词
- **GigaB2B 爬虫** — B2B 平台数据抓取
- **Windows 安装包** — NSIS 一键安装

## 技术栈

| 层 | 技术 |
|---|---|
| **前端** | React 18 + TypeScript + Vite + Tailwind CSS |
| **后端** | Hono + TypeScript + tsx (热重载) |
| **浏览器自动化** | Playwright (控制真实 Chrome) |
| **AI** | 通义千问 (DashScope)、Google Gemini、ChatGPT |
| **桌面壳** | Electron |
| **数据库** | PostgreSQL (可选) |
| **打包** | electron-builder (NSIS / DMG / AppImage) |
| **包管理** | npm workspaces (Monorepo) |

## 项目结构

```
ai-crossborder-pro/
├── packages/
│   ├── frontend/          # React 前端 + 工作流编辑器
│   ├── backend/           # Hono API 服务器 + Playwright 自动化
│   └── electron/          # Electron 桌面壳 + 安装包构建
├── package.json           # Monorepo 根配置
└── packages/electron/release/   # 构建产物（安装包）
```

## 快速开始

### 前置要求

- Node.js 18+
- Google Chrome（已安装，Playwright 将调用它）
- Windows 10/11 或 macOS

### 安装依赖

```bash
npm install
```

### 配置环境变量

在 `packages/backend/.env` 中设置：

```env
PORT=3000
DASHSCOPE_API_KEY=your_api_key_here
```

### 启动开发环境

```bash
npm run dev
```

这将同时启动：
- **前端** — http://localhost:5173 (Vite 热重载)
- **后端** — http://localhost:3000 (tsx watch 热重载)
- **Electron** — 桌面窗口

### 单独启动

```bash
# 仅前端
npm run dev:frontend

# 仅后端
npm run dev:backend

# 仅 Electron
npm run dev:electron
```

## 构建安装包

### Windows NSIS 安装包

```bash
npm run build:win
```

输出：`packages/electron/release/AI-CrossBorder-Pro-<version>-win-x64-setup.exe`

### macOS DMG

```bash
npm run build:mac
```

### Linux AppImage / deb

```bash
npm run build:linux
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/crawl/gigab2b` | GigaB2B 爬虫 |
| GET | `/api/runs` | 运行记录列表 |
| POST | `/api/ai/recognize` | AI 图片识别 |
| POST | `/api/ai/compare` | AI 多图对比 |
| POST | `/api/search/amazon` | Amazon 竞品搜索 |
| POST | `/api/scrape/amazon-product` | Amazon 商品详情抓取 |
| POST | `/api/keywords/xiyouzhaoci` | 西柚找词关键词 |
| POST | `/api/gemini/upload` | Gemini 文件上传 |
| POST | `/api/chatgpt/upload` | ChatGPT 文件上传 |
| POST | `/api/ai/optimize` | AI 文案优化 |

## 浏览器自动化说明

本项目使用 Playwright `launchPersistentContext` + `channel: 'chrome'` 调用用户已安装的 **真实 Chrome 浏览器**（非 headless shell），以绕过 Amazon 等网站的反自动化检测。

关键反检测措施：
- 自定义 User-Agent（去掉 `HeadlessChrome` 前缀）
- `ignoreDefaultArgs: ['--enable-automation']` 去除自动化标记
- 通过 `addInitScript` 隐藏 `navigator.webdriver` 等 Playwright 特征
- 自动处理 Amazon "Continue shopping" 验证页面

## 故障排查

**端口被占用（Windows）**：
Windows Hyper-V 可能保留部分端口范围（如 3377-3476）。项目默认使用端口 3000，如仍冲突可通过 `packages/backend/.env` 修改 `PORT`。

**Playwright 找不到 Chrome**：
确保系统已安装 Google Chrome。Playwright 通过 `channel: 'chrome'` 自动查找已安装的 Chrome。

**浏览器 SingletonLock 冲突**：
多个 Playwright 实例不能共享同一 Profile 目录。本项目为不同功能使用不同的 Profile 子目录（如 `amazon-search-profile`）。

**electron-builder 报错 "Cannot compute electron version"**：
在 monorepo 中，需确保 `packages/electron` 目录下有 `node_modules` 软链接指向根目录的 `node_modules`。

## License

MIT
