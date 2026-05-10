# Workflow Engine 真实业务集成设计文档

> **For Claude:** 使用 subagent-driven-development 按阶段逐步实施。

**目标:** 将当前 Mock 工作流引擎解耦为三层架构（UI → Engine → Adapters），支持接入真实业务逻辑

**架构原则:**
- 严格分层：UI 只管理视图状态，Engine 负责执行调度，Adapter 对接外部服务
- 接口驱动：定义清晰的 `NodeExecutor`、`NodeContext`、`DataBus` 接口
- 渐进替换：Phase 1 解耦不改功能，Phase 2-4 逐步替换为真实集成

---

## 当前架构问题

```
useWorkflowState Hook (UI 状态 + 模拟执行 全部混在一起)
  ├── nodeStatuses        ← UI 状态
  ├── stepOutputs         ← 模拟数据
  ├── startExecution()    ← 模拟执行
  └── runNode()           ← setTimeout + Math.random()
```

**致命缺陷:** 执行逻辑和 UI 状态紧耦合，`stepSimulations.ts` 的硬编码数据无法被真实 API 替换。

---

## 目标架构：三层分离

```
┌──────────────────────────────────────────────────────────────┐
│                    Layer 1: UI 层 (React)                     │
│  WorkflowEditor → Canvas → Nodes → ConfigPanel               │
│  useWorkflowState: 只管理 UI 状态 (选中、展开、步骤计数)        │
│  useWorkflowRunner: 桥接 UI ↔ Engine (状态同步)               │
├──────────────────────────────────────────────────────────────┤
│                    Layer 2: 执行引擎 (Engine)                   │
│  WorkflowEngine: 调度器、队列、重试、超时、持久化               │
│  NodeExecutor: 节点执行器注册表                                 │
│  DataBus: 数据总线 (步骤间数据传递)                              │
├──────────────────────────────────────────────────────────────┤
│                    Layer 3: 集成层 (Adapters)                   │
│  BrowserAdapter (Playwright/Puppeteer)                        │
│  AIAdapter (OpenAI / Claude API)                              │
│  CommerceAdapter (Amazon API / Shopify API)                   │
│  FileAdapter (文件存储 S3/Local)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 核心接口设计

### NodeExecutor (开发者实现)

```typescript
interface NodeContext {
  nodeId: string;
  config: Record<string, unknown>;   // 用户配置的参数
  input: Record<string, unknown>;     // 上一步的输出数据
  logger: (level, message) => void;   // 运行日志
  abortSignal: AbortSignal;           // 取消信号
  secrets: Record<string, string>;    // API Key (不存前端)
}

interface NodeExecutor {
  type: string;                          // 全局唯一标识
  label: string;
  icon: string;
  category: 'browser' | 'ai' | 'data' | 'flow';

  // Schema —— 自动生成 UI 表单 + 数据校验
  inputSchema: Record<string, FieldDef>;
  outputSchema: Record<string, FieldDef>;
  configSchema: Record<string, FieldDef>;

  // 核心：执行逻辑
  execute(ctx: NodeContext): Promise<Record<string, unknown>>;
}
```

### 节点输入输出映射

| 节点 | 输入 | 输出 | 用户配置 |
|------|------|------|---------|
| open-amazon | 无 | `{ pageTitle, pageUrl }` | `{ productUrl }` |
| extract-info | `{ pageTitle }` | `{ title, price, images }` | `{ selector }` |
| ai-optimize | `{ title, description }` | `{ optimizedTitle }` | `{ model, tone, language }` |
| open-shopify | 无 | `{ shopDomain, session }` | `{ shopUrl, credentials }` |
| fill-info | `{ title, price }` | `{ filledTitle }` | `{ templateId }` |
| upload-images | `{ images }` | `{ uploadedCount, urls }` | `{ altText }` |
| publish | `{ filledTitle }` | `{ publishedUrl }` | `{ publishMode }` |

### WorkflowEngine

```typescript
class WorkflowEngine {
  private registry: Map<string, NodeExecutor>;
  private abortControllers: Map<string, AbortController>;

  register(executor: NodeExecutor): void;

  async execute(
    workflow: { nodes: WorkflowNode[]; edges: Edge[] },
    callbacks: {
      onNodeStatus(nodeId, status): void;
      onNodeOutput(nodeId, output): void;
      onLog(entry): void;
      onProgress(current, total): void;
    }
  ): Promise<void>;

  abort(workflowId: string): void;
}
```

### DataBus (数据总线)

```typescript
interface DataBus {
  getOutput(nodeId: string): Record<string, unknown>;
  setOutput(nodeId: string, data: Record<string, unknown>): void;
  // 表达式支持: {{extract-info.price}} → 自动替换
  resolveExpression(template: string): unknown;
}
```

---

## 运行时架构（前后端分离）

```
┌─── 浏览器 (React) ──────────────────────────────────┐
│  WorkflowEditor (UI)                                  │
│  useWorkflowState (选中、展开、视图状态)                │
│  useWorkflowClient (通过 WebSocket 连接 Engine)        │
│     ↓                                 ↑               │
│     │  POST /api/workflow/execute      │  WebSocket   │
│     │  { nodes, config }              │  事件推送      │
└─────┼──────────────────────────────────┼──────────────┘
      │                                  │
