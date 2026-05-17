# DashBoardPage 目录结构分析
这个目录包含 工作流执行数据看板的所有子组件，用于展示、分析和对比工作流的执行历史

## 1. OverviewTab.tsx 总览看板组件

作用 ：展示工作流执行的总体统计数据，包括：

- 统计卡片（总执行次数、成功率、平均耗时、活跃节点）
- 执行趋势折线图（使用 Recharts）
- 节点成功率柱状图（使用 Recharts）
- 最近执行记录表格
核心功能 ：

- 从 /api/workflow/stats 和 /api/workflow/executions?limit=10 获取数据
- 加载、错误、空状态的完整处理
- 点击执行记录可跳转查看详情（通过 onSelectExecution 回调）

## 2. AllDataTable.tsx 全量数据表格组件

作用 ：展示所有执行数据的三个子标签页：

- 执行记录 ：所有工作流执行历史
- 节点步骤 ：所有节点执行步骤（可展开查看详情）
- 执行日志 ：所有执行日志（可按执行ID筛选）
核心功能 ：

- 分页显示（每页 20 条）
- 支持展开查看节点详情（使用 NodeDetailRenderer ）
- 可筛选执行日志
- 状态徽章、时间格式化等辅助函数

## 3. NodeComparison.tsx 节点执行对比组件
作用 ：对比单个节点在多次执行中的历史记录

核心功能 ：

- 节点选择器（预设了 7 种常见节点类型）
- 显示选中节点的 20 条最近执行记录
- 可展开查看每次执行的完整详情
- 从 /api/workflow/steps/{nodeId}/history?limit=20 获取数据

## 4. ExecutionDetail.tsx 执行详情组件
作用 ：展示单次工作流执行的完整信息

核心功能 ：

- 头部区域：返回按钮、工作流名称、状态、耗时、时间戳
- 水平时间线：所有节点以可点击徽章展示（带状态图标和耗时）
- 可展开的节点详情：显示输入/输出/配置数据 + 执行日志
- 从 /api/workflow/executions/{executionId} 获取数据

## 5. NodeDetailRenderers.tsx 节点类型专用渲染器
作用 ：为不同类型的节点提供专门的数据展示组件

包含的通用组件 ：

- ImageGrid ：商品图片网格展示
- SpecTable ：产品规格表格
- BulletList ：有序列表展示
- ConfigInfo ：执行配置展示
- GenericDataSection ：通用数据展示
支持的节点类型专用渲染 ：

1. gigab2b-crawl ：GigaB2B 爬虫数据（标题、图片、规格）
2. amazon-search ：亚马逊搜索结果（关键词、ASIN列表）
3. amazon-product ：亚马逊商品详情（标题、品牌、价格、图片、五点描述）
4. xiyouzhaoci-keywords ：西游造词关键词（ASIN、关键词列表）
5. ai-optimize ：AI 优化结果（优化标题、优化五点、SEO关键词）
6. ai-vision ：AI 视觉识别结果
7. extract-info ：通用数据展示