# 独立集成测试流水线

## 概述

本目录是后端服务的独立集成测试环境。将 `src/services/` 及其依赖的共享模块复制到 `src/` 子目录中，通过单文件流水线按顺序运行全部 6 个业务步骤，验证数据在各节点间的传递。

**核心原则：完全独立于主项目 `src/`，可自由修改调试，不影响主代码。**

---

## 运行方式

```bash
# 从项目根目录运行（必须用绝对路径）
npx tsx packages/backend/integration-test/run-pipeline.ts --mock

# 有头模式 + 模拟数据（推荐）
npx tsx packages/backend/integration-test/run-pipeline.ts --mock

# 有头模式 + 真实爬取
npx tsx packages/backend/integration-test/run-pipeline.ts --real-crawl <GigaB2B商品URL>

npx tsx packages/backend/integration-test/run-pipeline.ts --real-crawl https://www.gigab2b.com/index.php?route=product/product&product_id=747431


# 跳到某一步调试（如直接测 Amazon 搜索）
npx tsx packages/backend/integration-test/run-pipeline.ts --mock --skip-to 3

# 无头模式
npx tsx packages/backend/integration-test/run-pipeline.ts --mock --headless
```

**注意：** 必须从项目根目录 `ai-crossborder-pro/` 运行，因为 `packages/backend/` 下有 tsconfig 会干扰 tsx 的模块解析。

---

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mock` | Step 1 使用预定义模拟数据 | false |
| `--headless` | 浏览器无头模式运行 | false（有头模式） |
| `--real-crawl <url>` | 真实爬取 GigaB2B 商品（关闭 mock） | 无 |
| `--skip-to <N>` | 跳到第 N 步开始执行 | 0（从第一步开始） |
| `--env <path>` | 指定 .env 文件路径 | `packages/backend/.env` |

---

## 业务流水线（6 步）

```
Step 1 (GigaB2B 爬虫)    → { title, price, description, images[], specifications }
    ↓
Step 2 (AI 识图)         → 输入: images[] → 输出: { analyses[] }
    ↓
Step 3 (Amazon 搜索)     → 输入: title → 输出: { asins[], links[], total }
    ↓
Step 4 (Amazon 商品详情)  → 输入: asins[0] → 输出: { 完整商品数据 }
    ↓
Step 5 (西柚找词)         → 输入: asin → 输出: { keywords[] }
    ↓
Step 6 (AI 文案优化)      → 输入: title + bulletPoints + keywords → 输出: { 优化后Listing }
```

---

## 目录结构

```
integration-test/
  run-pipeline.ts               # 主编排器（唯一入口）
  lib/
    pipeline-types.ts           # 步骤间数据传递的类型定义
    logger.ts                   # 带颜色的控制台日志
    mock-data.ts                # Step 1 模拟商品数据
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
  output/                        # 流水线结果 JSON（自动生成）
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

1. **Step 5 西柚找词**：提取了 19 行表格数据但解析出 0 个有效关键词，CSV 解析逻辑在 xiyouzhaociService.ts 中需要修复
2. **Step 6 Gemini 响应不完整**：Gemini 需要较长等待时间或有交互弹窗，有头模式下表现更稳定
3. **Chrome Profile 锁定**：如果后端 API 服务（npm run dev）正在运行，同一 Profile 目录会被锁定，需先停止后端服务
