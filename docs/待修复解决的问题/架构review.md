代码架构详细reivew
Thought: The user wants a detailed code architecture review of the project. I'm in plan/read-only mode, so I can only read and analyze. Let me do a thorough architecture review by reading the key files systematically.
The user opened a file at docs/待修复解决的问题/代码review.md - they probably want me to write the architecture review there. But I'm in read-only mode, so I'll analyze first and then present the plan.
Let me read the key architectural files to do a comprehensive review.
让我系统地深入分析整个代码架构。
│ Explore Task — Analyze frontend architecture
└ 53 toolcalls · 2m 31s
│ Explore Task — Analyze backend architecture
└ 40 toolcalls · 2m 23s
│ Explore Task — Analyze electron and monorepo architecture
└ 43 toolcalls · 2m 22s
ctrl+x down view subagents
分析完成。以下是完整的代码架构详细 Review：
代码架构详细 Review
审查范围: 全项目三包 (frontend/backend/electron)
文件总数: ~70+ 源文件
代码总量: ~10,000+ 行
审查深度: Deep
一、整体架构概览
┌─────────────────────────────────────────────────────────────┐
│ Monorepo (npm workspaces) │
├─────────────┬──────────────────┬────────────────────────────┤
│ frontend/ │ backend/ │ electron/ │
│ React+Vite │ Hono+Playwright│ Electron 桌面壳 │
│ 端口 5173 │ 端口 3456 │ fork() 后端子进程 │
│ TypeScript │ TypeScript │ TypeScript (CJS) │
│ ~8,000 行 │ ~6,500 行 │ ~600 行 │
└──────┬──────┴────────┬─────────┴────────────┬─────────────┘
│ HTTP/Proxy │ HTTP (SPA) │ fork + 健康检查
│ │ │
└───────────────┴───────────────────────┘
无共享代码包
无共享类型包
无共享常量
核心架构问题: 三包之间零代码共享，靠构建脚本复制产物通信。
二、前端架构问题
2.1 路由架构 — 无路由器
文件: App.tsx:146-168
当前用 20+ 分支的 if-else 链实现页面切换，通过 state.navActiveId 字符串匹配:
if (navActiveId === 'home') return <HomePage />
else if (navActiveId === 'workflow') return <WorkflowPage />
else if (navActiveId === 'templates') return <TemplatesPage />
// ... 20+ 分支
问题:

- 违反开闭原则 — 每新增页面需修改此文件
- 无 URL 路由 — 无法深链接、无浏览器前进/后退
- 无代码分割 — 所有页面打包在一个 JS 文件中
  2.2 状态管理 — God Hook
  文件: useWorkflowState.ts — 643 行，22+ 职责
  这个 hook 管理了所有工作流状态:
  职责
  节点配置管理 (nodeConfigs)
  执行生命周期 (start/stop/test)
  引擎回调构造 (EngineCallbacks)
  执行日志管理
  导航状态 (navActiveId)
  缩放/侧边栏 UI 状态
  模板加载
  声音集成
  API 持久化 (persist())
  persist() 函数 (行 31-41) 静默吞掉所有错误:
  async function persist(url: string, body: unknown) {
  try { await fetch(url, { method: 'POST', ... }); }
  catch { /_ fire-and-forget _/ }
  }
  执行数据丢失时用户完全无感知。
  2.3 Props 穿透 — 4 层传递
  useWorkflowState() 返回 22+ 值
  → AppContent (解构 22 个 props)
  → WorkflowPage (传递 12+ props)
  → Canvas (传递 6+ props)
  → WorkflowNode (传递 4+ props)
  问题: 没有 WorkflowContext，组件间的数据流完全依赖 props 层层传递。任何中间层改动都会影响所有子组件。
  2.4 插件系统 — 单文件 1785 行
  文件: plugins/index.ts
  16 个工作流节点插件全部定义在一个文件中:
