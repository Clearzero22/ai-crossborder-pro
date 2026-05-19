# Standalone Integration Test Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated integration-test directory that runs all 6 real backend services sequentially as a pipeline, with data passing between steps and detailed logging.

**Architecture:** A new `integration-test/` directory at project root. Each pipeline step is a separate module that imports backend services via relative paths (no file copying). A single `run-pipeline.ts` orchestrator runs steps 1→6 in order, passing each step's output as the next step's input. CLI flags control headless mode, mock data, and step skipping for debugging.

**Tech Stack:** TypeScript, tsx (runner), playwright ^1.59.1, openai ^6.34.0, dotenv ^17.4.2

**Design doc:** `docs/standalone-integration-test-analysis.md`

---

## File Structure

```
integration-test/
  package.json                          # Dependencies and scripts
  tsconfig.json                         # TypeScript config
  .gitignore                            # Ignore node_modules, output, etc.
  run-pipeline.ts                       # Main orchestrator entry point
  lib/
    pipeline-types.ts                   # Shared TypeScript interfaces
    logger.ts                           # Colored step logger
    mock-data.ts                        # Pre-defined GigaB2B product data
  steps/
    step1-gigab2b-crawl.ts              # GigaB2B crawler (real or mock)
    step2-ai-vision.ts                  # AI Vision image analysis
    step3-amazon-search.ts              # Amazon keyword search
    step4-amazon-product.ts             # Amazon product detail scrape
    step5-xiyouzhaoci.ts                # Xiyouzhaoci keyword data
    step6-ai-optimize.ts                # AI listing optimization via Gemini
  output/                               # Pipeline result JSON files (auto-created, gitignored)
```

---

## Task 1: Project scaffold (package.json, tsconfig.json, .gitignore)

**Files:**
- Create: `integration-test/package.json`
- Create: `integration-test/tsconfig.json`
- Create: `integration-test/.gitignore`

- [ ] **Step 1: Create `integration-test/package.json`**

```json
{
  "name": "@ai-crossborder/integration-test",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "pipeline": "tsx run-pipeline.ts",
    "pipeline:headless": "tsx run-pipeline.ts --headless",
    "pipeline:mock": "tsx run-pipeline.ts --mock",
    "pipeline:mock:headless": "tsx run-pipeline.ts --mock --headless",
    "pipeline:real": "tsx run-pipeline.ts --real-crawl"
  },
  "dependencies": {
    "dotenv": "^17.4.2",
    "openai": "^6.34.0",
    "playwright": "^1.59.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.21.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `integration-test/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": false,
    "outDir": "./dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `integration-test/.gitignore`**

```
node_modules/
dist/
output/
*.db
```

- [ ] **Step 4: Install dependencies**

Run: `cd integration-test && npm install`
Expected: dependencies installed successfully

- [ ] **Step 5: Commit**

```bash
git add integration-test/
git commit -m "feat(integration-test): scaffold project with package.json, tsconfig, .gitignore"
```

---

## Task 2: Shared types (`lib/pipeline-types.ts`)

**Files:**
- Create: `integration-test/lib/pipeline-types.ts`

- [ ] **Step 1: Create `integration-test/lib/pipeline-types.ts`**

