# 独立集成测试流水线

## 概述

本目录是后端服务的独立集成测试环境。将 `src/services/` 及其依赖的共享模块复制到 `src/` 子目录中，通过单文件流水线按顺序运行全部 6 个业务步骤，验证数据在各节点间的传递。

**核心原则：完全独立于主项目 `src/`，可自由修改调试，不影响主代码。**

---

## 运行方式

```bash
# 从项目根目录运行（必须用绝对路径）
npx tsx packages/backend/integration-test/run-pipeline.ts --mock

# 有头模式 + 真实爬取（使用默认商品链接）
npx tsx packages/backend/integration-test/run-pipeline.ts

# 有头模式 + 指定商品链接
npx tsx packages/backend/integration-test/run-pipeline.ts --real-crawl <GigaB2B商品URL>

# 跳到某一步调试（如直接测 Amazon 搜索）
npx tsx packages/backend/integration-test/run-pipeline.ts --skip-to 3

# 无头模式
npx tsx packages/backend/integration-test/run-pipeline.ts --headless
```

**注意：** 必须从项目根目录 `ai-crossborder-pro/` 运行，因为 `packages/backend/` 下有 tsconfig 会干扰 tsx 的模块解析。

---

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mock` | Step 1 使用预定义模拟数据 | false |
| `--headless` | 浏览器无头模式运行 | false（有头模式） |
| `--real-crawl <url>` | 真实爬取 GigaB2B 商品（关闭 mock） | 内置默认 URL |
| `--skip-to <N>` | 跳到第 N 步开始执行 | 0（从第一步开始） |
| `--env <path>` | 指定 .env 文件路径 | `packages/backend/.env` |

---

## 业务流水线（6 步）

```
Step 1 (GigaB2B 爬虫)    → { title, price, description, images[], specifications }
    ↓
Step 2 (AI 识图)         → 输入: images[] → 输出: { analyses[], searchKeywords[] }
    ↓
Step 3 (Amazon 搜索)     → 输入: searchKeywords[0] (回退 title) → 输出: { asins[], links[], total }
    ↓
Step 4 (Amazon 商品详情)  → 输入: asins[0] → 输出: { 完整商品数据 }
    ↓
Step 5 (西柚找词)         → 输入: asin → 输出: { keywords[] }
    ↓
Step 6 (AI 文案优化)      → 输入: title + bulletPoints + keywords → 输出: { 优化后Listing }
```

---

## 运行记录目录

每次运行自动生成记录，保存在 `runs/` 目录下（gitignored）：

```
runs/
  20260519-160017/           # 按时间戳命名
    metadata.json            # 运行元信息（时间、耗时、每步状态）
    step1-input.json         # Step 1 输入
    step1-output.json        # Step 1 输出
    step2-input.json
    step2-output.json
    ...
    step6-output.json
```

后续开发编辑框 UI 时，可通过 `lib/run-store.ts` 提供的 `loadStepData()` / `listRuns()` 接口读取这些文件。

---

## 目录结构

```
integration-test/
  run-pipeline.ts               # 主编排器（唯一入口）
  lib/
    pipeline-types.ts           # 步骤间数据传递的类型定义
    logger.ts                   # 带颜色的控制台日志
    mock-data.ts                # Step 1 模拟商品数据
    run-store.ts                # 运行记录存取模块
  steps/
    step1-gigab2b-crawl.ts      # Step 1 实现
    step2-ai-vision.ts          # Step 2 实现
    step3-amazon-search.ts      # Step 3 实现
    step4-amazon-product.ts     # Step 4 实现
    step5-xiyouzhaoci.ts        # Step 5 实现
    step6-ai-optimize.ts        # Step 6 实现
  src/                           # 后端服务代码副本（可自由修改）
    services/                   # 6 个业务服务
    core/                       # browser-config, database-service, drivers/, run-context, types
    crawlers/gigab2b/           # GigaB2B 爬虫模块
    utils.ts                    # 共享工具函数
  runs/                          # 运行记录（gitignored）
  output/                        # 流水线结果 JSON（gitignored）
