---

# 📦 Backend 包深度分析

## 🏗️ 整体架构

```
packages/backend/src/
├── api-server.ts          # Hono API 服务器入口
├── core/                  # 核心基础设施
│   ├── database-service.ts  # PostgreSQL 数据层
│   ├── run-context.ts       # 本地文件运行上下文
│   └── types.ts             # 核心类型定义
├── crawlers/             # 爬虫实现
│   ├── base-crawler.ts      # 爬虫基类
│   └── gigab2b/            # GigaB2B 具体爬虫
│       ├── crawler.ts
│       ├── extractor.ts
│       ├── cleaner.ts
│       └── config.ts
├── services/             # 业务服务层
│   ├── ai-vision-service.ts  # 原 AI 视觉服务（即将被 ai-providers 替代）
│   ├── amazon-search-service.ts
│   ├── amazon-product-service.ts
│   ├── crawler-service.ts
│   ├── gemini-file-service.ts
│   ├── chatgpt-file-service.ts
│   └── xiyouzhaoci-service.ts
├── ai-providers/          # 🆕 多 AI 架构（刚才创建）
│   ├── index.ts
│   ├── types.ts
│   ├── base.ts
│   ├── registry.ts
│   ├── ai-router.ts
│   ├── templates.ts
│   └── providers/
│       ├── qwen.provider.ts
│       ├── openai.provider.ts
│       ├── claude.provider.ts
│       └── gemini.provider.ts
├── test-*.ts             # 大量独立测试脚本
└── scripts/              # 脚本
```

---

## 🔌 API 服务器 (`api-server.ts`)

### 核心特性：
- **框架**: Hono (轻量级、高性能)
- **架构**: RESTful API
- **端口**: 默认 3456

### 路由总览：

| 路由 | 方法 | 功能 |
|-----|------|-----|
| `/api/health` | GET | 健康检查（包含 DB、AI 状态）|
| `/api/crawl/gigab2b` | POST | 运行 GigaB2B 爬虫 |
| `/api/runs` | GET | 运行记录列表 |
| `/api/runs/:id` | GET | 单条运行详情 |
| `/api/ai/recognize` | POST | AI 图片识别（模板/自定义） |
| `/api/ai/compare` | POST | AI 多图对比 |
| `/api/ai/templates` | GET | 获取提示词模板列表 |
| `/api/ai/results` | GET | 查询 AI 结果（按 runId） |
| `/api/search/amazon` | POST | Amazon 关键词搜索 |
| `/api/scrape/amazon-product` | POST | 亚马逊商品详情采集 |
| `/api/keywords/xiyouzhaoci` | POST | 希优磁关键词采集 |
| `/api/gemini/upload` | POST | Gemini 文件上传分析 |
| `/api/chatgpt/upload` | POST | ChatGPT 文件上传分析 |
| `/api/ai/optimize` | POST | Listing 文案优化 |
| `/api/db/*` | GET | 数据库查询 API（stats, products, runs 等） |
| `/api/workflow/*` | GET/POST/PUT | 工作流执行 API |

### 设计亮点：
1. **降级策略**: 数据库不可用时自动降级到本地文件存储
2. **SPA 支持**: Electron 生产模式下自动提供静态文件服务
3. **错误处理**: 全局错误拦截和统一 JSON 响应
4. **Headless 选项**: 大部分接口支持 `headless` 参数控制浏览器显示

---

## 📊 三层数据流水线架构 (ETL)

### 1️⃣ Raw 层（原始数据）
- **存储**: HTML、原始 JSON
- **DB 表**: `raw_data`
- **文件**: `data/<source>/<runId>/raw/page.html`

### 2️⃣ Staging 层（半结构化）
- **存储**: 提取的非标准化数据
- **DB 表**: `staging_data`
- **文件**: `data/<source>/<runId>/staging/data.json`

### 3️⃣ Clean 层（标准化）
- **存储**: `ProductRecord` 统一格式
- **DB 表**: `clean_products`
- **文件**: `data/<source>/<runId>/clean/product-ready.json`

---

## 🤖 多 AI Provider 架构 (New!)

### 核心设计原则：
```
IAiProvider (Interface)
  ↓
BaseAiProvider (Abstract, 提供通用功能)
  ↓
QwenProvider / OpenAiProvider / ClaudeProvider / GeminiProvider (Concrete)
  ↓
ProviderRegistry (注册中心)
  ↓
AiRouter (路由/降级/负载均衡)
```

### 关键文件：

| 文件 | 功能 |
|-----|-----|
| `types.ts` | 定义统一接口、类型、Request/Response 结构 |
| `base.ts` | 基类：图片处理、Base64/URL 转换、模板解析 |
| `templates.ts` | 统一提示词模板库（产品分析、OCR、标题提取等）|
| `registry.ts` | Provider 注册中心，支持优先级、启用/禁用 |
| `ai-router.ts` | 路由器：自动降级、优先策略、Provider 选择 |
| `providers/*.ts` | 具体实现：Qwen、OpenAI、Claude、Gemini |

