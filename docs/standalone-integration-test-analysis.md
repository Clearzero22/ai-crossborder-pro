# 独立集成测试流水线设计文档

## 一、背景与目标

当前项目有 6 个真实后端服务，构成完整的跨境电商业务工作流：

```
GigaB2B 爬虫 → AI 识图 → Amazon 搜索 → Amazon 商品详情 → 西柚找词关键词 → AI 文案优化
```

这些服务目前只能通过 API 服务器或独立测试脚本调用。需要一个**隔离的、单文件流水线**，能够：

1. 按顺序运行全部 6 个步骤
2. 将每个步骤的输出作为下一步的输入（模拟 DataBus 数据传递）
3. 在每个步骤边界输出详细日志
4. 支持跳过任意步骤进行调试
5. 不依赖完整后端服务器启动

---

## 二、业务流水线完整数据流

### 步骤 1：GigaB2B 爬虫
- **输入**：商品 URL
- **输出**：`{ title, price, description, images[], specifications }`
- **用途**：从 GigaB2B 电商平台抓取原始商品信息，作为整个流程的数据起点

### 步骤 2：AI 识图（DashScope 通义千问 VL）
- **输入**：步骤 1 的 `images[]`，模板 = `product-analysis`
- **输出**：`{ analysis: 分析文本, templateUsed, model }`
- **用途**：对商品图片进行深度拆解分析（产品定位、结构材质、颜色外观、市场判断）

### 步骤 3：Amazon 竞品搜索
- **输入**：步骤 1 的 `title`（作为搜索关键词）
- **输出**：`{ keyword, asins[], links[], total }`
- **用途**：在 Amazon 上搜索类似商品，获取竞品 ASIN 列表

### 步骤 4：Amazon 商品详情
- **输入**：步骤 3 的第一个 ASIN
- **输出**：`{ asin, title, brand, price, rating, bulletPoints[], longDescription, images[], specifications, bestSellersRank[] }`
- **用途**：获取竞品的完整 Listing 数据（标题、五点描述、长描述、图片、规格等）

### 步骤 5：西柚找词关键词挖掘
- **输入**：步骤 4 的 ASIN
- **输出**：`{ asin, keywords: [{ rank, keyword, searchVolume, difficulty, trafficShare }], totalKeywords }`
- **用途**：获取该 ASIN 对应的搜索关键词数据（搜索量、难度、流量份额）

### 步骤 6：AI 文案优化（Gemini）
- **输入**：
  - 步骤 1 的 `title`（原始商品标题）
  - 步骤 4 的 `bulletPoints[]`、`longDescription`（竞品 Listing 数据）
  - 步骤 5 的 `keywords[]`（关键词数据）
  - 步骤 4 的完整数据作为 `competitor` 竞品参考
- **输出**：`{ optimizedTitle, optimizedBulletPoints[], optimizedLongDescription, seoKeywords[], competitorAnalysis }`
- **用途**：综合所有数据，通过 AI 生成优化的 Listing 文案

### 数据流总览

```
Step 1 (GigaB2B)        → { title, price, description, images[], specifications }
         ↓
Step 2 (AI 识图)        → 输入: images[] → 输出: { analysis 分析文本 }
         ↓
Step 3 (Amazon 搜索)    → 输入: title 作为关键词 → 输出: { asins[], links[] }
         ↓
Step 4 (Amazon 商品详情) → 输入: 第一个 ASIN → 输出: { 完整商品数据 }
         ↓
Step 5 (西柚找词)        → 输入: ASIN → 输出: { keywords 搜索量/难度/流量份额 }
         ↓
Step 6 (AI 文案优化)     → 输入: 标题+五点+描述+关键词+竞品 → 输出: { 优化后Listing }
```

---

## 三、后端服务依赖分析

### 依赖层级划分

#### Tier 1 — 最小依赖（无需浏览器）

| 服务 | 文件 | 外部依赖 | 环境变量 |
|------|------|---------|---------|
| AI Vision | `services/ai-vision-service.ts` | `openai` npm 包 | `DASHSCOPE_API_KEY` |

**特点**：纯 API 调用，不需要 Playwright、不需要浏览器、不需要数据库。

#### Tier 2 — 共享 Playwright + browser-config + utils

