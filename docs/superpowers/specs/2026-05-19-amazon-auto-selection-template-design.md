# Amazon 自动化选品优化 Template — Design Spec

## Context

Create a new template in the template marketplace that wires together the 6 existing workflow nodes into a complete Amazon product selection and listing optimization pipeline. The pipeline mirrors the integration-test flow (`packages/backend/integration-test/run-pipeline.ts`).

## Analysis

All 6 nodes already have real inline executors in `packages/frontend/src/plugins/index.ts` that call backend API endpoints. No new executors or nodes are needed.

## Data Flow

```
gigab2b-crawl → ai-vision → amazon-search → amazon-product → xiyouzhaoci-keywords → ai-optimize
    ↓                ↓               ↓                ↓                     ↓                  ↓
  {title,          {firstResult,    {keyword,        {asin, title,       {asin, keywords[],  {optimizedTitle,
   images[],        results[],       asins[],         brand, bulletPoints, rawKeywords,        optimizedBulletPoints,
   specifications}  imageCount}      links[],         specifications,   totalKeywords}      seoKeywords[],
                                    total}           ...}                                   competitorAnalysis}
```

### Verified Compatibility

| Step | Executor reads from | Backend API | Status |
|------|---------------------|-------------|--------|
| 1. gigab2b-crawl | `config.productUrl` | `POST /api/crawl/gigab2b` | Works |
| 2. ai-vision | `input.images[]` | `POST /api/ai/recognize` | Works (default template: extract-search-keywords) |
| 3. amazon-search | `input.firstResult` (parsed for keyword) | `POST /api/search/amazon` | Works |
| 4. amazon-product | `input.asins[0]` | `POST /api/scrape/amazon-product` | Works |
| 5. xiyouzhaoci-keywords | `input.asin` | `POST /api/keywords/xiyouzhaoci` | Works |
| 6. ai-optimize | `allOutputs['amazon-product*']` + `input.rawKeywords` | `POST /api/gemini/upload` or chatgpt | Works |

## Changes

### Single file: `packages/frontend/src/data/templates.ts`

Add one template object to the `workflowTemplates` array:

```typescript
{
  id: 'amazon-auto-selection',
  name: 'Amazon 自动化选品优化',
  description: '完整 6 步流水线：GigaB2B 爬取 → AI 识图提取关键词 → Amazon 竞品搜索 → 商品详情抓取 → 西柚找词 → AI 文案优化',
  category: 'research',
  categoryLabel: '市场调研',
  gradient: 'from-amber-500 to-orange-600',
  nodeIds: ['start', 'gigab2b-crawl', 'ai-vision', 'amazon-search', 'amazon-product', 'xiyouzhaoci-keywords', 'ai-optimize', 'end'],
  defaultConfigs: {
    'gigab2b-crawl': { productUrl: 'https://www.gigab2b.com/index.php?route=product/product&product_id=928649' },
    'ai-optimize': { executionMode: 'gemini' },
  },
},
```

## Verification

1. Start backend + frontend
2. Open template marketplace, find "Amazon 自动化选品优化"
3. Click "使用模板" → workflow editor with 6 step nodes
4. Run workflow → each step should call real backend API and produce output
5. Expand step rows → NodeDetailRenderers display the output data
