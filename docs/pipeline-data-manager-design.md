# Pipeline Data Manager — Design Document

## 1. Overview

The Pipeline Data Manager provides a visual interface for browsing, inspecting, editing, and AI-reviewing data from the 6-step integration test pipeline. It turns raw JSON files into a structured, type-safe, editable experience.

## 2. Problem Statement

### Current State
- Pipeline runs save JSON files to `runs/<timestamp>/` — 13 files per run (metadata + 6 input/output pairs)
- No type validation — data is `JSON.parse` with type cast, no runtime checks
- Input snapshots are **lossy** — curated summaries, not full step outputs, making replay impossible
- Step 4 type doesn't match actual output (4 undeclared fields)
- Step 4 `specifications` contains Amazon JS code (2000+ chars)
- Step 4 `bestSellersRank` is `string[]` but should be structured objects
- Step 6 `rawResponse` has "Gemini 说" prefix pollution
- No way to visually inspect or edit step data without opening JSON files

### Target State
- Strict TypeScript types + Zod schemas for all step data
- Backend REST API for CRUD operations with validation
- Frontend pages: run list (table) → step editor (typed forms) → AI review panel
- Complete input snapshots for step replay capability

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Electron)                         │
│                                               │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Run List  │→│ Step Editor│→│ AI Review  │ │
│  │ (table)  │ │ (forms)    │ │ (panel)    │ │
│  └──────────┘ └────────────┘ └────────────┘ │
│         fetch() API calls                     │
├─────────────────────────────────────────────┤
│  Backend API (Hono)                          │
│                                               │
│  GET /api/pipeline/runs                       │
│  GET /api/pipeline/runs/:id                   │
│  GET /api/pipeline/runs/:id/steps/:num       │
│  PUT /api/pipeline/runs/:id/steps/:num       │
│  POST /api/pipeline/runs/:id/review          │
│                                               │
│  pipeline-run-service.ts (reads JSON files)  │
│  pipeline-review-service.ts (AI audit)       │
│  pipeline-schemas.ts (Zod validation)         │
├─────────────────────────────────────────────┤
│  Storage (filesystem JSON)                   │
│  runs/<timestamp>/step{N}-{input|output}.json│
└─────────────────────────────────────────────┘
```

## 4. Data Model

### 4.1 Corrected Step Output Types

**Step 1 — GigaB2BCrawlResult** (unchanged, matches actual):
```typescript
{
  title: string;              // from specifications["Product Name"]
  price: string;              // can be empty
  description: string;        // can be empty
  images: string[];           // filtered, max 2
  specifications: Record<string, string>;
  url: string;
  source: 'gigab2b-crawl' | 'mock-data';
}
```

**Step 2 — AiVisionResult** (unchanged):
```typescript
{
  analyses: string[];         // per-image analysis (long text)
  searchKeywords: string[];   // 3-5 extracted keywords
  templateUsed: string;
  model: string;
}
```

**Step 3 — AmazonSearchResult** (unchanged):
```typescript
{
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}
```

**Step 4 — AmazonProductResult** (CORRECTED):
```typescript
{
  asin: string;
  title: string;
  brand: string;
  price: string;
  rating: string;
  reviewCount: string;         // NEW — actual: "(1)"
  bulletPoints: string[];
  longDescription: string;
  images: string[];
  specifications: Record<string, string>;
  bestSellersRank: BestSellersRankEntry[];  // CHANGED — was string[]
  url: string;                 // NEW
  colors: string[];            // NEW
  timestamp: string;           // NEW — ISO timestamp
}