| 服务 | 文件 | 依赖模块 |
|------|------|---------|
| Amazon Search | `services/amazon-search-service.ts` | `playwright`, `browser-config.ts`, `utils.ts` |
| Amazon Product | `services/amazon-product-service.ts` | `playwright`, `browser-config.ts`, `utils.ts` |
| 西柚找词 | `services/xiyouzhaociService.ts` | `playwright`, `browser-config.ts`, `utils.ts`, `fs` |
| Gemini File | `services/gemini-file-service.ts` | `playwright`, `browser-config.ts`, `utils.ts`, `fs` |

**共同模式**：
- 都调用 `chromium.launchPersistentContext()` 启动浏览器
- 都通过 `getUserDataDir()` 获取统一的用户数据目录
- 都通过 `browserConfig.getLaunchOptions()` 获取浏览器启动参数

#### Tier 3 — 完整依赖栈

| 服务 | 文件 | 依赖模块 |
|------|------|---------|
| GigaB2B 爬虫 | `services/crawler-service.ts` | `database-service.ts`, `run-context.ts`, `types.ts`, `browser-config`, `utils`, 整个 `crawlers/gigab2b/` 模块（4个文件） |

**关键发现**：`db` 参数是**可选的**。传入 `db: undefined` 时，所有数据库操作自动跳过，`RunContext` 仅写入本地文件系统。

### 共享模块

| 模块 | 文件路径 | 用途 |
|------|---------|------|
| BrowserConfig | `core/browser-config.ts` | 浏览器模式管理单例（system-chrome / playwright-chromium）、Profile 管理 |
| Utils | `utils.ts` | `getUserDataDir()`, `launchPersistent()`, `launchStealth()`, `sleep()`, `extractAsins()` |

---

## 四、集成测试目录设计

### 目录结构

```
integration-test/
  package.json              # 依赖: tsx, playwright, openai, dotenv
  tsconfig.json             # TypeScript 配置
  run-pipeline.ts           # 主入口 — 编排全部 6 个步骤
  lib/
    pipeline-types.ts       # 步骤间数据传递的共享类型定义
    logger.ts               # 带颜色输出的步骤日志器
    mock-data.ts            # GigaB2B 模拟商品数据（--mock 模式使用）
    browser-manager.ts      # 浏览器辅助工具
  steps/
    step1-gigab2b-crawl.ts  # GigaB2B 爬虫（真实/模拟）
    step2-ai-vision.ts      # AI 识图 — DashScope API
    step3-amazon-search.ts  # Amazon 关键词搜索
    step4-amazon-product.ts # Amazon 商品详情
    step5-xiyouzhaoci.ts    # 西柚找词关键词数据
    step6-ai-optimize.ts    # AI Listing 文案优化
  output/                   # 流水线结果 JSON 输出目录（gitignored）
```

### 核心设计决策

#### 1. 使用相对导入，不复制文件

直接通过相对路径引用原始后端源码：
```typescript
import { AiVisionService } from '../../packages/backend/src/services/ai-vision-service';
import { AmazonSearchService } from '../../packages/backend/src/services/amazon-search-service';
```

**优势**：
- 零漂移风险 — 始终使用最新代码
- 无需维护副本
- `tsx` 原生支持相对路径解析

#### 2. GigaB2B 爬虫无需数据库

`CrawlerService.runGigaB2B(url, options)` 的 `options.db` 默认为 `undefined`：
- 不传 `db` → 所有数据库操作自动跳过
- `RunContext` 仅写入本地文件系统 `output/runs/`
- 不需要 PostgreSQL

#### 3. 每个服务独立管理浏览器

现有服务各自内部调用 `chromium.launchPersistentContext()`。由于流水线**顺序执行**，不存在 Chrome Profile 锁定冲突。

#### 4. 模拟数据回退机制

- 步骤 1 失败时（或 `--mock` 模式），使用预定义的商品数据
- 确保后续步骤 2-6 始终可以运行测试
- 关键价值：即使爬虫有问题，也能独立调试 AI 识图、Amazon 搜索等下游服务

---

## 五、各步骤实现细节

### 步骤 1：GigaB2B 爬虫 (`step1-gigab2b-crawl.ts`)

```typescript
import { CrawlerService } from '../../packages/backend/src/services/crawler-service';

// 不传 db 参数 → 仅本地文件存储，无需数据库
const svc = new CrawlerService();
const result = await svc.runGigaB2B(productUrl, {
  headless: options.headless,
  saveFiles: true,
  // db: undefined（默认值，跳过所有数据库操作）
});
```

