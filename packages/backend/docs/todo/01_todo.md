
● AI CrossBorder Pro - 前端代码结构深度分析

  🎯 核心技术栈

  - 框架: React 18 + TypeScript  - 构建工具: Vite 5.x
  - 样式: Tailwind CSS（自定义主题变量）
  - 状态管理: React Hooks + 自定义 Context
  - 图表: Recharts 3.x 数据可视化

  📐 整体架构概述

  前端实现了一个可视化工作流自动化系统，采用插件化架构：

  ┌─────────────────────────────────────────────────────────────┐
  │                    应用层 (Application Layer)                │
  │  (App.tsx + 布局 + 导航 + 多页面路由)                         │
  └─────────────────────────────────────────────────────────────┘
                                ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                  工作流引擎核心层                             │
  │  (WorkflowEngine + DataBus + Plugin Registry)                │
  └─────────────────────────────────────────────────────────────┘
                                ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                 插件系统层 (Plugin System)                    │
  │  (16+ 节点插件：浏览器、AI、数据处理、流程控制)                │
  └─────────────────────────────────────────────────────────────┘
                                ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                    API 集成层                                 │
  │  (Vite 代理 → 后端 API 端口 3456)                             │
  └─────────────────────────────────────────────────────────────┘

  🔧 核心引擎架构

  1. WorkflowEngine (src/engine/WorkflowEngine.ts)
  - 执行流程: 顺序节点处理 + 数据链式传递
  - 执行模式:
    - Auto（自动模式）：连续执行
    - Manual（手动模式）：逐步执行，需用户确认
  - 核心功能:
    - AbortSignal 支持取消操作
    - 进度跟踪和日志记录
    - 状态更新（idle → running → success/error）
    - 手动模式的等待状态管理

  2. DataBus (src/engine/DataBus.ts)
  - 用途: 在工作流节点间传递数据
  - 模板解析: 支持 {{nodeId.fieldName}} 表达式
  - 输出管理: 用 Map 结构存储所有节点输出

  3. PluginRegistry (src/engine/pluginRegistry.ts)
  - 中央注册表: 管理所有 NodePlugin 实例
  - 自动生成: 从插件创建 UI 数据：
    - Canvas 的 WorkflowNode 数组
    - 左侧边栏的 NodeGroup 数组
    - Engine 的 Executor 数组

  🔌 插件系统

  节点插件结构:
  NodePlugin {
    id, label, description, icon
    category: 'browser' | 'ai' | 'data' | 'flow'
    nodeType: 'start' | 'end' | 'step'
    executor: NodeExecutor {
      inputSchema, outputSchema, configSchema
      execute(context) => Promise<output>
    }
  }

  16+ 可用插件:
  - 流程控制: 开始节点、结束节点
  - 浏览器自动化:
    - GigaB2B 爬虫
    - Amazon 搜索/商品详情
    - 西柚找词关键词挖掘
  - AI 处理:
    - AI 视觉识别
    - AI 文案优化（Gemini/ChatGPT）
  - 数据处理:
    - HTTP 请求
    - 发送邮件
    - 查看运行记录
  - 传统节点: 打开 Amazon、提取信息、打开 Shopify、填写信息、上传图片、发布

  🎨 UI 组件架构

  布局模式:
  Layout (三列响应式布局)
  ├── Sidebar (导航侧边栏)
  ├── 主内容区域
  │   ├── Header (页面特定头部)
  │   └── 页面内容
  │       ├── NodePanel (左侧 - 可拖拽节点)
  │       ├── Canvas (中间 - 工作流可视化)
  │       └── ConfigPanel (右侧 - 节点配置)
  └── UserOverlay (右上角用户菜单)

  主要页面:
  - WorkflowPage: 主工作流编辑器
  - HomePage: 仪表盘概览
  - TemplatesPage: 模板市场
  - BrowserPage: 浏览器自动化工具
  - AIPage: AI 助手工具
  - TasksPage: 执行历史记录
  - DataDashboardPage: 数据可视化看板
  - IntegrationsPage: 集成中心
  - SettingsPage: 系统配置

  🔄 状态管理

  中心化状态 Hook (useWorkflowState.ts):
  WorkflowState {
    selectedNodeId, zoomLevel, workflowEnabled
    activeTab, navActiveId, sidebarCollapsed
    executing, currentStep, totalSteps
    nodeStatuses: Record<nodeId, status>
    stepOutputs: Record<nodeId, data>
    executionLogs: LogEntry[]
    executionMode: 'auto' | 'manual'
    waitingForNext, waitingNodeId
  }

  额外的 Context:
  - PlanContext: 订阅/使用量跟踪，支持 WebSocket 实时更新
  - SoundSettings: 音频反馈配置

  📊 数据流

  工作流执行流程:
  1. 用户通过 ConfigPanel 配置节点
  2. Engine 获取节点配置和输入
  3. 每个 executor 接收 NodeContext，包含：
    - nodeId, config, input, allOutputs
    - logger, abortSignal
  4. Executor 返回输出，存储在 DataBus
  5. 下一个节点接收上一个节点的输出作为输入

  API 集成:
  - Vite 代理: /api/* → http://localhost:3456
  - 服务层: 模块化 API 服务，支持回退到 mock 数据
  - 实时更新: WebSocket 用于计划/使用量更新

  🎯 模板系统

  预构建工作流模板:
  - Amazon 商品上架: GigaB2B → AI 识别 → AI 优化 → Amazon 上传
  - 关键词挖掘: AI 识别 → Amazon 搜索 → 西柚找词 → AI 优化
  - 竞品分析: Amazon 搜索 → 商品抓取 → 关键词 → AI 分析
  - AI 文案生成: 商品抓取 → AI 优化
  - 全流程自动化: 端到端完整自动化流程

  🚀 开发特性

  构建配置:
  - Vite: 快速 HMR 和优化
  - TypeScript: 严格类型检查
  - Tailwind CSS: 实用工具样式 + 自定义主题
  - Mock 数据: 开发环境支持回退系统

  代码组织原则:
  - SOLID: 每个模块单一职责
  - DRY: 可复用组件和 hooks
  - KISS: 简单、可维护的模式
  - 插件架构: 无需修改核心代码即可扩展

  🔐 订阅系统

  计划管理:
  - 计划等级: 免费版(1)、专业版(2)、企业版(3)
  - 使用量跟踪: 每日执行次数限制
  - WebSocket 更新: 实时计划/使用量通知
  - 功能门控: PlanGuard 组件控制访问权限

  📈 分析与报告

  仪表盘服务:
  - 统计数据: 整体工作流性能
  - 执行历史: 详细运行记录
  - 趋势分析: 每周使用模式
  - 用户信息: 账户和订阅详情

  🎛️  配置系统

  节点配置模式:
  ConfigSchema {
    type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret' | 'object'
    label, required?, default?
    options?: [{label, value}]
  }

  自动默认配置: 从插件模式初始化时提取

  🌐 后端集成

  API 端点:
  - /api/crawl/gigab2b - GigaB2B 爬虫
  - /api/ai/recognize - AI 图片识别
  - /api/search/amazon - Amazon 搜索
  - /api/scrape/amazon-product - 商品详情抓取
  - /api/keywords/xiyouzhaoci - 关键词挖掘
  - /api/gemini/upload, /api/chatgpt/upload - AI 优化

  💡 核心设计决策

  1. 插件架构: 可扩展的节点系统，核心代码改动最小
  2. 顺序执行: 简单、可预测的工作流流程
  3. 数据链式传递: 自动输出到输入的传递
  🌐 后端集成

  API 端点:
  - /api/crawl/gigab2b - GigaB2B 爬虫
  - /api/ai/recognize - AI 图片识别
  - /api/search/amazon - Amazon 搜索
  - /api/scrape/amazon-product - 商品详情抓取
  - /api/keywords/xiyouzhaoci - 关键词挖掘
  - /api/gemini/upload, /api/chatgpt/upload - AI 优化
  节点配置模式:
  ConfigSchema {
    type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret' | 'object'
    label, required?, default?
    options?: [{label, value}]
  }

  自动默认配置: 从插件模式初始化时提取

  🌐 后端集成

  API 端点:
  - /api/crawl/gigab2b - GigaB2B 爬虫
  - /api/ai/recognize - AI 图片识别
  - /api/search/amazon - Amazon 搜索
  - /api/scrape/amazon-product - 商品详情抓取
  - /api/keywords/xiyouzhaoci - 关键词挖掘
  - /api/gemini/upload, /api/chatgpt/upload - AI 优化

  💡 核心设计决策

  1. 插件架构: 可扩展的节点系统，核心代码改动最小
  2. 顺序执行: 简单、可预测的工作流流程
  3. 数据链式传递: 自动输出到输入的传递
  4. 手动模式支持: 用于调试的逐步执行
  5. Mock 数据回退: 开发友好，支持真实 API 选项
  6. 类型安全: 全面的 TypeScript 覆盖
  7. 响应式设计: 移动优先，桌面增强

  🎯 未来扩展点

  - 条件分支: 添加决策节点
  - 并行执行: 多线程工作流支持
  - 实时协作: 多用户编辑
  - 高级调度: 基于 Cron 的工作流触发器
  - 市场扩展: 社区插件共享

  这个架构为可视化工作流自动化提供了坚实的基础，具有出色的可扩展性、类型安全性和用户体验。