interface BestSellersRankEntry {
  category: string;           // "Home & Kitchen"
  rank: number;               // 776925
  subRank?: number;           // 582
  subCategory?: string;       // "Beds"
}
```

**Step 5 — XiyouzhaociResult** (unchanged):
```typescript
{
  asin: string;
  keywords: Array<{ rank: number; keyword: string; searchVolume: string | null; difficulty: string | null; trafficShare: string | null }>;
  totalKeywords: number;
}
```

**Step 6 — AiOptimizeResult** (unchanged):
```typescript
{
  optimizedTitle: string;
  optimizedBulletPoints: string[];
  optimizedLongDescription: string;
  seoKeywords: string[];
  competitorAnalysis: string;
  rawResponse: string;
}
```

### 4.2 Input Snapshot Schema (FIXED — complete)

Each step's input = full previous step output (not curated summary):

| Step | Input = Previous Output |
|------|----------------------|
| 1 | `PipelineOptions` (CLI args) |
| 2 | Full `Step1Output` |
| 3 | `{ ...Full Step2Output, fallbackTitle: Step1.title }` |
| 4 | Full `Step3Output` |
| 5 | Full `Step4Output` |
| 6 | `{ step1Data: Full Step1Output, step4Data: Full Step4Output, step5Data: Full Step5Output }` |

### 4.3 Review Finding Type

```typescript
interface ReviewFinding {
  severity: 'error' | 'warning' | 'info';
  stepNum: number;
  field: string;              // e.g. "brand", "specifications.Customer Reviews"
  message: string;            // human-readable issue description
  suggestion: string;         // how to fix
  fixAction?: string;         // e.g. "copy-brand-from-specs", "remove-field"
  fixValue?: unknown;         // value to apply
}
```

## 5. Field Type → UI Control Mapping

| Field Type | Control | Fields |
|-----------|---------|--------|
| `shortText` | `<input>` | title, brand, price, rating, asin, keyword |
| `longText` | `<textarea rows={6}>` | description, longDescription, competitorAnalysis, analyses[] |
| `stringArray` | TagInput (chips + add) | bulletPoints, seoKeywords, searchKeywords, asins |
| `objectMap` | KV table (editable) | specifications |
| `objectArray` | Data table | keywords (Step 5), bestSellersRank |
| `imageArray` | Image grid + add URL | images |

## 6. Frontend Pages

### 6.1 Run List (`PipelineDataPage`)

Paginated table following `AllDataTable.tsx` pattern:
- Columns: Run ID, Product Title, Status (6 colored dots), Duration, Start Time
- Filter: status dropdown, title search
- Click row → step editor

### 6.2 Step Editor (`PipelineStepEditor`)

Two-panel layout:
- **Left sidebar**: 6 step buttons with status badges
- **Right area**: Tab switcher (Input/Output) + field editors + toolbar (Save/Reset/AI Review)
- Each field renders the appropriate control based on type mapping

### 6.3 AI Review Panel (`AIReviewPanel`)

Slide-in panel showing findings:
- Severity badges (red/amber/blue)
- Each finding with message + suggestion + "Apply Fix" button
- Fix actions modify local state (user must Save to persist)

## 7. API Endpoints

```
GET  /api/pipeline/runs                            → { runs: [...], total: number }
GET  /api/pipeline/runs/:runId                     → RunMetadata + step summaries
GET  /api/pipeline/runs/:runId/steps/:stepNum      → { data: StepOutput, validation: {...} }
PUT  /api/pipeline/runs/:runId/steps/:stepNum      → { success: boolean, validation: {...} }
POST /api/pipeline/runs/:runId/review              → { findings: ReviewFinding[] }
```

## 8. Implementation Phases

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| 1 | Data types + Zod schemas + fix input snapshots | None |
| 2 | Backend API (service + routes + AI review) | Phase 1 |
| 3 | Frontend run list page | Phase 2 |
| 4 | Frontend step editor + field renderers | Phase 3 |
| 5 | AI review panel integration | Phase 4 |

Each phase is independently shippable and testable.

## 9. Files

### New files (12):
1. `packages/backend/integration-test/lib/pipeline-schemas.ts`
2. `packages/backend/src/services/pipeline-run-service.ts`
3. `packages/backend/src/routes/pipeline-data-routes.ts`
4. `packages/backend/src/services/pipeline-review-service.ts`
5. `packages/frontend/src/pages/PipelineDataPage.tsx`
6. `packages/frontend/src/pages/PipelineStepEditor.tsx`
7. `packages/frontend/src/pages/PipelineDataPage/FieldRenderers.tsx`
8. `packages/frontend/src/pages/PipelineDataPage/stepEditorConfigs.ts`
9. `packages/frontend/src/pages/PipelineDataPage/TagInput.tsx`
10. `packages/frontend/src/pages/PipelineDataPage/ImageGridEditor.tsx`
11. `packages/frontend/src/pages/PipelineDataPage/ObjectMapEditor.tsx`
12. `packages/frontend/src/pages/PipelineDataPage/AIReviewPanel.tsx`

### Modified files (5):
1. `packages/backend/integration-test/lib/pipeline-types.ts`
2. `packages/backend/integration-test/run-pipeline.ts`
3. `packages/backend/src/api-server.ts`
4. `packages/frontend/src/App.tsx`
5. `packages/frontend/src/data/navItems.ts`