```typescript
// ─── Pipeline step results ────────────────────────────────────

export interface GigaB2BCrawlResult {
  title: string;
  price: string;
  description: string;
  images: string[];
  specifications: Record<string, string>;
  url: string;
  source: 'gigab2b-crawl' | 'mock-data';
}

export interface AiVisionResult {
  analyses: string[];       // one analysis per image
  templateUsed: string;
  model: string;
}

export interface AmazonSearchResult {
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}

export interface AmazonProductResult {
  asin: string;
  title: string;
  brand: string;
  price: string;
  rating: string;
  bulletPoints: string[];
  longDescription: string;
  images: string[];
  specifications: Record<string, string>;
  bestSellersRank: string[];
}

export interface XiyouzhaociResult {
  asin: string;
  keywords: Array<{
    rank: number;
    keyword: string;
    searchVolume: string | null;
    difficulty: string | null;
    trafficShare: string | null;
  }>;
  totalKeywords: number;
}

export interface AiOptimizeResult {
  optimizedTitle: string;
  optimizedBulletPoints: string[];
  optimizedLongDescription: string;
  seoKeywords: string[];
  competitorAnalysis: string;
  rawResponse: string;
}

// ─── Pipeline context (accumulates all step outputs) ──────────

export interface PipelineContext {
  step1?: GigaB2BCrawlResult;
  step2?: AiVisionResult;
  step3?: AmazonSearchResult;
  step4?: AmazonProductResult;
  step5?: XiyouzhaociResult;
  step6?: AiOptimizeResult;
}

// ─── CLI options ─────────────────────────────────────────────

export interface PipelineOptions {
  mock: boolean;
  realCrawlUrl?: string;
  headless: boolean;
  skipTo: number;
  envPath: string;
}

// ─── Custom error for step failures ──────────────────────────

export class StepError extends Error {
  constructor(
    public readonly stepNum: number,
    public readonly stepName: string,
    message: string,
  ) {
    super(`Step ${stepNum} (${stepName}): ${message}`);
    this.name = 'StepError';
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit lib/pipeline-types.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/lib/pipeline-types.ts
git commit -m "feat(integration-test): add shared pipeline type definitions"
```

---

## Task 3: Logger utility (`lib/logger.ts`)

**Files:**
- Create: `integration-test/lib/logger.ts`

- [ ] **Step 1: Create `integration-test/lib/logger.ts`**

```typescript
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncate(obj: unknown, maxLen = 300): string {
  const s = JSON.stringify(obj, null, 2) || String(obj);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '\n  ... (truncated)';
}

export function divider() {
  console.log(`\n${'═'.repeat(57)}`);
}

export function stepStart(stepNum: number, name: string) {
  console.log(`\n── Step ${stepNum}/6: ${name} ${'─'.repeat(Math.max(1, 30 - name.length))}`);
}

export function stepSuccess(stepNum: number, name: string, durationMs: number) {
  console.log(`  ${COLORS.green}✅ Success${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset} ${COLORS.gray}[${timestamp()}]${COLORS.reset}`);
}

export function stepError(stepNum: number, name: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(`  ${COLORS.red}❌ Failed${COLORS.reset} ${COLORS.gray}[${timestamp()}]${COLORS.reset}`);
  console.log(`  ${COLORS.red}   ${msg}${COLORS.reset}`);
}

export function stepSkipped(stepNum: number, name: string, reason: string) {
  console.log(`  ${COLORS.yellow}⏭️  Skipped${COLORS.reset} — ${reason}`);
}

export function dataSnapshot(label: string, data: unknown) {
  console.log(`  ${COLORS.cyan}📊 ${label}:${COLORS.reset}`);
  console.log(`  ${COLORS.dim}${truncate(data)}${COLORS.reset}`);
}

export function info(msg: string) {
  console.log(`  ${COLORS.dim}${msg}${COLORS.reset}`);
}

export function header(options: { mock: boolean; headless: boolean; skipTo: number }) {
  divider();
  console.log(`  🚀 AI Crossborder Pro — Integration Test Pipeline`);
  console.log(`  Mode: ${options.mock ? 'mock' : 'real-crawl'} | Headless: ${options.headless} | Skip to: ${options.skipTo || 'none'}`);
  divider();
}

export function summary(passed: number, failed: number, skipped: number, totalMs: number) {
  divider();
  console.log(`  Pipeline Complete`);
  console.log(`  Steps: ${COLORS.green}${passed} passed${COLORS.reset} / ${COLORS.red}${failed} failed${COLORS.reset} / ${COLORS.yellow}${skipped} skipped${COLORS.reset}`);
  console.log(`  Total time: ${COLORS.bold}${formatDuration(totalMs)}${COLORS.reset}`);
  divider();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit lib/logger.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/lib/logger.ts
git commit -m "feat(integration-test): add colored step logger utility"
```

