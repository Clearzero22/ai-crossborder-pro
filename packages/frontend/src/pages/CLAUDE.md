# 这个目录包含应用的所有页面组件

1. HomePage.tsx --- 首页概览 (仪表盘)

功能:
- 欢迎横幅 (根据时间显示问候语)
- 统计卡片 (执行总次数、本月成功率、发布商品数、运行时长)
- 最近执行记录列表
- 快捷操作入口（新建工作流、运行最近、模板市场、集成中心）

数据来源：

- 从 dashboardService 获取真实数据（执行统计、用户信息等）
- 包含加载中、错误、空数据状态处理

2. WorkflowPage.tsx --- 工作流编辑器 (核心页面)
布局 (桌面端 3 列):
```
┌─────────────────────────────────────────────────────────┐
│ NodePanel │ Canvas │ ConfigPanel │
│ ───────── │ ────────────── │ ─────────────────────── │
│ 节点选择   │ 工作流画布    │ 配置面板/数据/日志    │
└─────────────────────────────────────────────────────────┘
```
功能:
- 桌面端: 完整三列布局
- 移动端: 底部 tab 栏 + 全屏弹出面板
- 响应式设计

3. TemplatesPage.tsx --- 模板市场
功能: 
- 分类筛选 (全部、上架管理、市场调研、AI工具、数据处理)
- 搜索功能 (按模板名称和描述搜索)
- 模板卡片展示 (名称、描述、节点数量)
- 使用模板按钮一键加载

4. SettingsPage.tsx -- 系统设置
设置分区:
- 账户设置 - 账户名称、邮箱、修改密码
- 工作流默认设置 - 超时时间、失败重试次数、日志保留天数、并发执行数
- API 密钥 - Claude API Key、OpenAI API Key、Webhook Secret
- 团队管理 - 团队成员、角色权限、操作日志
- 外观设置 - 主题切换（深色/浅色）、配色方案（5种主色调）
- 声音设置 - 节点完成、工作流完成、错误提示音（可切换）

5. DataDashboardPage.tsx 数据看板
功能: 数据可视化仪表盘

6. TaskPage.tsx -- 任务执行记录
功能:查看某次执行的详细数据

7. ExecutionDataPage.tsx 执行数据页面
功能: 查看某次执行的详细数据

8. AIPage.tsx -- AI 助手页面
功能: AI 功能集中的页面内容

9. BrowerPage.tsx -- 浏览器自动化页面
功能: 浏览器自动化相关功能

10. IntegrationsPage.tsx -- 集成中心
功能: 第三方集成管理 (API、Webhook 集成中心)

11. PlaceholdePage.tsx -- 占位页面
功能: 临时占位页面 (开发中功能)

12. DashboardPage/子目录 --仪表盘相关组件
包含: 
- OverviewTab.tsx —— 概览标签页
- AllDataTable.tsx —— 所有数据表格
- NodeComparison.tsx —— 节点对比
- ExecutionDetail.tsx —— 执行详情
- NodeDetailRenderers.tsx —— 节点详情渲染器

页面路由关系(在 App.tsx 中)

navActiveId = 'home' → HomePage
navActiveId = 'workflow' → WorkflowPage
navActiveId = 'templates' → TemplatesPage
navActiveId = 'browser' → BrowserPage
navActiveId = 'ai' → AIPage
navActiveId = 'tasks' → TasksPage
navActiveId = 'dashboard' → DataDashboardPage
navActiveId = 'integrations' → IntegrationsPage
navActiveId = 'settings' → SettingsPage

# 快速参考
##  快速参考
页面 路径 功能 首页 HomePage.tsx 数据概览仪表盘 工作流 WorkflowPage.tsx ⭐ 工作流编辑器 模板 TemplatesPage.tsx 模板市场 设置 SettingsPage.tsx 系统设置 AI AIPage.tsx AI 助手 浏览器 BrowserPage.tsx 浏览器自动化 任务 TasksPage.tsx 任务记录 数据看板 DataDashboardPage.tsx 数据可视化 集成 IntegrationsPage.tsx 集成中心