### 使用模式：
```typescript
import { initializeProviders, aiRouter } from './ai-providers';

// 初始化
initializeProviders();

// 默认使用
const result = await aiRouter.recognize(image, 'product-analysis');

// 指定 Provider
const result = await aiRouter.recognize(image, 'product-analysis', undefined, {
  providerName: 'openai'
});
```

---

## 🔍 爬虫架构 (`crawlers/`)

### 基类设计 (`base-crawler.ts`)
```typescript
abstract class BaseCrawler {
  abstract navigate(page: Page): Promise<boolean>;
  abstract extract(page: Page): Promise<Record<string, unknown>>;
  abstract clean(staging: any): ProductRecord;
}
```

### GigaB2B 爬虫示例 (`crawlers/gigab2b/`)

| 文件 | 职责 |
|-----|-----|
| `config.ts` | 配置：选择器、URL 模式、提取规则 |
| `extractor.ts` | 从页面提取半结构化数据 |
| `cleaner.ts` | 数据清洗、标准化为 ProductRecord |
| `crawler.ts` | 编排器：调用 navigate、extract、clean |

---

## 🗄️ 数据库设计 (`core/database-service.ts`)

### 核心表结构：

| 表名 | 用途 |
|-----|-----|
| `crawler_runs` | 爬虫运行记录（状态、时间、参数、统计） |
| `raw_data` | 原始 HTML/数据 |
| `staging_data` | 提取的中间数据（JSONB） |
| `clean_products` | 标准化产品数据（用于导出/分析） |
| `ai_recognition_results` | AI 识别结果（包含 prompt、模板、图片） |
| `workflow_executions` | 工作流执行记录 |
| `workflow_step_records` | 工作流步骤记录（JSONB 存储输入/输出） |
| `workflow_execution_logs` | 工作流日志 |

### 数据库连接设计：
- **Driver**: `pg` (PostgreSQL)
- **模式**: 连接池 + 每次请求独立连接
- **降级策略**: DB 不可用时自动使用 `RunContext` 本地文件

---

## 🛠️ 核心服务 (`services/`)

| 服务 | 功能 |
|-----|-----|
| `CrawlerService` | 爬虫编排（创建 Context、调用爬虫、保存数据） |
| `AmazonSearchService` | 亚马逊搜索结果采集 |
| `AmazonProductService` | 亚马逊产品详情采集 |
| `AiVisionService` | 原有 Qwen AI 视觉（即将迁移到 ai-providers） |
| `GeminiFileService` | Gemini 浏览器自动化（文件上传） |
| `ChatGPTFileService` | ChatGPT 浏览器自动化（文件上传） |
| `XiyouzhaociService` | 希优磁关键词采集 |

---

## 🧪 测试与调试

### 独立测试脚本（20+个）
```
test-amazon-search.ts
test-amazon-product.ts
test-gemini-simple.ts
test-gemini-file-upload.ts
test-gigab2b.ts
test-chatgpt.ts
test-xiyouzhaoci.ts
...
```

### 特点：
- 可独立运行（无需 API 服务器）
- 用于快速验证单个功能
- 包含真实场景的测试数据

---

## 🔌 与 Electron 集成 (`packages/electron/`)

### 启动流程：
```
Electron Main Process
  ↓
  startBackend() (backend-launcher.ts)
    ↓
  fork(api-server.js) (子进程)
    ↓
  健康检查 (waitForReady)
    ↓
  创建 BrowserWindow
    ↓
  加载 http://localhost:3456
```

### 进程间通信 (IPC):
| 通道 | 功能 |
|-----|-----|
| `get-user-data-path` | 获取用户数据目录 |
| `get-chrome-path` | 获取 Chrome 路径 |
| `openExternal` | 打开外部 URL |
| `backend-ready` | 后端就绪通知 |

---

## 📦 打包与部署 (`electron-builder.yml`)

### 文件包含策略：
```
├── dist-electron/          # Electron main 进程编译结果
├── frontend-dist/          # 前端编译结果
├── backend-dist/           # 后端编译结果
└── backend_node_modules/  # 后端 node_modules（解压）
```

### Playwright 特殊处理：
- Playwright 二进制需要直接解压到文件系统
- `asarUnpack` 配置将相关目录解压出来

---

## 🎯 核心技术栈

| 组件 | 技术 |
|-----|-----|
| Web Server | Hono |
| Browser Automation | Playwright |
| Database | PostgreSQL (pg) |
| AI Models | Qwen / OpenAI / Claude / Gemini |
| File Watcher | Node fs |
| Build | TypeScript (tsc) |
| Package Manager | npm workspaces (monorepo) |

---

## ⚠️ 技术债务与优化建议

1. **AI 服务迁移**: `ai-vision-service.ts` 需要迁移到新的 `ai-providers` 架构
2. **测试整理**: 独立测试脚本应该集成到 Jest/Vitest
3. **Type Safety**: API 层可以添加 Zod/Valibot 验证
4. **Error Tracking**: 添加 Sentry 等错误追踪
5. **Rate Limiting**: AI API 需要添加限流器
6. **Job Queue**: 爬虫任务应该使用 BullMQ 队列化

---

这是一个设计非常完善的跨境电商自动化系统！架构清晰、扩展性强，新的 AI 架构也提供了极大的灵活性。