**失败回退**：如果真实爬取失败，自动切换到 `mock-data.ts` 中的预定义商品数据。

### 步骤 2：AI 识图 (`step2-ai-vision.ts`)

```typescript
import { AiVisionService } from '../../packages/backend/src/services/ai-vision-service';

const service = new AiVisionService();
// 逐张分析图片，使用 "product-analysis" 模板
for (const imageUrl of step1.images) {
  const analysis = await service.recognize(imageUrl, 'product-analysis');
}
```

**特点**：不需要浏览器，纯 API 调用，仅需 `DASHSCOPE_API_KEY`。

### 步骤 3：Amazon 搜索 (`step3-amazon-search.ts`)

```typescript
import { AmazonSearchService } from '../../packages/backend/src/services/amazon-search-service';

const service = new AmazonSearchService();
const result = await service.search(keyword, 20, { headless });
// 返回 { keyword, asins[], links[], total }
```

**输入**：步骤 1 的 `title` 作为搜索关键词。

### 步骤 4：Amazon 商品详情 (`step4-amazon-product.ts`)

```typescript
import { AmazonProductService } from '../../packages/backend/src/services/amazon-product-service';

const service = new AmazonProductService();
const result = await service.scrape(asin, { headless });
// 返回 { asin, title, brand, price, bulletPoints[], longDescription, ... }
```

**输入**：步骤 3 返回的第一个 ASIN。

### 步骤 5：西柚找词 (`step5-xiyouzhaoci.ts`)

```typescript
import { scrapeXiyouzhaociKeywords } from '../../packages/backend/src/services/xiyouzhaociService';

const result = await scrapeXiyouzhaociKeywords(asin, {
  headless,
  saveCsv: false,
});
// 返回 { asin, keywords[], totalKeywords }
```

**输入**：步骤 4 的 ASIN。

### 步骤 6：AI 文案优化 (`step6-ai-optimize.ts`)

```typescript
import { GeminiFileService } from '../../packages/backend/src/services/gemini-file-service';

const service = new GeminiFileService();
// 构建与 api-server.ts 相同的优化提示词
const prompt = buildOptimizePrompt(title, bulletPoints, longDescription, competitors, keywords);
const result = await service.chat(prompt, { headless, responseTimeout: 90000 });
// 解析 JSON 响应 → { optimizedTitle, optimizedBulletPoints[], optimizedLongDescription, seoKeywords[] }
```

**输入组合**：
- 原始商品标题（步骤 1）
- 竞品 Listing 数据（步骤 4）
- 关键词数据（步骤 5）

**注意**：需要 Google 账号已登录状态（浏览器 Profile 中保存的 Session）。

---

## 六、主编排器设计 (`run-pipeline.ts`)

### CLI 参数

| 参数 | 说明 |
|------|------|
| `--mock` | 使用模拟数据代替 GigaB2B 爬虫 |
| `--real-crawl <url>` | 使用真实 GigaB2B 爬虫（传入商品 URL） |
| `--headless` | 无头模式运行浏览器 |
| `--skip-to <N>` | 跳到第 N 步开始执行（调试用） |
| `--env <path>` | 指定 .env 文件路径 |

### 执行流程

```typescript
// 1. 解析参数
// 2. 加载环境变量 dotenv.config()
// 3. 校验前置条件（DASHSCOPE_API_KEY 等）
// 4. 按顺序执行 6 个步骤
for (const step of steps) {
  try {
    const result = await step.execute(ctx, options);
    ctx[`step${step.num}`] = result;
    logger.stepSuccess(step.num, step.name, duration);
    logger.dataSnapshot(result);  // 输出 JSON 摘要
  } catch (error) {
    logger.stepError(step.num, step.name, error);
    // 步骤 1 失败时自动回退到模拟数据
    // 其他步骤失败时跳过，继续执行后续步骤
  }
}
// 5. 输出总结报告
// 6. 保存结果到 output/pipeline-result-<timestamp>.json
```

### 日志输出示例

