# AI CrossBorder Pro - 启动状态报告

**生成时间：** 2026-05-17  
**项目状态：** ✅ 运行中

---

## 🚀 服务状态

### ✅ 后端服务
- **状态：** 运行中
- **URL：** http://localhost:3456
- **健康检查：** ✅ 通过
- **主要路由：**
  - `GET /api/health` - 健康检查
  - `POST /api/crawl/gigab2b` - GigaB2B 爬虫
  - `POST /api/search/amazon` - Amazon 搜索
  - `POST /api/scrape/amazon-product` - Amazon 产品抓取
  - `POST /api/keywords/xiyouzhaoci` - 西柚找词
  - `POST /api/gemini/upload` - Gemini AI 上传
  - `POST /api/chatgpt/upload` - ChatGPT AI 上传
  - `POST /api/ai/optimize` - AI 优化

### ✅ 前端服务
- **状态：** 运行中
- **URL：** http://localhost:5173
- **健康检查：** ✅ 通过
- **技术栈：** React + Vite + TypeScript + Tailwind CSS

---

## 📊 当前系统配置

### 后端配置
```bash
端口: 3456
数据库: 未连接 (db: false)
AI服务: 未配置 (ai: false)
```

### 前端配置
```bash
端口: 5173
代理: /api -> http://localhost:3456
```

---

## 🧪 可用的测试脚本

### Amazon 搜索服务测试
```bash
cd packages/backend

# Playwright 版本（推荐）
npx tsx test-playwright-amazon-search.ts

# CDP 版本（实验性）
npx tsx test-cdp-amazon-search.ts

# 打开 Amazon URL 检查
npx tsx open-amazon-url.ts
```

### 其他测试
```bash
cd packages/backend

# ChatGPT 测试
npm run test:chatgpt

# Gemini 测试
npm run test:gemini:simple

# Xiyouzhaoci 测试
npm run test:xiyouzhaoci
```

---

## 🔧 浏览器配置

### 统一数据目录
所有浏览器服务使用统一的用户数据目录：
```
C:\Users\admin\.node-plawright-test\chrome-profile\automation
```

### 首次使用
1. 运行任意测试脚本
2. 在打开的浏览器中完成登录
3. 登录状态会自动保存
4. 后续所有服务共享登录状态

---

## 📝 项目结构

```
ai-crossborder-pro/
├── packages/
│   ├── backend/          # 后端 API 服务
│   │   ├── src/
│   │   │   ├── api-server.ts
│   │   │   ├── services/
│   │   │   │   ├── amazon-search-service.ts
│   │   │   │   └── amazon-search-service-cdp.ts
│   │   │   └── ...
│   │   ├── test-playwright-amazon-search.ts
│   │   ├── test-cdp-amazon-search.ts
│   │   └── open-amazon-url.ts
│   └── frontend/         # 前端 React 应用
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   ├── pages/
│       │   └── ...
│       └── ...
└── package.json
```

---

## 🛠️ 常用命令

### 启动服务
```bash
# 启动所有服务
npm run dev

# 单独启动后端
npm run dev:backend

# 单独启动前端
npm run dev:frontend
```

### 停止服务
```bash
# 停止后端
lsof -ti:3456 | xargs kill -9

# 停止前端
lsof -ti:5173 | xargs kill -9
```

---

## ⚠️ 注意事项

1. **端口占用：** 确保 3456 和 5173 端口未被占用
2. **浏览器登录：** 首次使用需要手动登录相关服务
3. **数据库配置：** 当前数据库未连接，需要配置 PostgreSQL
4. **AI 服务：** 需要配置相应的 API 密钥

---

## 📞 支持

如有问题，请检查：
1. 后端日志：查看终端输出
2. 前端日志：查看浏览器控制台
3. 网络连接：确保能访问目标网站
4. 依赖安装：运行 `npm install`

---

**系统状态：** ✅ 所有服务正常运行  
**访问地址：** http://localhost:5173