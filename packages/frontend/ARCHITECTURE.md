# Workflow Editor - 架构文档

**最后更新:** 2026-04-30  
**版本:** 1.0.0  
**作者:** AI Development Team

---

## 目录

1. [项目概述](#项目概述)
2. [整体架构](#整体架构)
3. [目录结构](#目录结构)
4. [核心模块](#核心模块)
5. [数据流向](#数据流向)
6. [节点插件系统](#节点插件系统)
7. [工作流引擎](#工作流引擎)
8. [技术栈](#技术栈)
9. [设计模式](#设计模式)
10. [开发指南](#开发指南)

---

## 项目概述

Workflow Editor 是一个**可视化工作流自动化系统**,专为跨境电商场景设计。用户可以通过拖拽节点、配置参数,构建复杂的自动化工作流,实现从数据抓取、AI处理到自动发布的全流程自动化。

**核心特性:**
- 🎨 可视化拖拽式工作流编辑器
- 🔌 插件化节点系统,轻松扩展功能
- 🤖 集成AI能力(图片识别、文案优化)
- 🌐 浏览器自动化(Playwright驱动)
- 📊 实时执行状态监控
- 💾 工作流版本管理和持久化

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Workflow Editor 系统架构                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   前端 (Frontend)    │         │   后端 (Backend)     │       │
│  │                     │         │                     │       │
│  │  React 18 + TS      │◄───────►│  Hono + Node/Bun    │       │
│  │  Vite + Tailwind    │   API   │  Port: 3456         │       │
│  │  Port: 5173         │         │                     │       │
│  └─────────────────────┘         └─────────────────────┘       │
│            ↓                              ↓                      │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   页面层 (10页)      │         │   API 服务层         │       │
│  │   - WorkflowPage    │         │   - Dashboard       │       │
│  │   - DataDashboard   │         │   - Keywords        │       │
│  │   - AIPage          │         │   - Crawler         │       │
│  └─────────────────────┘         └─────────────────────┘       │
│            ↓                              ↓                      │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   工作流引擎         │         │   数据库层           │       │
│  │   - WorkflowEngine  │         │   - PostgreSQL       │       │
│  │   - DataBus         │         │   (可选)            │       │
│  │   - PluginRegistry  │         │                     │       │
│  └─────────────────────┘         └─────────────────────┘       │
│            ↓                                                      │
│  ┌─────────────────────┐                                       │
│  │   节点插件系统       │                                       │
│  │   (16个已注册节点)   │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
workflow-editor/
├── 📁 src/                          # 源代码根目录
│   │
│   ├── 📁 components/               # UI组件库 (34个组件)
│   │   ├── 📁 icons/               # 图标组件 (40+ SVG图标)
│   │   │   ├── IconAI.tsx          # AI图标
│   │   │   ├── IconGlobe.tsx       # 地球图标
│   │   │   ├── IconZap.tsx         # 闪电图标
│   │   │   └── index.ts            # 图标导出
│   │   │
│   │   ├── Canvas.tsx              # 工作流画布组件
│   │   ├── WorkflowNode.tsx        # 节点渲染组件
│   │   ├── ConfigPanel.tsx         # 节点配置面板
│   │   ├── NodePanel.tsx           # 左侧节点选择面板
│   │   ├── Layout.tsx              # 应用布局组件
│   │   ├── Header.tsx              # 顶部操作栏
│   │   ├── Sidebar.tsx             # 侧边导航栏
│   │   ├── NavMenu.tsx             # 导航菜单
│   │   ├── NodeConnector.tsx       # 节点连接器
│   │   ├── NodeGroup.tsx           # 节点分组
│   │   ├── NodeSearch.tsx          # 节点搜索
│   │   ├── StepGuide.tsx           # 步骤引导
│   │   ├── TestButton.tsx          # 测试按钮
│   │   └── ...
│   │
│   ├── 📁 pages/                    # 页面组件 (10个页面)
│   │   ├── WorkflowPage.tsx        # ⭐ 工作流编辑器主页
│   │   ├── HomePage.tsx            # 首页概览
│   │   ├── DataDashboardPage.tsx   # 数据仪表板
│   │   ├── ExecutionDataPage.tsx   # 执行历史
│   │   ├── AIPage.tsx              # AI助手页面
│   │   ├── BrowserPage.tsx         # 浏览器自动化页面
│   │   ├── TasksPage.tsx           # 任务列表
│   │   ├── TemplatesPage.tsx       # 模板市场
│   │   ├── IntegrationsPage.tsx    # 集成中心
│   │   ├── SettingsPage.tsx        # 系统设置
│   │   └── PlaceholderPage.tsx     # 占位页面
│   │
│   ├── 📁 engine/                   # 🔧 核心工作流引擎
│   │   ├── WorkflowEngine.ts       # 引擎主类
│   │   ├── DataBus.ts              # 数据传递总线
│   │   ├── pluginRegistry.ts       # 插件注册表
│   │   ├── pluginTypes.ts          # 插件类型定义
│   │   ├── types.ts                # 核心类型定义
│   │   ├── 📁 mockExecutors/       # Mock执行器(开发用)
│   │   │   └── index.ts            # 模拟执行逻辑
│   │   └── 📁 realExecutors/       # 真实执行器(生产用)
│   │       ├── claudeOptimizeExecutor.ts  # Claude优化执行器
│   │       └── webhookExecutor.ts         # Webhook执行器
│   │
│   ├── 📁 plugins/                  # 🔌 节点插件定义
│   │   └── index.ts                # 16个节点插件注册
│   │
│   ├── 📁 context/                  # React Context
│   │   └── PlanContext.tsx         # 计划上下文(WebSocket)
│   │
│   ├── 📁 hooks/                    # 自定义React Hooks
│   │   ├── useWorkflowState.ts     # 工作流状态管理
│   │   ├── useTheme.tsx            # 主题切换
│   │   └── usePlanWebSocket.ts     # WebSocket连接
│   │
│   ├── 📁 services/                 # API服务层
│   │   ├── dashboardService.ts     # 仪表板API服务
│   │   ├── planService.ts          # 计划API服务
│   │   └── mockDashboardData.ts    # 模拟仪表板数据
│   │
│   ├── 📁 types/                    # TypeScript类型定义
│   │   ├── dashboard.ts            # 仪表板类型
│   │   ├── plan.ts                 # 计划类型
│   │   └── index.ts                # 通用类型
│   │
│   ├── 📁 data/                     # 静态数据
│   │   ├── configData.ts           # 配置数据
│   │   ├── navItems.ts             # 导航菜单项
│   │   └── stepGuide.ts            # 步骤引导数据
│   │
│   ├── 📁 utils/                    # 工具函数
│   │   └── planGuard.ts            # 计划守卫工具
│   │
│   ├── 📁 styles/                   # 样式文件
│   │   └── index.css               # 全局样式
│   │
│   ├── App.tsx                     # ⭐ 应用根组件
│   ├── main.tsx                    # 应用入口
│   └── vite-env.d.ts               # Vite环境类型
│
├── 📁 backend/                      # 后端服务
│   ├── server.ts                   # Hono服务器入口
│   ├── 📁 api/                      # API路由
│   │   ├── dashboard.ts            # 仪表板端点
│   │   │   ├── GET  /stats         # 统计数据
│   │   │   ├── GET  /executions    # 执行记录
│   │   │   ├── GET  /trend         # 趋势数据
│   │   │   └── GET  /user          # 用户信息
│   │   └── keywords.ts             # 关键词端点
│   │       └── POST /xiyouzhaoci   # 西柚找词爬虫
│   ├── 📁 services/                 # 业务逻辑层
│   │   ├── dashboardStats.ts       # 仪表板统计服务
│   │   └── xiyouzhaociService.ts   # 西柚找词服务
│   ├── 📁 db/                       # 数据库层
│   │   └── index.ts                # PostgreSQL客户端
│   └── 📁 types/                    # 后端类型定义
│
├── 📁 docs/                         # 文档目录
│   └── plans/                      # 设计文档
│
├── vite.config.ts                   # Vite配置
├── tailwind.config.js               # Tailwind CSS配置
├── tsconfig.json                    # TypeScript配置
├── postcss.config.js                # PostCSS配置
├── package.json                     # 项目依赖配置
├── .env.example                     # 环境变量示例
└── .gitignore                       # Git忽略文件
```

---

## 核心模块

### 1. 工作流引擎 (WorkflowEngine)

**文件:** `src/engine/WorkflowEngine.ts`

**职责:**
- 顺序执行工作流节点
- 管理节点执行状态
- 处理数据传递(DataBus)
- 支持中止和错误处理

**核心方法:**
```typescript
class WorkflowEngine {
  // 注册执行器
  register(executor: NodeExecutor): void
  
  // 执行工作流
  async execute(
    nodes: EngineNode[],
    callbacks: EngineCallbacks,
    startIndex?: number,
    nodeConfigs?: Record<string, Record<string, unknown>>,
    globalConfig?: Record<string, unknown>
  ): Promise<void>
  
  // 获取执行器
  getExecutor(type: string): NodeExecutor | undefined
  
  // 中止执行
  abort(): void
}
```

### 2. 数据总线 (DataBus)

**文件:** `src/engine/DataBus.ts`

**职责:**
- 在节点间传递数据
- 存储每个节点的输出
- 提供数据访问接口

**核心方法:**
```typescript
class DataBus {
  // 设置节点输出
  setOutput(nodeId: string, output: Record<string, unknown>): void
  
  // 获取节点输出
  getOutput(nodeId: string): Record<string, unknown> | undefined
  
  // 清空所有数据
  clear(): void
  
  // 获取所有输出
  getAllOutputs(): Record<string, Record<string, unknown>>
}
```

### 3. 插件注册表 (PluginRegistry)

**文件:** `src/engine/pluginRegistry.ts`

**职责:**
- 管理所有节点插件
- 提供插件查询接口
- 支持批量注册

**核心方法:**
```typescript
class PluginRegistry {
  // 注册单个插件
  register(plugin: NodePlugin): void
  
  // 批量注册
  registerAll(plugins: NodePlugin[]): void
  
  // 获取插件
  get(id: string): NodePlugin | undefined
  
  // 获取所有插件
  getAll(): NodePlugin[]
  
  // 按分类获取
  getByCategory(category: string): NodePlugin[]
}
```

---

## 数据流向

```
┌──────────────────────────────────────────────────────────────┐
│                      工作流执行数据流                          │
└──────────────────────────────────────────────────────────────┘

用户点击"执行"
      ↓
┌─────────────────┐
│ useWorkflowState│ → state.executing = true
│ Hook            │ → callbacks.onProgress(0, total)
└─────────────────┘
      ↓
┌─────────────────────────┐
│ WorkflowEngine.execute  │
└─────────────────────────┘
      ↓
┌──────────────────────────────────────────────────────────┐
│  循环执行每个 Step 节点                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  节点 N 执行流程:                                │    │
│  │                                                  │    │
│  │  1. callbacks.onNodeStatus(nodeId, 'running')  │    │
│  │  2. 从 DataBus 获取上一个节点的输出             │    │
│  │  3. executor.execute({                         │    │
│  │       input: previousOutput,                   │    │
│  │       config: nodeConfigs[nodeId],             │    │
│  │       logger: logger,                          │    │
│  │       abortSignal: signal                      │    │
│  │     })                                          │    │
│  │  4. DataBus.setOutput(nodeId, result)          │    │
│  │  5. callbacks.onNodeOutput(nodeId, result)     │    │
│  │  6. callbacks.onNodeStatus(nodeId, 'success')  │    │
│  │  7. callbacks.onProgress(current + 1, total)   │    │
│  └─────────────────────────────────────────────────┘    │
│                     ↓                                    │
│            继续下一个节点                                 │
└──────────────────────────────────────────────────────────┘
      ↓
所有节点完成
      ↓
┌─────────────────────────┐
│ callbacks.onComplete()  │ → state.executing = false
└─────────────────────────┘
```

**数据优先级规则:**
```
配置值(config) > 上游节点输出(input) > 默认值(default)

示例: ai-optimize 节点的 title 字段
1. 如果用户在节点配置中填写了 productTitle → 使用配置值
2. 否则,如果上游节点输出了 title → 使用上游值
3. 否则 → 使用 undefined 或默认值
```

---

## 节点插件系统

### 插件接口定义

**文件:** `src/engine/pluginTypes.ts`

```typescript
export interface NodePlugin {
  id: string;                    // 唯一标识符
  label: string;                 // 显示名称
  description: string;           // 功能描述
  icon: string;                  // 图标名称
  category: 'browser' | 'ai' | 'data' | 'flow';  // 分类
  nodeType: 'start' | 'end' | 'step';           // 节点类型
  panelGroup?: string;           // 面板分组
  panelColor?: string;           // 面板颜色
  executor: NodeExecutor;        // 执行器
}

export interface NodeExecutor {
  type: string;                  // 执行器类型
  label: string;                 // 标签
  icon: string;                  // 图标
  category: string;              // 分类
  
  // Schema 定义
  inputSchema: Record<string, FieldDef>;      // 输入字段定义
  outputSchema: Record<string, FieldDef>;     // 输出字段定义
  configSchema: Record<string, FieldDef>;     // 配置字段定义
  
  // 执行函数
  execute(ctx: NodeContext): Promise<Record<string, unknown>>;
}

export interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret';
  label: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
}
```

### 已注册的16个节点

| 节点ID | 名称 | 分类 | 面板 | 功能描述 |
|--------|------|------|------|----------|
| `start` | 开始节点 | flow | - | 工作流起点,初始化执行环境 |
| `gigab2b-crawl` | GigaB2B爬虫 | browser | browser | 从GigaB2B抓取商品数据并保存到数据库 |
| `ai-vision` | AI图片识别 | ai | ai | 使用AI识别电商图片内容(标题、价格、规格等) |
| `amazon-search` | Amazon竞品搜索 | browser | browser | 使用关键词在Amazon搜索竞品,获取ASIN列表 |
| `amazon-product` | Amazon商品详情 | browser | browser | 抓取Amazon商品完整详情(标题、价格、品牌等) |
| `xiyouzhaoci-keywords` | 西柚找词 | browser | browser | 从西柚找词抓取Amazon商品关键词数据 |
| `extract-info` | 提取商品信息 | browser | browser | 从已打开页面提取标题、价格、图片等 |
| `ai-optimize` | AI优化文案 | ai | ai | 使用AI优化商品标题和描述 |
| `view-runs` | 查看运行记录 | data | data | 查看所有爬虫运行历史 |
| `open-shopify` | 打开Shopify | browser | browser | 登录并打开Shopify后台商品创建页面 |
| `fill-info` | 填写商品信息 | browser | browser | 自动填写优化后的商品信息 |
| `upload-images` | 上传图片 | browser | browser | 批量上传商品图片到Shopify |
| `publish` | 发布商品 | browser | browser | 发布商品到Shopify店铺 |
| `send-email` | 发送邮件 | data | data | 发送邮件通知给指定收件人 |
| `end` | 结束节点 | flow | - | 工作流执行终点,清理资源 |
| `webhook` | Webhook | data | data | 发送HTTP请求到指定URL |

### 节点分类说明

| 分类 | 颜色 | 描述 | 示例节点 |
|------|------|------|----------|
| **browser** | 蓝色 | 浏览器自动化操作 | 打开页面、提取数据、填写表单 |
| **ai** | 紫色 | AI能力集成 | 图片识别、文案优化 |
| **data** | 橙色 | 数据处理 | 发送邮件、查看记录、Webhook |
| **flow** | 灰色 | 流程控制 | 开始、结束 |

---

## 工作流引擎

### 执行流程

```
┌──────────────────────────────────────────────────────────┐
│  WorkflowEngine.execute() 调用                           │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  1. 初始化                                               │
│     - 创建 AbortController                               │
│     - 清空 DataBus                                       │
│     - 过滤出 type='step' 的节点                          │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  2. 循环执行每个 Step 节点                                │
│     for (let i = 0; i < stepNodes.length; i++)           │
└──────────────────────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ 检查 abortSignal     │
         └──────────────────────┘
              │ 已中止    │ 未中止
              ↓           ↓
          break    ┌─────────────────────┐
                   │ 获取 executor       │
                   │ executors.get(id)   │
                   └─────────────────────┘
                         │ 找到    │ 未找到
                         ↓        ↓
              ┌──────────────┐  onNodeStatus(error)
              │ 执行 execute │  onLog(error)
              │  try-catch   │  continue
              └──────────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │ 获取上游输出          │
         │ DataBus.getOutput()  │
         └──────────────────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │ executor.execute()   │
         │ { input, config }    │
         └──────────────────────┘
                    │
         ┌──────────┴──────────┐
         ↓                     ↓
    ┌─────────┐          ┌─────────┐
    │ 成功    │          │ 失败    │
    └─────────┘          └─────────┘
         ↓                     ↓
  DataBus.setOutput()   onNodeStatus(error)
  onNodeStatus(success)  onLog(error)
  onNodeOutput()         continue
  onLog(success)
                    ↓
         ┌──────────────────────┐
         │ onProgress(i+1,total)│
         └──────────────────────┘
                    ↓
              继续下一个节点
                    ↓
┌──────────────────────────────────────────────────────────┐
│  3. 完成                                                 │
│     callbacks.onComplete()                               │
└──────────────────────────────────────────────────────────┘
```

### 错误处理

```typescript
try {
  const output = await executor.execute({
    nodeId: node.id,
    config: { ...nodeConfigs[node.id], ...globalConfig },
    input: previousOutput ?? {},
    logger: (level, msg) => callbacks.onLog(level, node.id, node.label, msg),
    abortSignal: signal,
  });
  
  dataBus.setOutput(node.id, output);
  callbacks.onNodeOutput(node.id, output);
  callbacks.onNodeStatus(node.id, 'success');
  callbacks.onLog('success', node.id, node.label, '完成');
} catch (error) {
  callbacks.onNodeStatus(node.id, 'error');
  callbacks.onLog('error', node.id, node.label, `失败: ${error.message}`);
}
```

### 中止执行

```typescript
// 用户点击"停止"按钮
abortController.abort();

// 在 execute 循环中检查
if (signal.aborted) {
  callbacks.onLog('info', 'system', '系统', '工作流已中止');
  break;
}

// 在 executor 中检查
async execute(ctx: NodeContext) {
  if (ctx.abortSignal.aborted) {
    throw new Error('执行已中止');
  }
  // ... 执行逻辑
}
```

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.3.1 | UI框架 |
| **TypeScript** | 5.5.3 | 类型安全开发 |
| **Vite** | 5.4.0 | 构建工具和开发服务器 |
| **Tailwind CSS** | 3.4.4 | 实用优先CSS框架 |
| **PostCSS** | 8.4.38 | CSS后处理器 |
| **Autoprefixer** | 10.4.19 | CSS自动添加浏览器前缀 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Hono** | Latest | 轻量级Web框架 |
| **Node.js** | 18+ / Bun | 运行时环境 |
| **PostgreSQL** | 16 (可选) | 数据持久化 |
| **@hono/node-server** | Latest | Node.js服务器适配器 |

### 开发工具

| 工具 | 用途 |
|------|------|
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Git** | 版本控制 |

---

## 设计模式

### 1. 插件模式 (Plugin Pattern)

**目的:** 实现节点功能的可扩展性

**实现:**
```typescript
// 所有节点都实现 NodePlugin 接口
export interface NodePlugin {
  id: string;
  executor: NodeExecutor;
  // ...
}

// 通过 PluginRegistry 统一管理
pluginRegistry.registerAll(plugins);
```

**优势:**
- 新增节点无需修改核心代码
- 节点间解耦,独立开发和测试
- 支持动态加载和卸载

### 2. 执行器模式 (Executor Pattern)

**目的:** 分离业务逻辑与执行框架

**实现:**
```typescript
// 框架定义接口
interface NodeExecutor {
  execute(ctx: NodeContext): Promise<Record<string, unknown>>;
}

// 具体业务逻辑实现
const aiOptimizeExecutor: NodeExecutor = {
  async execute(ctx) {
    // 业务逻辑代码
    return { optimizedTitle, optimizedDescription };
  }
};
```

**优势:**
- 业务逻辑与框架分离
- 支持Mock和Real两种实现
- 便于单元测试

### 3. 观察者模式 (Observer Pattern)

**目的:** 实时通知执行状态变化

**实现:**
```typescript
// 定义回调接口
interface EngineCallbacks {
  onNodeStatus: (nodeId: string, status: string) => void;
  onProgress: (current: number, total: number) => void;
  onLog: (level: string, nodeId: string, label: string, msg: string) => void;
}

// 引擎调用回调
callbacks.onNodeStatus(node.id, 'running');
callbacks.onProgress(i + 1, total);
callbacks.onLog('info', node.id, node.label, '执行中...');
```

**优势:**
- 解耦引擎与UI更新
- 支持多个观察者
- 易于扩展新的回调类型

### 4. 策略模式 (Strategy Pattern)

**目的:** 运行时选择不同的执行策略

**实现:**
```typescript
// Mock执行器(开发环境)
const mockExecutor: NodeExecutor = {
  async execute(ctx) {
    await delay(800);
    return { mockData: 'test' };
  }
};

// 真实执行器(生产环境)
const realExecutor: NodeExecutor = {
  async execute(ctx) {
    return await fetch('/api/execute', { ... });
  }
};

// 根据环境选择
const executor = process.env.NODE_ENV === 'development' 
  ? mockExecutor 
  : realExecutor;
```

**优势:**
- 开发和生产环境分离
- 便于测试和调试
- 降低生产环境风险

### 5. Context模式 (Context Pattern)

**目的:** 共享全局状态

**实现:**
```typescript
// 创建Context
const PlanContext = createContext<PlanContextValue>({
  wsUrl: '',
  connected: false,
  runs: [],
});

// 提供Context
<PlanProvider wsUrl={WS_URL}>
  <App />
</PlanProvider>

// 消费Context
const { connected, runs } = useContext(PlanContext);
```

**优势:**
- 避免prop drilling
- 集中管理全局状态
- 跨组件通信

---

## 开发指南

### 如何添加新节点

#### 步骤1: 定义插件

在 `src/plugins/index.ts` 中添加:

```typescript
export const myNewNodePlugin: NodePlugin = {
  id: 'my-new-node',
  label: '我的新节点',
  description: '节点功能描述',
  icon: 'zap',
  category: 'data',
  nodeType: 'step',
  panelGroup: 'data',
  panelColor: 'orange',
  executor: {
    type: 'my-new-node',
    label: '我的新节点',
    icon: 'zap',
    category: 'data',
    
    inputSchema: {
      inputData: { type: 'string', label: '输入数据' },
    },
    
    outputSchema: {
      outputData: { type: 'string', label: '输出数据' },
    },
    
    configSchema: {
      apiKey: { type: 'secret', label: 'API密钥', required: true },
      timeout: { type: 'number', label: '超时时间', default: 30 },
    },
    
    async execute(ctx) {
      ctx.logger('info', '开始执行...');
      
      // 获取输入数据
      const inputData = ctx.input.inputData as string;
      
      // 获取配置
      const apiKey = ctx.config.apiKey as string;
      const timeout = ctx.config.timeout as number;
      
      // 业务逻辑
      const result = await processData(apiKey, inputData, timeout);
      
      ctx.logger('success', '执行完成');
      
      return {
        outputData: result,
      };
    },
  },
};
```

#### 步骤2: 注册插件

在 `src/plugins/index.ts` 底部的 `plugins` 数组中添加:

```typescript
export const plugins: NodePlugin[] = [
  startPlugin,
  // ... 其他插件
  myNewNodePlugin,  // ← 添加新节点
  endPlugin,
];
```

#### 步骤3: 添加图标(可选)

在 `src/components/icons/index.ts` 中添加图标组件:

```typescript
export const IconMyNewNode = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {/* SVG 路径 */}
  </svg>
);
```

### 如何添加新页面

#### 步骤1: 创建页面组件

在 `src/pages/` 创建新文件:

```typescript
// MyNewPage.tsx
export default function MyNewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">我的新页面</h1>
      {/* 页面内容 */}
    </div>
  );
}
```

#### 步骤2: 添加导航项

在 `src/data/navItems.ts` 中添加:

```typescript
export const navItems: NavItem[] = [
  // ... 其他导航项
  {
    id: 'my-new-page',
    label: '新页面',
    icon: 'IconMyNewPage',
  },
];
```

#### 步骤3: 在App.tsx中注册

在 `src/App.tsx` 的路由逻辑中添加:

```typescript
) : state.navActiveId === 'my-new-page' ? (
  <MyNewPage />
) : ...
```

### API端点开发

#### 前端调用

```typescript
// 在组件中调用API
const response = await fetch('/api/my-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ param1: 'value1' }),
});

const data = await response.json();
```

#### 后端实现

在 `backend/api/` 创建新路由文件:

```typescript
// myApi.ts
import { Hono } from 'hono';

const app = new Hono();

app.post('/my-endpoint', async (c) => {
  const body = await c.req.json();
  
  // 业务逻辑
  const result = await processRequest(body);
  
  return c.json({ success: true, data: result });
});

export default app;
```

在 `backend/server.ts` 中注册:

```typescript
import myApi from './api/myApi';

app.route('/api', myApi);
```

### 环境变量配置

创建 `.env.local` 文件:

```bash
# API配置
VITE_API_URL=http://localhost:3456

# WebSocket配置
VITE_PLAN_WS_URL=ws://localhost:8080/plan-updates

# 其他配置
VITE_APP_TITLE=Workflow Editor
```

在代码中使用:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 常见问题

### Q1: 如何调试节点执行?

A: 在 `executor.execute()` 中添加日志:

```typescript
async execute(ctx) {
  ctx.logger('info', '开始执行');
  console.log('Input:', ctx.input);
  console.log('Config:', ctx.config);
  
  // ... 执行逻辑
  
  ctx.logger('success', '执行完成');
  return result;
}
```

### Q2: 如何处理异步操作超时?

A: 使用 AbortSignal:

```typescript
async execute(ctx) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      signal: ctx.abortSignal || controller.signal,
    });
    clearTimeout(timeout);
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}
```

### Q3: 如何测试新节点?

A: 在工作流编辑器中:

1. 打开工作流页面
2. 从左侧面板拖拽新节点到画布
3. 点击节点,在右侧配置面板填写参数
4. 点击"测试节点"按钮
5. 查看执行日志和输出

### Q4: 如何部署到生产环境?

A: 

1. 构建前端:
```bash
npm run build
```

2. 启动后端:
```bash
cd backend
npm run api
```

3. 使用Nginx等Web服务器托管静态文件:
```nginx
server {
  listen 80;
  root /path/to/dist;
  
  location /api {
    proxy_pass http://localhost:3456;
  }
}
```

---

## 附录

### 相关文档

- [CLAUDE.md](./CLAUDE.md) - 项目说明文档
- [backend/README.md](./backend/README.md) - 后端详细文档
- [docs/plans/](./docs/plans/) - 设计文档和计划

### 外部资源

- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/docs/)
- [Vite文档](https://vitejs.dev/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Hono文档](https://hono.dev/docs)

---

**文档版本:** 1.0.0  
**最后更新:** 2026-04-30  
**维护者:** AI Development Team