```
═══════════════════════════════════════════════════
  🚀 AI Crossborder Pro — Integration Test Pipeline
  Mode: mock | Headless: false | Skip to: none
═══════════════════════════════════════════════════

── Step 1/6: GigaB2B Crawl ──────────────────────
  [MOCK] Using predefined product data
  ✅ Success (12ms)
  📊 Output: { title: " Adjustable Height...", images: 5 items }

── Step 2/6: AI Vision ──────────────────────────
  Analyzing image 1/5...
  Analyzing image 2/5...
  ✅ Success (8432ms)
  📊 Output: { analysis: "1. 产品定位: ..." }

── Step 3/6: Amazon Search ──────────────────────
  Searching: "adjustable height laptop table"
  ✅ Success (15234ms)
  📊 Output: { asins: ["B09XX...", "B08YY..."], total: 20 }

── Step 4/6: Amazon Product ─────────────────────
  Scraping ASIN: B09XX...
  ✅ Success (8912ms)
  📊 Output: { title: "...", brand: "...", price: "$49.99" }

── Step 5/6: Xiyouzhaoci Keywords ───────────────
  Fetching keywords for ASIN: B09XX...
  ✅ Success (12345ms)
  📊 Output: { totalKeywords: 487 }

── Step 6/6: AI Optimize ────────────────────────
  Building optimization prompt...
  Sending to Gemini...
  ✅ Success (23456ms)
  📊 Output: { optimizedTitle: "...", seoKeywords: 15 items }

═══════════════════════════════════════════════════
  Pipeline Complete
  Steps: 6/6 passed | Total time: 68s
  Result saved to: output/pipeline-result-20260519.json
═══════════════════════════════════════════════════
```

---

## 七、现有代码复用清单

| 模块 | 源文件路径 | 复用方式 |
|------|-----------|---------|
| `AiVisionService` | `packages/backend/src/services/ai-vision-service.ts` | 直接导入 |
| `AmazonSearchService` | `packages/backend/src/services/amazon-search-service.ts` | 直接导入 |
| `AmazonProductService` | `packages/backend/src/services/amazon-product-service.ts` | 直接导入 |
| `scrapeXiyouzhaociKeywords` | `packages/backend/src/services/xiyouzhaociService.ts` | 直接导入 |
| `GeminiFileService` | `packages/backend/src/services/gemini-file-service.ts` | 直接导入 |
| `CrawlerService` | `packages/backend/src/services/crawler-service.ts` | 直接导入（不传 DB） |
| `browserConfig` | `packages/backend/src/core/browser-config.ts` | 服务内部自动导入 |
| `getUserDataDir` | `packages/backend/src/utils.ts` | 服务内部自动导入 |
| AI 优化提示词模板 | `packages/backend/src/api-server.ts:787-809` | 提取到步骤 6 中 |
| 环境变量 | `packages/backend/.env` | 通过 dotenv 加载 |

---

## 八、注意事项与风险

### 1. Chrome Profile 锁定
如果后端服务正在运行，浏览器 Profile 目录会被锁定。建议：
- 测试时停止后端服务，或
- 使用独立的 Profile 路径（通过 `CHROME_DATA_DIR` 环境变量指定）

### 2. Amazon 反爬机制
步骤 3 和 4 可能触发 CAPTCHA。现有服务已内置等待手动操作逻辑。建议：
- 默认使用非无头模式调试
- 首次运行时手动完成一次 CAPTCHA 验证

### 3. Gemini 登录要求
步骤 6 需要 Google 账号登录状态。如果未登录：
- 流水线会检测到并输出登录指引
- 用户需手动登录一次，Session 会保存在浏览器 Profile 中

### 4. 浏览器启动次数
流水线共启动 4 次浏览器（Amazon Search、Amazon Product、Xiyouzhaoci、Gemini）。这是当前架构的限制，后续可优化为共享浏览器上下文。

### 5. 环境变量依赖

| 变量 | 必需步骤 | 说明 |
|------|---------|------|
| `DASHSCOPE_API_KEY` | 步骤 2（AI 识图） | 阿里云 DashScope API Key |
| Google 登录状态 | 步骤 6（AI 优化） | 浏览器 Profile 中保存 |
| `BROWSER_MODE` | 步骤 3/4/5/6 | 浏览器模式（默认 system-chrome） |

---

## 九、验证步骤

1. **安装依赖**：`cd integration-test && npm install`
2. **纯模拟模式**（无需浏览器）：`npx tsx run-pipeline.ts --mock --headless`
3. **模拟数据 + 真实浏览器服务**：`npx tsx run-pipeline.ts --mock`
4. **完整流水线**：`npx tsx run-pipeline.ts --real-crawl <url>`
5. **跳步调试**：`npx tsx run-pipeline.ts --skip-to 3 --mock`
6. **检查输出**：`output/` 目录中查看 JSON 结果文件
