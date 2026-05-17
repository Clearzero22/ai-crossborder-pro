# AI CrossBorder Pro

跨境电商自动化工作流系统 - Monorepo 项目

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装所有工作区依赖
npm install
```

### 启动开发环境

#### 方式一：同时启动前后端（推荐）

```bash
npm run dev
```

这会同时启动：
- 后端 API 服务：http://localhost:3456
- 前端界面：http://localhost:5173
- Electron 应用（可选）

#### 方式二：分别启动

**终端 1 - 启动后端：**
```bash
npm run dev:backend
```

**终端 2 - 启动前端：**
```bash
npm run dev:frontend
```

### 验证服务

```bash
# 检查后端健康状态
curl http://localhost:3456/api/health

# 检查前端是否可访问
curl http://localhost:5173
```

## 测试脚本

### Amazon 搜索服务测试

```bash
cd packages/backend

# Playwright 版本（推荐，稳定性更高）
npx tsx test-playwright-amazon-search.ts

# CDP 版本（实验性，更底层控制）
npx tsx test-cdp-amazon-search.ts

# 打开 Amazon URL 检查页面
npx tsx open-amazon-url.ts
```

### 其他服务测试

```bash
cd packages/backend

# ChatGPT 相关测试
npm run test:chatgpt
npm run test:chatgpt:upload

# Gemini 相关测试
npm run test:gemini:simple
npm run test:gemini:upload

# 爬虫测试
npm run test:gigab2b
npm run test:xiyouzhaoci
npm run test:bilibili
npm run test:taobao

# Amazon 相关测试
npm run test:amazon:search
npm run test:amazon:product
```

## 项目结构

```
ai-crossborder-pro/
├── packages/
│   ├── backend/              # 后端 API 服务
│   │   ├── src/
│   │   │   ├── api-server.ts
│   │   │   ├── services/
│   │   │   │   ├── amazon-search-service.ts
│   │   │   │   └── amazon-search-service-cdp.ts
│   │   │   └── ...
│   │   ├── test-playwright-amazon-search.ts
│   │   └── open-amazon-url.ts
│   ├── frontend/             # 前端 React 应用
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── ...
│   │   └── ...
│   └── electron/             # Electron 桌面应用
├── package.json
└── SYSTEM_STATUS.md          # 系统运行状态报告
```

## 主要功能

### 后端 API
- Amazon 竞品搜索和产品抓取
- GigaB2B 爬虫
- 西柚找词关键词挖掘
- ChatGPT 和 Gemini AI 集成
- 数据库管理和统计

### 前端界面
- 可视化工作流编辑器
- 数据仪表板
- 执行历史记录
- AI 工具集成

## 浏览器配置

### 统一数据目录

所有浏览器服务使用统一的用户数据目录，实现登录状态共享：

```
~/.node-plawright-test/chrome-profile/automation
```

**Windows 路径：**
```
C:\Users\{用户名}\.node-plawright-test\chrome-profile\automation
```

### 首次使用

1. 运行任意测试脚本
2. 在打开的浏览器中完成登录（如 Google、Amazon 等）
3. 登录状态会自动保存到 `automation` 目录
4. 之后所有服务都能使用这个登录状态

## API 端点

### 健康检查
- `GET /api/health` - 服务健康状态

### Amazon 服务
- `POST /api/search/amazon` - Amazon 竞品搜索
- `POST /api/scrape/amazon-product` - Amazon 产品详情抓取

### 爬虫服务
- `POST /api/crawl/gigab2b` - 执行 GigaB2B 爬虫
- `GET /api/runs` - 运行记录列表
- `GET /api/runs/:id` - 单次运行详情

### AI 服务
- `POST /api/ai/recognize` - AI 图片识别
- `POST /api/ai/compare` - AI 多图对比
- `GET /api/ai/templates` - 预设提示词模板
- `GET /api/ai/results` - 查询 AI 识别结果
- `POST /api/gemini/upload` - Gemini AI 上传
- `POST /api/chatgpt/upload` - ChatGPT AI 上传
- `POST /api/ai/optimize` - AI 优化

### 关键词服务
- `POST /api/keywords/xiyouzhaoci` - 西柚找词关键词挖掘

### 数据库服务
- `GET /api/db/stats` - 数据库统计
- `GET /api/db/runs` - 运行记录
- `GET /api/db/products` - 产品数据
- `GET /api/db/ai-results` - AI 识别结果

## 故障排除

### 端口冲突

```bash
# 查找占用 3456 端口的进程
lsof -ti:3456 | xargs kill -9

# 查找占用 5173 端口的进程
lsof -ti:5173 | xargs kill -9
```

### 登录状态丢失

```bash
# 检查统一目录是否存在
ls -la ~/.node-plawright-test/chrome-profile/automation

# 如果不存在，重新运行任意服务并登录
cd packages/backend
npx tsx open-amazon-url.ts
```

### 依赖问题

```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### Playwright 浏览器未安装

```bash
cd packages/backend
npx playwright install chromium
```

## 技术栈

### 后端
- Node.js + TypeScript
- Hono (Web 框架)
- Playwright (浏览器自动化)
- PostgreSQL (数据库)

### 前端
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts (图表)

### Electron
- Electron 42
- Electron Builder (打包)

## 开发命令

```bash
# 开发
npm run dev                  # 启动所有服务
npm run dev:backend          # 仅启动后端
npm run dev:frontend         # 仅启动前端

# 构建
npm run build                # 构建所有包
npm run build:win            # 构建 Windows 版本
npm run build:mac            # 构建 Mac 版本
npm run build:linux          # 构建 Linux 版本

# 清理
npm run clean                # 清理构建产物
```

## 注意事项

1. **端口占用：** 确保 3456 和 5173 端口未被占用
2. **浏览器登录：** 首次使用需要手动登录相关服务
3. **数据库配置：** 需要配置 PostgreSQL 才能使用完整功能
4. **AI 服务：** 需要配置相应的 API 密钥

## 许可证

本项目为内部项目，仅供授权用户使用。

## 支持

如有问题，请查看：
1. 系统状态报告：`SYSTEM_STATUS.md`
2. 后端文档：`packages/backend/CLAUDE.md`
3. 前端文档：`packages/frontend/CLAUDE.md`
4. 终端日志输出