```

---

## src/ 副本文件清单

从 `packages/backend/src/` 复制的文件（21 个）：

**服务层（6 个）：**
- `services/ai-vision-service.ts`
- `services/amazon-search-service.ts`
- `services/amazon-product-service.ts`
- `services/xiyouzhaociService.ts`
- `services/gemini-file-service.ts`
- `services/crawler-service.ts`

**共享模块（8 个）：**
- `core/browser-config.ts`
- `core/types.ts`
- `core/run-context.ts`
- `core/database-service.ts`
- `utils.ts`

**数据库驱动（5 个）：**
- `core/drivers/types.ts`
- `core/drivers/index.ts`
- `core/drivers/sqlite-driver.ts`
- `core/drivers/postgres-driver.ts`
- `core/drivers/sql-helpers.ts`

**爬虫模块（5 个）：**
- `crawlers/base-crawler.ts`
- `crawlers/gigab2b/crawler.ts`
- `crawlers/gigab2b/config.ts`
- `crawlers/gigab2b/extractor.ts`
- `crawlers/gigab2b/cleaner.ts`

---

## 环境变量

依赖 `packages/backend/.env` 中的配置：

| 变量 | 必需步骤 | 说明 |
|------|---------|------|
| `DASHSCOPE_API_KEY` | Step 2 | 阿里云 DashScope API（AI 识图） |
| `BROWSER_MODE` | Step 3-6 | `system-chrome`（默认）或 `playwright-chromium` |
| `CHROME_DATA_DIR` | Step 3-6 | Chrome 用户数据目录（可选） |

---

## 已知问题

### 待修复

1. **[2026-05-19] Step 5 西柚找词解析失败**：提取了 19 行表格数据但解析出 0 个有效关键词，CSV 解析逻辑在 `xiyouzhaociService.ts` 中需要修复

2. **[2026-05-19] Step 4 brand 提取为空**：`specifications` 中有 `"Item Details.Brand Name": "HOME DESIGN"`，但 `brand` 字段为空。提取逻辑未从 `Item Details.Brand Name` 取值，需修复 `amazon-product-service.ts`

3. **[2026-05-19] Step 4 specifications 包含垃圾数据**：`Customer Reviews` 字段包含了完整的 Amazon JS 代码（2000+ 字符 JavaScript），污染了 specifications 数据。需要在提取时过滤掉非结构化字段

4. **[2026-05-19] Step 4 bestSellersRank 为空**：`specifications` 里有排名信息 `#776,925 in Home & Kitchen`，但未解析到 `bestSellersRank` 字段

5. **[2026-05-19] Step 6 rawResponse 开头有脏数据**：Gemini 回复前缀包含 `"Gemini 说"` 文字，说明 DOM 提取时把输入框文本也抓进来了。当前 JSON 解析能成功（正则匹配 `{...}`），但 rawResponse 不干净

6. **[2026-05-19] Step 1 price/description 为空**：GigaB2B 页面未直接显示价格（可能需要询价），爬虫提取到空值。非 bug，但需确认是否需要额外处理

### 已修复

- ~~Step 1 title 提取错误（取到了 "Estimated Ocean Freight Charge"）~~ → [2026-05-19] 改为优先从 `specifications["Product Name"]` 取值
- ~~Step 6 Gemini 响应截断~~ → [2026-05-19] 改为 DOM 轮询等待文本稳定
- ~~Step 3 Amazon 搜索 networkidle 超时~~ → [2026-05-19] 改为 `domcontentloaded`
- ~~Step 4 Amazon 商品详情页 30s 超时~~ → [2026-05-19] 改为 60s
- ~~Step 2 只做产品分析，没有提取搜索关键词~~ → [2026-05-19] 增加 `extract-search-keywords` 模板调用
- ~~GigaB2B 图片包含 banner 设计图~~ → [2026-05-19] 过滤 `bannerDesign` URL，最多取 2 张

### 环境问题

1. **Chrome Profile 锁定**：如果后端 API 服务（npm run dev）正在运行，同一 Profile 目录会被锁定，需先停止后端服务
2. **Amazon 网络不稳定**：国内访问 Amazon 可能偶发 `ERR_FAILED`，非代码问题，建议使用稳定代理