---

## Task 4: Mock data (`lib/mock-data.ts`)

**Files:**
- Create: `integration-test/lib/mock-data.ts`

- [ ] **Step 1: Create `integration-test/lib/mock-data.ts`**

```typescript
import type { GigaB2BCrawlResult } from './pipeline-types';

// Pre-defined GigaB2B product data — mimics real crawler output
// Uses a test image from the project's testimages/ directory
const MOCK_PRODUCT: GigaB2BCrawlResult = {
  source: 'mock-data',
  url: 'https://www.gigab2b.com/mock-product-page',
  title: 'Adjustable Height Laptop Table Bed Tray Foldable Portable Standing Desk for Sofa Couch Bed Reading Writing',
  price: '$25.99 - $35.99',
  description:
    'Multifunctional adjustable laptop table suitable for bed, sofa, couch. Features adjustable height and angle, built-in cup holder, mouse pad, and tablet slot. Foldable design for easy storage.',
  images: [
    'https://m.media-amazon.com/images/I/615DOoCI6xL._SX466_.jpg',
  ],
  specifications: {
    'Material': 'Engineered Wood + Steel',
    'Size': '60cm x 40cm / 23.6" x 15.7"',
    'Adjustable Height': '23.5cm - 48cm / 9.3" - 18.9"',
    'Weight Capacity': '30kg / 66 lbs',
    'Color': 'Black / Walnut / Bamboo',
    'Foldable': 'Yes',
  },
};

export function getMockProductData(): GigaB2BCrawlResult {
  return { ...MOCK_PRODUCT };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit lib/mock-data.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/lib/mock-data.ts
git commit -m "feat(integration-test): add mock GigaB2B product data for testing"
```

---

## Task 5: Step 1 — GigaB2B Crawl

**Files:**
- Create: `integration-test/steps/step1-gigab2b-crawl.ts`

- [ ] **Step 1: Create `integration-test/steps/step1-gigab2b-crawl.ts`**

```typescript
import { CrawlerService } from '../../packages/backend/src/services/crawler-service';
import type { GigaB2BCrawlResult, PipelineOptions } from '../lib/pipeline-types';
import { getMockProductData } from '../lib/mock-data';
import { info, stepError } from '../lib/logger';

/**
 * Step 1: GigaB2B Crawl
 *
 * Imports CrawlerService from the backend.
 * `db` is omitted from RunOptions → all DB operations are skipped.
 * RunContext writes to local filesystem only.
 *
 * On failure: returns mock data so downstream steps can still run.
 */
export async function runStep1(
  options: PipelineOptions,
): Promise<GigaB2BCrawlResult> {
  // Mock mode — skip real crawl entirely
  if (options.mock) {
    info('[MOCK] Using predefined product data');
    return getMockProductData();
  }

  if (!options.realCrawlUrl) {
    info('[SKIP] No --real-crawl URL provided, using mock data');
    return getMockProductData();
  }

  const svc = new CrawlerService();

  const summary = await svc.runGigaB2B(options.realCrawlUrl, {
    saveFiles: true,
    headless: options.headless,
    // db: undefined — no database, local filesystem only
  });

  if (summary.status !== 'completed' || !summary.clean) {
    stepError(1, 'GigaB2B Crawl', `Run ${summary.runId} ended with status: ${summary.status}`);
    info('Falling back to mock data');
    return getMockProductData();
  }

  const clean = summary.clean;
  return {
    source: 'gigab2b-crawl',
    url: options.realCrawlUrl,
    title: clean.title || '',
    price: clean.price || '',
    description: clean.description || '',
    images: Array.isArray(clean.images) ? clean.images : [],
    specifications: (clean.specifications as Record<string, string>) || {},
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step1-gigab2b-crawl.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step1-gigab2b-crawl.ts
git commit -m "feat(integration-test): add step 1 GigaB2B crawl with mock fallback"
```

