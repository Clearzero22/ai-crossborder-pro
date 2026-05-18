# Workflow Engine Data Passing & Debugging — Deep Analysis Report

**Date:** 2026-05-19
**Scope:** `packages/frontend/src/engine/` and related files
**Status:** Analysis complete, implementation plan attached

---

## Table of Contents

1. [Problem Overview](#1-problem-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [DataBus Analysis](#3-databus-analysis)
4. [WorkflowEngine Execution Flow Analysis](#4-workflowengine-execution-flow-analysis)
5. [Node Executor Data Passing Audit](#5-node-executor-data-passing-audit)
6. [useWorkflowState Hook Analysis](#6-useworkflowstate-hook-analysis)
7. [Backend Persistence Analysis](#7-backend-persistence-analysis)
8. [Problem Catalog (8 Issues)](#8-problem-catalog)
9. [Problem-File Mapping](#9-problem-file-mapping)
10. [Solution Design](#10-solution-design)
11. [File Change List](#11-file-change-list)
12. [Verification Plan](#12-verification-plan)

---

## 1. Problem Overview

The workflow engine's data passing between nodes has **8 critical issues** that cause:

- **Data loss**: Nodes only receive the immediately previous node's output. Data from 2+ steps back is invisible.
- **Fake data**: Mock executors return hardcoded data, ignoring upstream input entirely.
- **Broken debugging**: `testNode()` clears all data, making mid-workflow debugging impossible.
- **Silent failures**: No schema validation, no error data tracking, no warnings on upstream failures.
- **Dead features**: Template expressions (`{{nodeId.field}}`) exist but are never invoked.

---

## 2. Architecture Overview

### 2.1 Data Flow Diagram

```
User clicks "Run"
       │
       ▼
useWorkflowState.startExecution()          ← hooks/useWorkflowState.ts:260
       │
       ├─→ persist() → POST /api/workflow/executions   (fire-and-forget)
       │
       └─→ engine.execute(workflowNodes, callbacks, ...)  ← engine/WorkflowEngine.ts:88
                │
                ├─→ dataBus.clear()                        ← line 99 (ALWAYS, even for testNode)
                │
                └─→ FOR EACH step node (sequential):
                        │
                        ├─→ callbacks.onNodeStatus(nodeId, 'running')  → React setState
                        │
                        ├─→ input = dataBus.getOutput(stepNodes[i-1].id) ?? {}  ← line 142
                        │       ⚠️ ONLY immediate predecessor's output!
                        │       allOutputs = dataBus.getAllOutputs()                 ← line 148
                        │
                        ├─→ config = { ...(nodeConfigs[node.id] ?? {}), ...globalConfig }  ← line 146
                        │       ⚠️ globalConfig overrides node-specific config!
                        │
                        ├─→ output = executor.execute({ nodeId, config, input, allOutputs, logger, abortSignal })
                        │
                        ├─→ dataBus.setOutput(node.id, output)   ← line 155 (ONLY on success)
                        │       ⚠️ Error nodes never stored!
                        │
                        ├─→ callbacks.onNodeOutput(nodeId, output) → React setState + persist
                        │
                        └─→ callbacks.onLog(level, nodeId, nodeLabel, message)
```

### 2.2 Key File Map

| File | Lines | Role |
|------|-------|------|
| `engine/DataBus.ts` | 36 | In-memory key-value store for node outputs |
| `engine/WorkflowEngine.ts` | 203 | Sequential node executor |
| `engine/types.ts` | 59 | `NodeContext`, `NodeExecutor`, `EngineCallbacks` interfaces |
| `engine/pluginTypes.ts` | 26 | `NodePlugin` interface (extends NodeExecutor) |
| `engine/pluginRegistry.ts` | — | Singleton registry for all plugins |
| `engine/mockExecutors/index.ts` | 248 | 7 mock executors (dev/test) |
| `engine/realExecutors/webhookExecutor.ts` | — | Real webhook executor (unregistered) |
| `engine/realExecutors/claudeOptimizeExecutor.ts` | — | Real Claude executor (unregistered, orphaned) |
| `hooks/useWorkflowState.ts` | 503 | Core React hook: state + execution lifecycle |
| `types.ts` (frontend root) | — | `WorkflowState`, `LogEntry`, `StepOutput` types |
| `components/ConfigPanel.tsx` | — | Right panel: config/data/logs tabs |
| `plugins/index.ts` | ~1360 | Plugin definitions with inline executors |

### 2.3 Two Execution Channels

| Channel | How it works | Used by |
|---------|-------------|---------|
| **Mock executors** | Return hardcoded data with artificial delay | 7 browser nodes (open-amazon, extract-info, etc.) |
| **Plugin inline executors** | Call backend API via `fetch()` | ai-optimize, gigab2b-crawl, amazon-search, amazon-product, xiyouzhaoci, etc. |

---

## 3. DataBus Analysis

**File:** `packages/frontend/src/engine/DataBus.ts` (36 lines)

```typescript
export class DataBus {
  private outputs = new Map<string, Record<string, unknown>>();

  setOutput(nodeId: string, data: Record<string, unknown>): void { ... }     // line 9
  getOutput(nodeId: string): Record<string, unknown> | undefined { ... }    // line 13
  resolve(template: string): unknown { ... }   // line 18 — DEAD CODE, never called
  getAllOutputs(): Record<string, Record<string, unknown>> { ... }          // line 29
  clear(): void { ... }                                                      // line 33
}
```

### 3.1 Issues Found

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | `resolve()` is dead code | **Critical** | Supports `{{nodeId.fieldName}}` template syntax but is NEVER called anywhere in the codebase. Not in any executor, hook, or component. |
| 2 | No error tracking | **Medium** | When a node fails, there is no record of the error in DataBus. The node ID is simply absent from the outputs Map. |
| 3 | No config resolution | **Medium** | `resolve()` only works on string templates, but there is no method to walk an entire config object and resolve all template strings recursively. |

### 3.2 How `resolve()` Works (Dead Code)

```typescript
// DataBus.ts:18-26
resolve(template: string): unknown {
  return template.replace(/\{\{([^.}]+)\.([^}]+)\}\}/g, (_match, nodeId, field) => {
    const output = this.outputs.get(nodeId);
    if (output && field in output) {
      return String(output[field]);
    }
    return _match;  // Unresolved templates left as-is
  });
}
```

Regex: `\{\{([^.}]+)\.([^}]+)\}\}` matches `{{nodeId.fieldName}}` and extracts `nodeId` and `fieldName`.

---

## 4. WorkflowEngine Execution Flow Analysis

**File:** `packages/frontend/src/engine/WorkflowEngine.ts` (203 lines)

### 4.1 The Critical Data Passing Code (Lines 141-155)

```typescript
// Line 142: ONLY gets the immediate predecessor's output
const previousOutput = i > 0 ? this.dataBus.getOutput(stepNodes[i - 1].id) : undefined;

const output = await executor.execute({
  nodeId: node.id,
  // Line 146: globalConfig OVERRIDES node-specific config (wrong order!)
  config: { ...(nodeConfigs[node.id] ?? {}), ...globalConfig },
  input: previousOutput ?? {},       // Line 147: Empty object for first node
  allOutputs: this.dataBus.getAllOutputs(),  // Line 148: ALL outputs, but separate from input
  logger: (level, msg) => callbacks.onLog(level, node.id, node.label, msg),
  abortSignal: signal,
});

// Line 155: ONLY stored on success — error nodes are silently dropped
this.dataBus.setOutput(node.id, output);
```

### 4.2 The Error Handling Code (Lines 174-178)

```typescript
} catch (err) {
  if (signal.aborted) break;
  callbacks.onNodeStatus(node.id, 'error');
  callbacks.onLog('error', node.id, node.label, `失败: ${err instanceof Error ? err.message : '未知错误'}`);
  // ⚠️ NO dataBus.setOutput() — error node output is lost
  // ⚠️ NO dataBus.setError() — error is not recorded
  // ⚠️ Execution CONTINUES to next node (no break)
}
```

### 4.3 The DataBus Clear (Line 99)

```typescript
this.dataBus.clear();  // ALWAYS cleared, even when startIndex > 0 (testNode)
```

### 4.4 Data Reception Logging (Lines 122-133)

```typescript
const previousStep = stepNodes[i - 1];
if (previousStep) {
  const prevOutput = this.dataBus.getOutput(previousStep.id);
  if (prevOutput) {
    const summary = Object.entries(prevOutput)
      .slice(0, 2)                                              // Only first 2 fields
      .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)      // Truncated to 40 chars
      .join(', ');
    callbacks.onLog('info', 'system', '系统', `← 接收数据: ${summary}`);
  }
}
```

---

## 5. Node Executor Data Passing Audit

### 5.1 Mock Executors (`engine/mockExecutors/index.ts`, 248 lines)

| Executor | Type | Uses `ctx.input`? | Returns | Problem |
|----------|------|-------------------|---------|---------|
| `openAmazonMock` | `open-amazon` | No | Hardcoded URL, title, `pageLoaded: true` | None — it's the first node, no upstream data expected |
| **`extractInfoMock`** | `extract-info` | **No** | Hardcoded title, price, images, ASIN, brand | **Critical: ignores `ctx.input` entirely** |
| `aiOptimizeMock` | `ai-optimize` | Partial | Uses `ctx.input.title` only | Ignores other fields from upstream |
| `openShopifyMock` | `open-shopify` | No | Hardcoded shop domain, login status | None — independent step |
| `fillInfoMock` | `fill-info` | Yes | Uses `ctx.input.optimizedTitle`, `ctx.input.optimizedDescription` | Correct pattern |
| `uploadImagesMock` | `upload-images` | Yes | Uses `ctx.input.images` | Correct pattern |
| `publishMock` | `publish` | **No** | Hardcoded URL, status, timestamp | **Does NOT read `ctx.input.filledTitle`** — returns hardcoded data regardless of upstream |

### 5.2 Plugin Inline Executors (`plugins/index.ts`)

| Plugin | Type | Data Sources Used | Notes |
|--------|------|-------------------|-------|
| `aiOptimizePlugin` | `ai-optimize` | `config > input > allOutputs` | Most complex: iterates `allOutputs` looking for `nodeId.startsWith('amazon-product')` and `nodeId.startsWith('xiyouzhaoci')` |
| `xiyouzhaociPlugin` | `xiyouzhaoci` | `ctx.input` + transparent forwarding | Reads `ctx.input.title`, `ctx.input.brand`, etc. and includes them in output for downstream nodes |
| `amazonProductPlugin` | `amazon-product` | `config > input > allOutputs` | Priority chain for ASIN: `ctx.config.asin > ctx.config.productUrl > ctx.input.asins[0] > ctx.input.links[0]` |
| `gigab2bCrawlPlugin` | `gigab2b-crawl` | `config` only | Doesn't read `ctx.input` at all |
| `amazonSearchPlugin` | `amazon-search` | `config` only | Doesn't read `ctx.input` at all |

### 5.3 Orphaned Real Executors

| Executor | File | Status |
|----------|------|--------|
| `claudeOptimizeExecutor` | `realExecutors/claudeOptimizeExecutor.ts` | **Never registered** — orphaned code, duplicates `aiOptimizePlugin` |
| `webhookExecutor` | `realExecutors/webhookExecutor.ts` | **Never registered** — unreachable |

---

## 6. useWorkflowState Hook Analysis

**File:** `packages/frontend/src/hooks/useWorkflowState.ts` (503 lines)

### 6.1 State Structure

```typescript
interface WorkflowState {
  selectedNodeId: string | null;
  executing: boolean;
  currentStep: number;
  totalSteps: number;
  nodeStatuses: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  stepOutputs: Record<string, StepOutput>;     // ← Output only, NO input recorded
  executionLogs: LogEntry[];
  workflowNodeIds: string[];
  executionMode: 'auto' | 'manual';
  waitingForNext: boolean;
  waitingNodeId: string | null;
  // ⚠️ Missing: stepInputs — no record of what data each node actually received
}
```

### 6.2 `startExecution()` (Line 260)

```typescript
// Resets ALL execution state:
setState(prev => ({
  ...prev,
  executing: true,
  currentStep: 0,
  totalSteps: stepNodeCount,
  activeTab: 'logs',
  executionLogs: [],
  nodeStatuses: Object.fromEntries(workflowNodes.map(n => [n.id, 'idle'] as const)),
  stepOutputs: {},   // ← Clears all previous outputs
}));
```

Key callbacks:
- `onNodeOutput` (line 307): Stores output in `state.stepOutputs` + calls `persist()`
- `onNodeStatus` (line 298): Updates `state.nodeStatuses`
- `onLog` (line 335): Adds to `state.executionLogs`
- `onComplete` (line 341): Marks execution complete + calls `persist()`

### 6.3 `testNode()` (Line 386) — The Broken Debugger

```typescript
const testNode = useCallback((nodeId: string) => {
  const stepNodes = workflowNodes.filter(n => n.type === 'step');
  const startIndex = stepNodes.findIndex(n => n.id === nodeId);

  // ⚠️ Problem 1: Does NOT reset stepOutputs — UI state inconsistent with engine state
  //              (stepOutputs retains old data, but dataBus.clear() wipes engine data)
  // ⚠️ Problem 2: Does NOT pre-populate DataBus — upstream data is missing
  // ⚠️ Problem 3: engine.execute() calls dataBus.clear() internally → ALL engine data lost
  // ⚠️ Problem 4: No persist() calls — test execution is never recorded in backend
  // ⚠️ Problem 5: Uses state.executionMode which may be stale

  engine.execute(workflowNodes, callbacks, startIndex, nodeConfigsRef.current, { headless }, state.executionMode);
}, [...]);
```

### 6.4 `persist()` (Line 28) — Silent Fire-and-Forget

```typescript
async function persist(url: string, body: Record<string, unknown>) {
  try {
    await fetch(url, { method: ..., headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { /* fire-and-forget — ALL errors silently swallowed */ }
}
```

### 6.5 `addLog()` (Line 192) — Capped at 100

```typescript
const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
  setState(prev => ({
    ...prev,
    executionLogs: [
      { ...entry, id: `log-${Date.now()}-${Math.random()...}`, timestamp: now() },
      ...prev.executionLogs,
    ].slice(0, 100),   // ⚠️ Only keeps 100 most recent logs — debug logs will push out useful ones
  }));
}, []);
```

---

## 7. Backend Persistence Analysis

### 7.1 Database Schema

**File:** `packages/backend/src/core/drivers/sqlite-driver.ts`

Three workflow-related tables:

```sql
-- workflow_executions: top-level execution record
CREATE TABLE IF NOT EXISTS workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT UNIQUE NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  total_steps INT DEFAULT 0,
  success_steps INT DEFAULT 0,
  error_steps INT DEFAULT 0,
  duration_ms INT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- workflow_step_records: per-step input/output/config
CREATE TABLE IF NOT EXISTS workflow_step_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT NOT NULL,
  step_index INT NOT NULL,
  node_id TEXT NOT NULL,
  node_label TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  input_data TEXT,      -- JSON (TEXT in SQLite)
  output_data TEXT,     -- JSON (TEXT in SQLite)
  config_data TEXT,     -- JSON (TEXT in SQLite)
  duration_ms INT,
  error TEXT,
  logs TEXT,            -- JSON (TEXT in SQLite)
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- workflow_execution_logs: individual log entries
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT NOT NULL,
  node_id TEXT,
  node_label TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 7.2 Persistence Gaps

| Gap | Details |
|-----|---------|
| `input_data` never persisted | `persist('/api/workflow/steps', ...)` only sends `output_data`, `config_data`, `duration_ms`. It does NOT send `input_data`. |
| `testNode()` never persists | The testNode callback has no `persist()` calls at all. |
| Log level mismatch | DB schema allows any TEXT for `level`, but frontend only sends `'info'`, `'success'`, `'error'`. New `'debug'`/`'warn'` levels will be stored fine. |
| No structured data in logs | `workflow_execution_logs.message` is TEXT only — no structured JSON data field. |

### 7.3 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/workflow/executions` | Create execution record |
| GET | `/api/workflow/executions` | List executions (paginated) |
| GET | `/api/workflow/executions/:id` | Get execution with steps + logs |
| PUT | `/api/workflow/executions/:id/complete` | Mark complete (aggregates step counts) |
| POST | `/api/workflow/steps` | Write step data |
| GET | `/api/workflow/steps/:node_id/history` | Node execution history |
| POST | `/api/workflow/logs` | Batch-write logs |
| GET | `/api/workflow/stats` | Dashboard statistics |

---

## 8. Problem Catalog

### Problem 1: Data Loss — Only Immediate Predecessor Output Passed

**Severity:** Critical
**File:** `engine/WorkflowEngine.ts:142`

```typescript
const previousOutput = i > 0 ? this.dataBus.getOutput(stepNodes[i - 1].id) : undefined;
```

**Impact:** If a node needs data from 2+ steps back (not the immediate predecessor), those fields are missing from `ctx.input`. The executor must manually search `ctx.allOutputs` — but this is inconsistent across executors.

**Example:**
```
Node 1 (amazon-search) → output: { keywords: [...], links: [...] }
Node 2 (amazon-product) → output: { title: "...", price: 99, images: [...] }
Node 3 (ai-optimize) → ctx.input = { title, price, images }  ← Node 2's output only
                          ctx.input.keywords = undefined  ← Lost! From Node 1
```

---

### Problem 2: Mock Executors Return Hardcoded Data

**Severity:** Critical
**File:** `engine/mockExecutors/index.ts:36-71` (`extractInfoMock`)

```typescript
async execute(ctx) {
  ctx.logger('info', '正在提取商品信息...');
  await delay(600 + Math.random() * 800);
  // ⚠️ ctx.input is NEVER read!
  return {
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',  // Hardcoded
    price: 349.99,
    // ... all hardcoded
  };
}
```

**Impact:** During development, downstream nodes always receive the same fake data regardless of what upstream nodes actually produce. This makes it impossible to test real data flows.

---

### Problem 3: testNode() Clears DataBus — Mid-Workflow Debugging Broken

**Severity:** Critical
**Files:** `engine/WorkflowEngine.ts:99`, `hooks/useWorkflowState.ts:386-455`

When `testNode(nodeId)` is called:
1. `engine.execute(workflowNodes, callbacks, startIndex, ...)` is called
2. Inside `execute()`, line 99: `this.dataBus.clear()` — ALL data is wiped
3. The target node and all subsequent nodes receive empty `ctx.input` and empty `ctx.allOutputs`

**Impact:** Cannot debug individual nodes in the middle of a workflow. Any node that depends on upstream data will fail or produce empty results when tested.

---

### Problem 4: No Schema Validation at Engine Level

**Severity:** High
**File:** `engine/WorkflowEngine.ts:141-155`

The `inputSchema` and `outputSchema` defined on each `NodeExecutor` are **never validated**:
- Type mismatches are silently accepted (e.g., `number` where `string` is expected)
- Missing required fields go undetected until an executor crashes at runtime
- Schemas are purely for UI rendering (config panel generation)

---

### Problem 5: Poor Debugging Visibility

**Severity:** High
**Files:** `engine/types.ts`, `types.ts`, `hooks/useWorkflowState.ts:192`

| Issue | Details |
|-------|---------|
| Only 3 log levels | `info`, `success`, `error` — no `debug` or `warn` |
| No structured data logging | Log entries only carry text messages, no data snapshots |
| No input recording | `state.stepOutputs` only records output — no record of what each node received as input |
| Log cap of 100 | Debug logs would push out useful execution logs |
| Fire-and-forget persist | Backend failures are invisible — `catch {}` swallows all errors |
| testNode has no persistence | Test executions are never recorded in the database |

---

### Problem 6: Error Nodes Silently Lose Data

**Severity:** Medium
**File:** `engine/WorkflowEngine.ts:174-178`

When a node throws an error:
1. `callbacks.onNodeStatus(node.id, 'error')` — status set to error
2. `callbacks.onLog('error', ...)` — error message logged
3. **Execution continues** to the next node (no `break`)
4. The errored node's output is **never stored** in DataBus
5. The next node receives the output from the node *before* the errored one
6. **No warning** is given to the next node about the missing data

---

### Problem 7: Template Expressions Are Dead Code

**Severity:** Medium
**File:** `engine/DataBus.ts:18-26`

The `resolve()` method supports `{{nodeId.fieldName}}` syntax but:
- Is never called from any executor
- Is never called from any hook
- Is never called from any component
- Is not exposed on `NodeContext` interface
- Has no mechanism to walk config objects (only works on single strings)

---

### Problem 8: Config Key Shadowing

**Severity:** Low
**File:** `engine/WorkflowEngine.ts:146`

```typescript
config: { ...(nodeConfigs[node.id] ?? {}), ...globalConfig },
```

The spread order means `globalConfig` **overrides** per-node config when keys collide. Currently `globalConfig` only passes `{ headless }`, but any future global key (e.g., `url`, `keyword`) would silently override node-specific values.

---

## 9. Problem-File Mapping

| File | Problems | Severity |
|------|----------|----------|
| `engine/WorkflowEngine.ts:142` | #1 (only predecessor input), #6 (no error tracking), #8 (config shadowing) | Critical |
| `engine/WorkflowEngine.ts:99` | #3 (always clear DataBus) | Critical |
| `engine/mockExecutors/index.ts:51-71` | #2 (extractInfoMock ignores input) | Critical |
| `engine/DataBus.ts:18-26` | #7 (resolve() dead code) | Medium |
| `engine/types.ts` | #4 (no validation), #5 (limited log levels) | High |
| `hooks/useWorkflowState.ts:386` | #3 (testNode clears data), #5 (no input recording, log cap) | Critical |
| `hooks/useWorkflowState.ts:28` | #5 (silent persist failures) | Medium |
| `types.ts` (frontend root) | #5 (missing stepInputs, limited LogEntry) | High |
| `components/ConfigPanel.tsx` | #5 (no debug/warn colors, no template hints) | Medium |

---

## 10. Solution Design

### Phase 1: Fix DataBus and Core Data Passing (Problems 1, 6, 7, 8)

#### Step 1.1: Enhance DataBus

**File:** `engine/DataBus.ts`

Add:
```typescript
private errors = new Map<string, { error: Error; timestamp: Date }>();

setError(nodeId: string, error: Error): void {
  this.errors.set(nodeId, { error, timestamp: new Date() });
}
getError(nodeId: string): Error | undefined { ... }
hasError(nodeId: string): boolean { ... }

/** Resolve {{nodeId.field}} in entire config object recursively */
resolveConfig(config: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = this.resolve(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      resolved[key] = this.resolveConfig(value as Record<string, unknown>);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}
```

#### Step 1.2: Fix WorkflowEngine Execution Loop

**File:** `engine/WorkflowEngine.ts`

Changes:
1. **Conditional clear**: `if (startIndex === 0) this.dataBus.clear()`
2. **Merged input**: Merge ALL upstream outputs instead of only predecessor
3. **Config spread order**: `{ ...globalConfig, ...(nodeConfigs[node.id] ?? {}) }`
4. **Template resolution**: Call `dataBus.resolveConfig(rawConfig)` on config
5. **Error tracking**: `dataBus.setError(node.id, err)` on catch
6. **Upstream error warning**: Log warning to next node about failed upstream

```typescript
// Replace lines 141-155 with:
const allUpstream = this.dataBus.getAllOutputs();

// Check upstream errors
const upstreamErrors = Object.keys(allUpstream).filter(id => this.dataBus.hasError(id));
if (upstreamErrors.length > 0) {
  callbacks.onLog('warn', node.id, node.label,
    `警告: 上游节点 ${upstreamErrors.join(', ')} 执行失败，部分数据可能缺失`);
}

// Merge all upstream outputs (later node wins on collision)
const mergedInput: Record<string, unknown> = {};
for (const output of Object.values(allUpstream)) {
  Object.assign(mergedInput, output);
}

// Resolve template expressions in config
const rawConfig = { ...globalConfig, ...(nodeConfigs[node.id] ?? {}) };
const config = this.dataBus.resolveConfig(rawConfig);

const output = await executor.execute({
  nodeId: node.id,
  config,
  input: mergedInput,
  allOutputs: allUpstream,
  logger: (level, msg) => callbacks.onLog(level, node.id, node.label, msg),
  abortSignal: signal,
});

// In catch block:
this.dataBus.setError(node.id, err instanceof Error ? err : new Error(String(err)));
```

#### Step 1.3: Add preloadDataBus method

**File:** `engine/WorkflowEngine.ts`

```typescript
preloadDataBus(outputs: Record<string, { data: Record<string, unknown> }>): void {
  for (const [nodeId, stepOutput] of Object.entries(outputs)) {
    this.dataBus.setOutput(nodeId, stepOutput.data);
  }
}
```

---

### Phase 2: Fix testNode() (Problem 3)

**File:** `hooks/useWorkflowState.ts`

In `testNode()`, before `engine.execute(...)`:
```typescript
// Pre-populate DataBus with upstream step outputs
engine.preloadDataBus(
  Object.fromEntries(
    stepNodes.slice(0, startIndex).map(n => [n.id, state.stepOutputs[n.id]])
      .filter(([, v]) => v != null) as [string, StepOutput][]
  )
);
```

---

### Phase 3: Add Schema Validation (Problem 4)

**New file:** `engine/validate.ts`

```typescript
import type { FieldDef } from './types';

export interface ValidationError {
  field: string;
  message: string;
  expected: string;
  actual: string;
}

export function validateData(
  data: Record<string, unknown>,
  schema: Record<string, FieldDef>,
  label: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const [field, def] of Object.entries(schema)) {
    if (def.required && (data[field] === undefined || data[field] === null)) {
      errors.push({ field, message: `${label}: 缺少必填字段 "${field}"`, expected: def.type, actual: 'undefined' });
      continue;
    }
    if (data[field] !== undefined && data[field] !== null) {
      const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
      const schemaType = def.type === 'string[]' ? 'array' : def.type;
      if (schemaType === 'number' && actualType !== 'number') {
        errors.push({ field, message: `${label}: "${field}" 应为 ${def.type}`, expected: def.type, actual });
      }
    }
  }
  return errors;
}
```

Integration in `WorkflowEngine.ts`:
```typescript
// Before executor.execute():
if (Object.keys(executor.inputSchema).length > 0) {
  const inputErrors = validateData(mergedInput, executor.inputSchema, node.label);
  for (const err of inputErrors) {
    callbacks.onLog('warn', node.id, node.label, err.message);
  }
}

// After executor.execute() succeeds:
if (Object.keys(executor.outputSchema).length > 0) {
  const outputErrors = validateData(output, executor.outputSchema, node.label);
  for (const err of outputErrors) {
    callbacks.onLog('warn', node.id, node.label, err.message);
  }
}
```

---

### Phase 4: Improve Debugging Visibility (Problem 5)

#### Step 4.1: Extend Log Levels

**File:** `engine/types.ts`
```typescript
// Change from:
onLog: (level: 'info' | 'success' | 'error', nodeId: string, nodeLabel: string, message: string) => void;
// To:
onLog: (level: 'debug' | 'info' | 'warn' | 'success' | 'error', nodeId: string, nodeLabel: string, message: string, data?: Record<string, unknown>) => void;
```

**File:** `types.ts` (frontend root)
```typescript
// Extend LogEntry:
level: 'debug' | 'info' | 'warn' | 'success' | 'error';
data?: Record<string, unknown>;  // Optional structured data

// Add to WorkflowState:
stepInputs: Record<string, StepOutput>;  // Records what each node actually received
```

#### Step 4.2: Add onNodeInput Callback

**File:** `engine/types.ts`
```typescript
onNodeInput?: (nodeId: string, input: Record<string, unknown>) => void;
```

**File:** `engine/WorkflowEngine.ts`
```typescript
callbacks.onNodeInput?.(node.id, mergedInput);
```

#### Step 4.3: Emit Structured Debug Logs

**File:** `engine/WorkflowEngine.ts`

After building `mergedInput`:
```typescript
callbacks.onLog('debug', node.id, node.label, '接收输入数据', {
  inputKeys: Object.keys(mergedInput),
  inputPreview: Object.fromEntries(
    Object.entries(mergedInput).slice(0, 5).map(([k, v]) => [
      k, typeof v === 'string' ? v.slice(0, 100) : Array.isArray(v) ? `[${v.length}项]` : v,
    ])
  ),
  upstreamNodeCount: Object.keys(allUpstream).length,
});
```

After successful execution:
```typescript
callbacks.onLog('debug', node.id, node.label, '产生输出数据', {
  outputKeys: Object.keys(output),
  outputPreview: Object.fromEntries(
    Object.entries(output).slice(0, 5).map(([k, v]) => [
      k, typeof v === 'string' ? v.slice(0, 100) : Array.isArray(v) ? `[${v.length}项]` : v,
    ])
  ),
});
```

#### Step 4.4: Increase Log Cap

**File:** `hooks/useWorkflowState.ts:198`
```typescript
// Change from .slice(0, 100) to:
].slice(0, 500),
```

#### Step 4.5: Fix persist() to Log Failures

**File:** `hooks/useWorkflowState.ts:28`
```typescript
async function persist(url: string, body: Record<string, unknown>) {
  try {
    const resp = await fetch(url, { ... });
    if (!resp.ok) console.warn(`[持久化失败] ${url} → HTTP ${resp.status}`);
  } catch (err) {
    console.warn(`[持久化失败] ${url}`, err);
  }
}
```

#### Step 4.6: Update ConfigPanel

**File:** `components/ConfigPanel.tsx`

Add debug/warn log colors:
```typescript
const logColors = {
  debug: 'text-gray-400', info: 'text-blue-600', warn: 'text-amber-600',
  success: 'text-green-600', error: 'text-red-600',
};
const logBg = {
  debug: 'bg-gray-50', info: 'bg-blue-50', warn: 'bg-amber-50',
  success: 'bg-green-50', error: 'bg-red-50',
};
```

Use `stepInputs` for Data Tab input display.

---

### Phase 5: Fix Mock Executors (Problem 2)

**File:** `engine/mockExecutors/index.ts`

Fix `extractInfoMock` to use `ctx.input`:
```typescript
async execute(ctx) {
  ctx.logger('info', '正在提取商品信息...');
  await delay(600 + Math.random() * 800);
  if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');

  // Use upstream data when available, fall back to defaults
  return {
    title: (ctx.input.title as string) || 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    price: (ctx.input.price as number) || 349.99,
    currency: 'USD',
    rating: (ctx.input.rating as number) || 4.7,
    // ... etc
  };
}
```

---

## 11. File Change List

| File | Action | Lines Changed (est.) | Problems Fixed |
|------|--------|---------------------|----------------|
| `engine/DataBus.ts` | Modify | +30 | #6, #7 |
| `engine/WorkflowEngine.ts` | Modify | +50, -10 | #1, #3, #6, #7, #8 |
| `engine/validate.ts` | **Create** | +35 | #4 |
| `engine/types.ts` | Modify | +5 | #4, #5 |
| `types.ts` (frontend root) | Modify | +5 | #5 |
| `hooks/useWorkflowState.ts` | Modify | +40, -5 | #3, #5 |
| `engine/mockExecutors/index.ts` | Modify | +15, -10 | #2 |
| `components/ConfigPanel.tsx` | Modify | +20 | #5 |

**Total: 1 new file, 7 modified files, ~200 lines changed**

---

## 12. Verification Plan

### V1: Data Passing (Problem 1)
- Create a workflow with 4+ step nodes
- Run the workflow
- Click on node 4, switch to Data tab
- **Expected:** Input shows data from nodes 1, 2, and 3 (merged)

### V2: testNode Preservation (Problem 3)
- Run full workflow successfully
- Click "Test" on node 3
- **Expected:** Node 3 and subsequent nodes receive correct upstream data from the full run

### V3: Template Expressions (Problem 7)
- Set a downstream node's string config to `{{extract-info.title}}`
- Run workflow
- **Expected:** Config value resolves to the actual title from extract-info's output

### V4: Schema Validation (Problem 4)
- Temporarily modify a mock executor to omit a required output field
- Run workflow
- **Expected:** Warning log appears: "缺少必填字段 'fieldName'"

### V5: Error Data Tracking (Problem 6)
- Temporarily make a node throw an error
- **Expected:** (a) Error logged, (b) next node receives warning about upstream failure, (c) data from nodes before the error is still available

### V6: Debug Visibility (Problem 5)
- Run workflow, switch to Logs tab
- Toggle debug logs on
- **Expected:** Debug logs show input/output key names, upstream node count, data previews

### V7: Config Shadowing (Problem 8)
- Set `headless: true` in global config and `headless: false` in node-specific config
- **Expected:** Node uses `false` (node-specific wins)

### V8: Mock Executor Data Flow (Problem 2)
- Run workflow with mock executors
- Verify `extractInfoMock` reads from `ctx.input` and returns data based on upstream output

---

**End of Report**