- ai-optimize 的 executor 单独就有 ~520 行
- 模块级副作用触发注册（pluginRegistry.registerAll(plugins)）
- index_refactor.ts 是未完成的重复文件，应删除
  2.5 组件嵌套 — ConfigPanel 512 行含 6 个内联子组件
  文件: ConfigPanel.tsx
  ConfigPanel (512 行)
  ├── ConfigTabs (内联)
  ├── NodeInfoHeader (内联)
  ├── NodeConfigFields (内联)
  ├── ConfigSectionComponent (内联)
  ├── TestButton (内联)
  ├── DataTabContent (内联)
  │ └── AiResultsCards (内联)
  所有子组件都定义在同一个文件内部，无法单独测试。
  2.6 类型系统 — 两套配置字段类型
  types.ts → ConfigField (type: 'select' | 'text' | 'checkbox' | 'text-area')
  engine/types.ts → FieldDef (type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret' | 'object')
  两套不兼容的类型系统并存，新增字段类型时需要同步修改两处。
  2.7 服务层 — 不一致的 API 基础地址
  planService.ts:4 → '/api'
  useBrowserSettings.tsx:3 → import.meta.env.VITE_API_BASE_URL || '/api'
  useAiKeySettings.tsx:12 → import.meta.env.VITE_API_BASE_URL || '/api'
  2.8 WorkflowState 类型混合 14 个不相关字段
  interface WorkflowState {
  navActiveId: string; // 导航
  sidebarCollapsed: boolean; // UI 布局
  zoomLevel: number; // UI 缩放
  executing: boolean; // 执行状态
  currentStep: number; // 执行进度
  activeTab: 'config'|...; // UI tab
  workflowNodeIds: string[]; // 编辑器
  activeTemplateId: string; // 模板
  executionMode: 'auto'|...; // 执行模式
  // ... 还有更多
  }
  三、后端架构问题
  3.1 数据库连接 — 每次请求创建/销毁
  文件: api-server.ts — 25+ 处重复此模式
  // 每个路由处理器都这样做:
  const db = createDb();
  if (!db) return c.json({ error: '数据库不可用' }, 500);
  try {
  await db.connect();
  // ... 查询 ...
  } finally {
  await db.disconnect();
  }
  SQLite 影响: 每次请求打开/关闭 SQLite 文件连接，WAL 模式的优势完全丧失。
  PostgreSQL 影响: 每次请求创建 new Pool() 然后 pool.end()，连接池的池化效果为零。
  例外: \_browserDb (行 1066-1078) 用单例缓存了一个长期连接，但仅用于浏览器配置路由，其他所有路由都是连接/断开模式。
  3.2 api-server.ts — 1505 行单体文件
  所有 30+ 路由处理器、业务逻辑、静态文件服务、错误处理全在一个文件:
  api-server.ts (1505 行)
  ├── 应用启动 (1-94)
  ├── 25+ 路由处理器 (96-1407)
  ├── 静态文件服务 (1411-1462)
  ├── 全局错误处理 (1466-1469)
  ├── 服务器启动 (1473-1498)
  └── 信号处理 (1500-1505)
  /api/ai/optimize 路由 (行 784-894) 包含 ~110 行 prompt 构建和响应解析直接写在路由处理器里。
  3.3 双重 AI 架构 — 新旧并存
  旧架构 (仍在使用):
  AiVisionService → 仅 Qwen (DashScope API)
  /api/ai/recognize, /api/ai/compare 使用此架构
  新架构 (已实现但未使用):
  aiRouter → globalRegistry → 多 Provider 回退
  支持 Qwen/OpenAI/Claude/Gemini
  仅用于: 初始化、设置更新、连接测试
  新架构的 aiRouter 有完善的 Provider 注册、优先级排序、失败回退，但实际的 AI 推理路由仍在用旧的 AiVisionService。
  3.4 Prompt 模板重复定义
  services/ai-vision-service.ts:40-136 → PROMPT_TEMPLATES (9 个模板)
  ai-providers/templates.ts:13-107 → PROMPT_TEMPLATES (9 个模板，完全相同)
  两份相同的模板数组，修改一处不同步另一处。
  3.5 浏览器服务 — 无集中管理
  6 个服务各自独立管理 Playwright 浏览器实例:
  服务
  crawler-service.ts
  amazon-search-service.ts
  amazon-product-service.ts
  gemini-file-service.ts
  chatgpt-file-service.ts
  xiyouzhaociService.ts
  问题: 所有服务指向相同的 Chrome 用户数据目录，并发请求会导致配置文件锁冲突。无浏览器池、无请求排队。
  3.6 反检测脚本 — 4 处复制粘贴
  utils.ts:109-161 → launchStealth (最完整版)
  gemini-file-service.ts:70-105 → 几乎相同的副本
  amazon-search-service.ts:48-66 → 简化版
  amazon-product-service.ts → 最简版
  3.7 依赖注入 — setDb() 全局可变状态
  // api-server.ts:84 (启动时)
  apiKeyConfig.setDb(db); // 设置后立即 disconnect
  // api-server.ts:1254 (每次请求)
  apiKeyConfig.setDb(db); // 用请求级 DB 替换全局引用
  apiKeyConfig 是全局单例，但它的 DB 引用被每次请求的代码覆盖。并发请求会互相干扰。
  3.8 SQL 方言翻译 — 脆弱的正则替换
  文件: sql-helpers.ts:9-16
  export function translateSql(sql: string): string {
  return sql
  .replace(/\$(\d+)::\w+/gi, '?') // $7::jsonb → ?
  .replace(/\$(\d+)/g, '?') // $1 → ?
  .replace(/\bNOW\(\)/gi, "datetime('now')")
  .replace(/\bNUMERIC\(\d+,\d+\)/gi, 'REAL');
  }
  用正则替换 PG SQL 为 SQLite SQL，无法处理 FILTER (WHERE ...)、INTERVAL '30 days'、嵌套函数等复杂语法。
  3.9 服务实例化 — 三种不一致的模式
  模式1: 模块级单例
  const crawlerService = new CrawlerService(); // 行 51
  模式2: 每次请求新建
  const service = new AmazonSearchService(); // 路由内
  模式3: 异步工厂
  async function createVisionService(db?) { ... } // 行 53
  3.10 错误处理 — 三种不一致的模式
  // 模式 A: 中文错误消息 (旧路由)
  return c.json({ success: false, error: '请求体必须是 JSON' }, 400);
  // 模式 B: 英文错误消息 (新路由)
  return c.json({ error: error instanceof Error ? error.message : 'Unknown error' });
  // 模式 C: 静默失败 (浏览器路由)
  catch { /_ DB not available, use defaults _/ }
  四、Electron 架构问题
  4.1 进程间通信 — 死代码
  IPC Channel 状态
  backend-ready Preload 监听但主进程永不发送
  get-env-status 主进程注册但 Preload 未暴露
  get-chrome-path 硬编码路径，不验证文件是否存在
  4.2 安全架构缺口
  ✅ contextIsolation: true (正确)
  ✅ nodeIntegration: false (正确)
  ✅ preload 使用 contextBridge (正确)
  ❌ sandbox: 未显式设置 (应设为 true)
  ❌ CSP: 完全缺失 (无 Content-Security-Policy)
  ❌ will-navigate: 未处理 (XSS 可导航到恶意页面)
  ❌ openExternal 在 preload 中直接调用 (应通过主进程验证)
  4.3 三包之间零代码共享
  问题 1: ElectronAPI 接口重复定义
  frontend/src/vite-env.d.ts:22-37 → interface ElectronAPI
  electron/electron/preload.ts:3-62 → 实现
  问题 2: UpdateInfo 类型三重定义
  frontend/src/vite-env.d.ts:16-20
  frontend/src/components/UpdateNotifier.tsx:3-7
  electron/electron/updater.ts:6-10
  问题 3: 端口号/IPC 频道名硬编码在各处
  frontend/vite.config.ts:9 → 3456
  backend/api-server.ts:47 → 3456
  electron/electron/preload.ts → 'get-user-data-path' 等字符串
  electron/electron/main.ts → 同样的字符串
  问题 4: 没有共享类型包 (packages/shared 不存在)
  4.4 构建脚本 — 跨平台兼容问题
  问题
  clean 脚本用 rm -rf
  node.exe 硬编码
  powershell 硬编码
  backend-ready 死 API
  concurrently 重复依赖
  4.5 后端启动序列 — 竞态条件
  // main.ts 流程:
  setTimeout(async () => {
  await initializeProviders(); // 异步，可能很慢
  }, 100); // 100ms 后才开始
  // 如果 AI Provider 初始化还没完成，第一个 API 请求就会失败
  // 没有等待机制，没有错误恢复
  五、SOLID 原则违反分析
  单一职责 (SRP)
  违反 文件
  useWorkflowState hooks/useWorkflowState.ts
  plugins/index.ts plugins/index.ts
  ConfigPanel components/ConfigPanel.tsx
  api-server.ts api-server.ts
  App.tsx 路由+状态管理
  开闭原则 (OCP)
  违反
  App.tsx:146-168
  WorkflowNode.tsx:41-54
  planGuard.ts:32
  接口隔离 (ISP)
  违反
  WorkflowState
  HeaderProps
  依赖倒置 (DIP)
  违反
  useWorkflowState
  所有 plugin executor
  planService
  六、架构改进路线图
  阶段 1: 紧急重构（修复阻塞性问题）

1. 拆分 plugins/index.ts → 每个插件一个文件
2. 拆分 useWorkflowState → 5-6 个独立 hook
3. 拆分 api-server.ts → 按功能域分离路由文件
4. 修复数据库连接 → 单例共享连接
5. 创建 packages/shared → 共享类型和常量
   阶段 2: 架构升级
6. 引入 react-router-dom → 替换 if-else 路由链
7. 创建 WorkflowContext → 消除 4 层 props 穿透
8. 统一 AI 路由 → 迁移到 aiRouter 新架构
9. 集中浏览器管理 → 创建 browser-pool
10. 统一错误处理 → Zod 验证 + 标准化响应格式
    阶段 3: 工程化增强
11. 请求验证层 → Zod schemas
12. 中间件系统 → auth / rate-limit / logging
13. 构建脚本跨平台修复
14. Electron 安全加固 (CSP / sandbox / navigation guard)
15. i18n 框架准备
    需要我将这份报告写入到 docs/待修复解决的问题/代码review.md 文件吗？