---

## Task 6: Step 2 — AI Vision

**Files:**
- Create: `integration-test/steps/step2-ai-vision.ts`

- [ ] **Step 1: Create `integration-test/steps/step2-ai-vision.ts`**

```typescript
import { AiVisionService } from '../../packages/backend/src/services/ai-vision-service';
import type { GigaB2BCrawlResult, AiVisionResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

/**
 * Step 2: AI Vision — analyze product images via DashScope (Qwen VL)
 *
 * No browser needed. Only requires DASHSCOPE_API_KEY env var.
 * Uses the 'product-analysis' template for deep product analysis.
 */
export async function runStep2(
  step1Data: GigaB2BCrawlResult,
  _options: PipelineOptions,
): Promise<AiVisionResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new StepError(2, 'AI Vision', 'DASHSCOPE_API_KEY not set in environment');
  }

  if (!step1Data.images || step1Data.images.length === 0) {
    throw new StepError(2, 'AI Vision', 'No images from Step 1 to analyze');
  }

  const service = new AiVisionService();
  const templateId = 'product-analysis';
  const analyses: string[] = [];

  for (let i = 0; i < step1Data.images.length; i++) {
    const imageUrl = step1Data.images[i];
    info(`Analyzing image ${i + 1}/${step1Data.images.length}...`);

    try {
      const result = await service.recognize(imageUrl, templateId);
      analyses.push(result);
    } catch (err) {
      info(`  ⚠️ Image ${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
      analyses.push(`[Failed to analyze image ${i + 1}: ${err}]`);
    }
  }

  return {
    analyses,
    templateUsed: templateId,
    model: 'qwen3.6-flash',
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step2-ai-vision.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step2-ai-vision.ts
git commit -m "feat(integration-test): add step 2 AI Vision image analysis"
```

---

## Task 7: Step 3 — Amazon Search

**Files:**
- Create: `integration-test/steps/step3-amazon-search.ts`

- [ ] **Step 1: Create `integration-test/steps/step3-amazon-search.ts`**

```typescript
import { AmazonSearchService } from '../../packages/backend/src/services/amazon-search-service';
import type { GigaB2BCrawlResult, AmazonSearchResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

/**
 * Step 3: Amazon Search — search Amazon using product title as keyword
 *
 * Uses AmazonSearchService from the backend.
 * Launches its own browser context via chromium.launchPersistentContext().
 */
export async function runStep3(
  step1Data: GigaB2BCrawlResult,
  options: PipelineOptions,
): Promise<AmazonSearchResult> {
  const keyword = step1Data.title;
  if (!keyword) {
    throw new StepError(3, 'Amazon Search', 'No title from Step 1 to use as search keyword');
  }

  info(`Searching: "${keyword.slice(0, 80)}..."`);

  const service = new AmazonSearchService();
  try {
    const result = await service.search(keyword, 20, { headless: options.headless });
    return result as AmazonSearchResult;
  } finally {
    await service.close();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step3-amazon-search.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step3-amazon-search.ts
git commit -m "feat(integration-test): add step 3 Amazon search"
```

---

## Task 8: Step 4 — Amazon Product

**Files:**
- Create: `integration-test/steps/step4-amazon-product.ts`

- [ ] **Step 1: Create `integration-test/steps/step4-amazon-product.ts`**

```typescript
import { AmazonProductService } from '../../packages/backend/src/services/amazon-product-service';
import type { AmazonSearchResult, AmazonProductResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

/**
 * Step 4: Amazon Product — scrape full product detail by ASIN
 *
 * Uses the first ASIN from Step 3 (Amazon Search).
 * Launches its own browser context.
 */
export async function runStep4(
  step3Data: AmazonSearchResult,
  options: PipelineOptions,
): Promise<AmazonProductResult> {
  const asin = step3Data.asins?.[0];
  if (!asin) {
    throw new StepError(4, 'Amazon Product', 'No ASINs from Step 3');
  }

  info(`Scraping ASIN: ${asin}`);

  const service = new AmazonProductService();
  try {
    const result = await service.scrape({ asin, headless: options.headless });
    return result as AmazonProductResult;
  } finally {
    await service.close();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step4-amazon-product.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step4-amazon-product.ts
git commit -m "feat(integration-test): add step 4 Amazon product detail scrape"
```

---

## Task 9: Step 5 — Xiyouzhaoci Keywords

**Files:**
- Create: `integration-test/steps/step5-xiyouzhaoci.ts`

- [ ] **Step 1: Create `integration-test/steps/step5-xiyouzhaoci.ts`**

```typescript
import { scrapeXiyouzhaociKeywords } from '../../packages/backend/src/services/xiyouzhaociService';
import type { AmazonProductResult, XiyouzhaociResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

/**
 * Step 5: Xiyouzhaoci — get keyword data (search volume, difficulty, traffic share)
 *
 * Standalone async function (not a class).
 * Launches its own browser context.
 */
export async function runStep5(
  step4Data: AmazonProductResult,
  options: PipelineOptions,
): Promise<XiyouzhaociResult> {
  const asin = step4Data.asin;
  if (!asin) {
    throw new StepError(5, 'Xiyouzhaoci', 'No ASIN from Step 4');
  }

  info(`Fetching keywords for ASIN: ${asin}`);

  const result = await scrapeXiyouzhaociKeywords(asin, {
    headless: options.headless,
    maxKeywords: 50,
    saveCsv: false,
  });

  // Map to our pipeline interface (filter to relevant fields)
  return {
    asin: result.asin,
    totalKeywords: result.totalKeywords,
    keywords: result.keywords.map((kw) => ({
      rank: kw.rank,
      keyword: kw.keyword,
      searchVolume: kw.searchVolume,
      difficulty: kw.difficulty,
      trafficShare: kw.trafficShare,
    })),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step5-xiyouzhaoci.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step5-xiyouzhaoci.ts
git commit -m "feat(integration-test): add step 5 Xiyouzhaoci keyword mining"
```

---

## Task 10: Step 6 — AI Optimize

**Files:**
- Create: `integration-test/steps/step6-ai-optimize.ts`

- [ ] **Step 1: Create `integration-test/steps/step6-ai-optimize.ts`**

```typescript
import { GeminiFileService } from '../../packages/backend/src/services/gemini-file-service';
import type {
  GigaB2BCrawlResult,
  AmazonProductResult,
  XiyouzhaociResult,
  AiOptimizeResult,
  PipelineOptions,
} from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

/**
 * Step 6: AI Optimize — generate optimized listing via Gemini
 *
 * Builds the same prompt as api-server.ts:787-809.
 * Uses GeminiFileService.chat() which requires Google login in browser profile.
 */

function buildOptimizePrompt(
  title: string,
  step4: AmazonProductResult,
  step5: XiyouzhaociResult,
): string {
  // Competitor section
  const competitorSection = `
## 竞品 Listing 分析（Top 1）

### 竞品 1: ${step4.brand ? step4.brand + ' — ' : ''}${step4.title}
- 价格: $${step4.price} | 评分: ${step4.rating}星
- 五点描述:
${(step4.bulletPoints || []).slice(0, 3).map((b, i) => `  ${i + 1}. ${String(b).slice(0, 150)}`).join('\n')}

分析要点: 提取竞品共性卖点、差异化方向、关键词覆盖策略
`;

  // Keyword section
  const keywordSection = step5.keywords.length > 0
    ? `\n## 关键词数据\n${step5.keywords.slice(0, 15).map((k, i) => `${i + 1}. ${k.keyword} (搜索量: ${k.searchVolume || '-'}, 难度: ${k.difficulty || '-'})`).join('\n')}`
    : '';

  return `你是一位资深的 Amazon 跨境电商 Listing 优化专家。请根据以下商品信息和竞品数据，优化文案。

## 我的商品信息
- 标题: ${title}

${competitorSection}${keywordSection}

## 输出要求

请严格按以下结构输出 JSON:
{
  "optimizedTitle": "200字符以内的优化标题",
  "optimizedBulletPoints": ["五点1", "五点2", "五点3", "五点4", "五点5"],
  "optimizedLongDescription": "300-500字长描述",
  "seoKeywords": ["关键词1", "关键词2", ...],
  "competitorAnalysis": "竞品分析总结"
}

语气: 专业、可信、突出品质
只输出 JSON，不要其他文字`;
}

function parseOptimizeResponse(response: string): AiOptimizeResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        optimizedTitle: parsed.optimizedTitle || '',
        optimizedBulletPoints: parsed.optimizedBulletPoints || [],
        optimizedLongDescription: parsed.optimizedLongDescription || '',
        seoKeywords: parsed.seoKeywords || [],
        competitorAnalysis: parsed.competitorAnalysis || '',
        rawResponse: response,
      };
    }
  } catch {
    // fall through to raw parse
  }

  // Fallback: raw text
  return {
    optimizedTitle: response.split('\n')[0]?.slice(0, 200) || '',
    optimizedBulletPoints: [],
    optimizedLongDescription: response.slice(0, 1000),
    seoKeywords: [],
    competitorAnalysis: '',
    rawResponse: response,
  };
}

export async function runStep6(
  step1Data: GigaB2BCrawlResult,
  step4Data: AmazonProductResult,
  step5Data: XiyouzhaociResult,
  options: PipelineOptions,
): Promise<AiOptimizeResult> {
  info('Building optimization prompt...');

  const prompt = buildOptimizePrompt(step1Data.title, step4Data, step5Data);

  const service = new GeminiFileService();
  try {
    info('Sending to Gemini...');
    const result = await service.chat(prompt, {
      headless: options.headless,
      responseTimeout: 90000,
    });

    if (!result.success) {
      throw new StepError(6, 'AI Optimize', result.error || 'Gemini returned failure');
    }

    return parseOptimizeResponse(result.response);
  } finally {
    await service.close();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd integration-test && npx tsc --noEmit steps/step6-ai-optimize.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add integration-test/steps/step6-ai-optimize.ts
git commit -m "feat(integration-test): add step 6 AI listing optimization via Gemini"
```

---

## Task 11: Main orchestrator (`run-pipeline.ts`)

**Files:**
- Create: `integration-test/run-pipeline.ts`

- [ ] **Step 1: Create `integration-test/run-pipeline.ts`**

```typescript
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import type { PipelineContext, PipelineOptions } from './lib/pipeline-types';
import {
  header,
  divider,
  stepStart,
  stepSuccess,
  stepError,
  stepSkipped,
  dataSnapshot,
  info,
  summary,
} from './lib/logger';
import { runStep1 } from './steps/step1-gigab2b-crawl';
import { runStep2 } from './steps/step2-ai-vision';
import { runStep3 } from './steps/step3-amazon-search';
import { runStep4 } from './steps/step4-amazon-product';
import { runStep5 } from './steps/step5-xiyouzhaoci';
import { runStep6 } from './steps/step6-ai-optimize';

// ─── CLI argument parser ─────────────────────────────────────

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  const options: PipelineOptions = {
    mock: false,
    headless: false,
    skipTo: 0,
    envPath: path.resolve(__dirname, '..', 'packages', 'backend', '.env'),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mock') options.mock = true;
    else if (arg === '--headless') options.headless = true;
    else if (arg === '--real-crawl' && args[i + 1]) {
      options.mock = false;
      options.realCrawlUrl = args[++i];
    } else if (arg === '--skip-to' && args[i + 1]) {
      options.skipTo = parseInt(args[++i], 10);
    } else if (arg === '--env' && args[i + 1]) {
      options.envPath = args[++i];
    }
  }

  return options;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();

  // Load env from backend .env
  if (fs.existsSync(options.envPath)) {
    dotenv.config({ path: options.envPath });
    info(`Loaded env from ${options.envPath}`);
  } else {
    dotenv.config(); // fallback: look for .env in cwd
  }

  header(options);

  // Validate prerequisites
  if (!process.env.DASHSCOPE_API_KEY) {
    info('⚠️  DASHSCOPE_API_KEY not set — Step 2 (AI Vision) will fail');
  }

  const ctx: PipelineContext = {};
  const pipelineStart = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // ─── Step 1: GigaB2B Crawl ────────────────────────────────
  if (options.skipTo <= 1) {
    stepStart(1, 'GigaB2B Crawl');
    try {
      const t = Date.now();
      ctx.step1 = await runStep1(options);
      stepSuccess(1, 'GigaB2B Crawl', Date.now() - t);
      dataSnapshot('Step 1 output', { title: ctx.step1.title, images: ctx.step1.images.length, source: ctx.step1.source });
      passed++;
    } catch (err) {
      stepError(1, 'GigaB2B Crawl', err);
      failed++;
    }
  } else {
    stepSkipped(1, 'GigaB2B Crawl', '--skip-to');
    skipped++;
  }

  // ─── Step 2: AI Vision ────────────────────────────────────
  if (ctx.step1 && options.skipTo <= 2) {
    stepStart(2, 'AI Vision');
    try {
      const t = Date.now();
      ctx.step2 = await runStep2(ctx.step1, options);
      stepSuccess(2, 'AI Vision', Date.now() - t);
      dataSnapshot('Step 2 output', { analyses: ctx.step2.analyses.length, template: ctx.step2.templateUsed });
      passed++;
    } catch (err) {
      stepError(2, 'AI Vision', err);
      failed++;
    }
  } else {
    stepSkipped(2, 'AI Vision', !ctx.step1 ? 'no Step 1 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 3: Amazon Search ────────────────────────────────
  if (ctx.step1 && options.skipTo <= 3) {
    stepStart(3, 'Amazon Search');
    try {
      const t = Date.now();
      ctx.step3 = await runStep3(ctx.step1, options);
      stepSuccess(3, 'Amazon Search', Date.now() - t);
      dataSnapshot('Step 3 output', { keyword: ctx.step3.keyword, asins: ctx.step3.asins.length, total: ctx.step3.total });
      passed++;
    } catch (err) {
      stepError(3, 'Amazon Search', err);
      failed++;
    }
  } else {
    stepSkipped(3, 'Amazon Search', !ctx.step1 ? 'no Step 1 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 4: Amazon Product ───────────────────────────────
  if (ctx.step3 && options.skipTo <= 4) {
    stepStart(4, 'Amazon Product');
    try {
      const t = Date.now();
      ctx.step4 = await runStep4(ctx.step3, options);
      stepSuccess(4, 'Amazon Product', Date.now() - t);
      dataSnapshot('Step 4 output', { asin: ctx.step4.asin, title: ctx.step4.title?.slice(0, 60), brand: ctx.step4.brand });
      passed++;
    } catch (err) {
      stepError(4, 'Amazon Product', err);
      failed++;
    }
  } else {
    stepSkipped(4, 'Amazon Product', !ctx.step3 ? 'no Step 3 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 5: Xiyouzhaoci ──────────────────────────────────
  if (ctx.step4 && options.skipTo <= 5) {
    stepStart(5, 'Xiyouzhaoci');
    try {
      const t = Date.now();
      ctx.step5 = await runStep5(ctx.step4, options);
      stepSuccess(5, 'Xiyouzhaoci', Date.now() - t);
      dataSnapshot('Step 5 output', { asin: ctx.step5.asin, totalKeywords: ctx.step5.totalKeywords });
      passed++;
    } catch (err) {
      stepError(5, 'Xiyouzhaoci', err);
      failed++;
    }
  } else {
    stepSkipped(5, 'Xiyouzhaoci', !ctx.step4 ? 'no Step 4 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 6: AI Optimize ──────────────────────────────────
  if (ctx.step1 && ctx.step4 && ctx.step5 && options.skipTo <= 6) {
    stepStart(6, 'AI Optimize');
    try {
      const t = Date.now();
      ctx.step6 = await runStep6(ctx.step1, ctx.step4, ctx.step5, options);
      stepSuccess(6, 'AI Optimize', Date.now() - t);
      dataSnapshot('Step 6 output', { optimizedTitle: ctx.step6.optimizedTitle?.slice(0, 80), seoKeywords: ctx.step6.seoKeywords.length });
      passed++;
    } catch (err) {
      stepError(6, 'AI Optimize', err);
      failed++;
    }
  } else {
    const missing = [];
    if (!ctx.step1) missing.push('Step 1');
    if (!ctx.step4) missing.push('Step 4');
    if (!ctx.step5) missing.push('Step 5');
    stepSkipped(6, 'AI Optimize', missing.length > 0 ? `missing ${missing.join(', ')}` : '--skip-to');
    skipped++;
  }

  // ─── Summary ──────────────────────────────────────────────
  summary(passed, failed, skipped, Date.now() - pipelineStart);

  // ─── Save results ─────────────────────────────────────────
  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const resultFile = path.join(outputDir, `pipeline-result-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(ctx, null, 2), 'utf-8');
  info(`Result saved to: ${resultFile}`);

  // Exit with error if any step failed
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Pipeline crashed:', err);
  process.exit(2);
});
```

- [ ] **Step 2: Verify full TypeScript compilation**

Run: `cd integration-test && npx tsc --noEmit`
Expected: no errors across all files

- [ ] **Step 3: Commit**

```bash
git add integration-test/run-pipeline.ts
git commit -m "feat(integration-test): add main pipeline orchestrator with CLI args and logging"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Run pipeline in mock mode (AI Vision only, no browser)**

Run: `cd integration-test && npx tsx run-pipeline.ts --mock --headless 2>&1 | head -40`
Expected: Step 1 (MOCK) succeeds, Step 2 (AI Vision) calls DashScope API, Steps 3-6 are skipped or fail gracefully (headless + no Amazon cookies)
Expected output contains:
```
── Step 1/6: GigaB2B Crawl ──────────────
  [MOCK] Using predefined product data
  ✅ Success
── Step 2/6: AI Vision ──────────────────
  Analyzing image 1/1...
  ✅ Success
```

- [ ] **Step 2: Check output file was created**

Run: `ls integration-test/output/`
Expected: `pipeline-result-*.json` file exists

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add integration-test/
git commit -m "fix(integration-test): smoke test fixes"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 6 pipeline steps implemented
- [x] Data flows from each step to the next
- [x] Mock fallback for step 1
- [x] CLI args: --mock, --headless, --real-crawl, --skip-to, --env
- [x] Logging at every step boundary
- [x] Result saved to JSON file
- [x] No database dependency

**2. Placeholder scan:**
- [x] No TBD/TODO
- [x] All code blocks contain actual code
- [x] All file paths are exact

**3. Type consistency:**
- [x] `PipelineContext.step1` = `GigaB2BCrawlResult` — matches step1 return type
- [x] `PipelineContext.step4` = `AmazonProductResult` — matches `AmazonProductData` from backend (compatible)
- [x] `runStep3()` receives `GigaB2BCrawlResult`, uses `.title` — correct
- [x] `runStep4()` receives `AmazonSearchResult`, uses `.asins[0]` — correct
- [x] `runStep5()` receives `AmazonProductResult`, uses `.asin` — correct
- [x] `runStep6()` receives `GigaB2BCrawlResult + AmazonProductResult + XiyouzhaociResult` — correct