┌─────▼──────────────────────────────────▼──────────────┐
│  后端服务 (Node.js)                                     │
│                                                        │
│  POST /api/workflow/execute                             │
│    → WorkflowEngine.run()                               │
│    → 为每个节点创建 AbortController                       │
│    → 串行/并行执行节点                                    │
│    → 通过 WebSocket 推送事件给前端:                       │
│        { type: 'node:running', nodeId }                 │
│        { type: 'node:success', nodeId, output }         │
│        { type: 'log', level, message }                  │
│        { type: 'progress', current, total }             │
│    → 持久化到数据库: workflows, executions, outputs      │
│                                                        │
│  GET /api/workflow/templates                            │
│  POST /api/workflow/save                                │
│  GET /api/workflow/:id/executions                       │
└────────────────────────────────────────────────────────┘
```

---

## 用户交互流程

```
1. 选择模板
   ┌─────────────────────┐
   │ 跨境电商上新模板      │ ← 预置 Amazon→Shopify
   │ 社交媒体同步模板      │
   │ 商品监控模板          │
   └─────────────────────┘

2. 拖拽配置节点
   ┌─────────────────────┐
   │ [打开亚马逊]          │
   │  URL: amazon.com/…  │ ← 表单 (从 configSchema 自动生成)
   │ [AI优化文案]          │
   │  模型: claude-3.5    │
   │  语气: 专业           │
   └─────────────────────┘

3. 点击运行 → 实时可视化
   ┌─────────────────────┐
   │ 步骤 3/7             │ ← Header 进度
   │ [运行中] AI优化文案   │ ← 高亮节点 + 脉冲动画
   │ [已完成] 提取商品信息  │ ← 绿色节点
   │ [等待]  打开Shopify   │ ← 灰色节点
   └─────────────────────┘

4. 查看结果
   ┌─────────────────────┐
   │ 已完成: 7/7          │
   │ 发布链接: shopify... │
   │ 执行耗时: 23.4s      │
   └─────────────────────┘
```

---

## 开发者接入新业务

### 开发一个真实节点（示例）

```typescript
// src/engine/executors/aiOptimizeExecutor.ts
import { NodeExecutor } from '../../types';

export const aiOptimizeExecutor: NodeExecutor = {
  type: 'ai-optimize',
  label: 'AI 优化商品文案',
  icon: 'zap',
  category: 'ai',

  configSchema: {
    model: {
      type: 'select', label: 'AI 模型',
      default: 'claude-3.5',
      options: ['gpt-4', 'claude-3.5'],
    },
    tone: {
      type: 'select', label: '语气',
      default: '专业',
      options: ['专业', '活泼', '简洁'],
    },
  },

  inputSchema: {
    title: { type: 'string', label: '原标题', required: true },
    description: { type: 'string', label: '原描述' },
  },

  outputSchema: {
    optimizedTitle: { type: 'string', label: '优化标题' },
    optimizedDescription: { type: 'string', label: '优化描述' },
  },

  async execute(ctx) {
    ctx.logger('info', `调用 AI 模型: ${ctx.config.model}`);
    const response = await callAIAPI(ctx.config.model, {
      input: ctx.input,
      signal: ctx.abortSignal,
    });
    ctx.logger('success', `AI 优化完成`);
    return response;
  },
};
```

### 注册节点

```typescript
const registry = new NodeRegistry();
registry.register(aiOptimizeExecutor);
registry.register(openAmazonExecutor);
// ...
```

---

## 迁移路线图

### Phase 1: 解耦引擎 (当前阶段)
- [ ] 创建 `src/engine/` 目录结构
- [ ] 定义 `NodeExecutor`、`NodeContext`、`DataBus` 接口
- [ ] 将 `stepSimulations.ts` 改为实现 `NodeExecutor` 接口的 MockExecutor
- [ ] 创建 `WorkflowEngine` 类替代 `startExecution/runNode`
- [ ] 新增 `useWorkflowRunner` hook 桥接 Engine ↔ UI
- [ ] `useWorkflowState` 只保留 UI 状态
- [ ] 验证：功能不变，所有交互正常

### Phase 2: 后端搭建
- [ ] Express/Fastify 服务
- [ ] WebSocket (Socket.io)
- [ ] PostgreSQL/SQLite 存工作流定义 + 执行记录
- [ ] 用户登录 + API Key 管理
- [ ] REST API 暴露工作流 CRUD

### Phase 3: 真实集成
- [ ] BrowserAdapter (Playwright) —— 云浏览器服务
- [ ] AIAdapter (OpenAI/Claude SDK)
- [ ] Shopify API Adapter
- [ ] 替换 mock 执行器为真实执行器
- [ ] Secret 管理（加密存储 API Key）

### Phase 4: 生产化
- [ ] 错误重试 + 超时
- [ ] 执行历史 + 回放
- [ ] 节点并行执行
- [ ] 条件分支 (if/else)
- [ ] 模板市场
- [ ] 用量统计 + 计费

---

## 关键设计决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 执行引擎位置 | 后端 Node.js | 浏览器无法跑 Playwright，无法安全存 API Key |
| 前后端通信 | WebSocket | 实时推送执行事件，支持取消 |
| 节点配置 vs 编码 | 配置驱动 + Schema | 用户不需要写代码，所有节点通过表单配置 |
| 数据流 | 隐式自动传递 + 显式表达式 | 90% 场景自动匹配，复杂场景支持 `{{nodeId.field}}` |
| 节点扩展性 | 插件式注册 | 第三方可以开发自定义节点 |
| Secrets 管理 | 后端加密存储，前端不接触 | 安全合规 |
