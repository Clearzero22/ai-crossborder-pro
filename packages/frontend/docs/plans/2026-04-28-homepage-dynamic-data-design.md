# 首页概览动态数据设计文档

**创建日期：** 2026-04-28  
**状态：** 设计中  
**优先级：** 中

## 概述

将首页概览的静态数据改为动态数据，从后端 API 获取真实的统计数据、执行记录、本周趋势和用户概览。

## 需求

### 核心需求
- 从后端 API 获取首页展示的所有数据
- 支持手动刷新数据
- 显示加载状态和错误处理
- 基于现有的 PostgreSQL 数据库
- 集成到现有的 Hono API 服务器

### 用户故事
1. 用户可以看到真实的执行统计数据
2. 用户可以手动刷新获取最新数据
3. 数据加载失败时显示友好的错误提示

## 架构设计

### 数据流架构
```
┌─────────────────┐          ┌──────────────────┐
│   HomePage.tsx  │ ───────► │  Hono API Server │
│   (前端)        │  HTTP    │  /api/dashboard   │
│                 │          │                  │
│  - 统计数据     │          │  ┌──────────────┐ │
│  - 执行记录     │          │  │ StatsService │ │
│  - 本周趋势     │          │  └──────────────┘ │
│  - 用户概览     │          │         ↓         │
│                 │          │  ┌──────────────┐ │
│  手动刷新按钮   │          │  │ PostgreSQL   │ │
└─────────────────┘          │  └──────────────┘ │
                             └──────────────────┘
```

### 技术选型
- **后端 API：** Hono (集成到现有服务器)
- **数据库：** PostgreSQL (使用现有 crawler_runs 表)
- **前端状态：** React useState
- **刷新策略：** 手动刷新

## API 端点设计

### GET /api/dashboard/stats
获取统计数据。

**响应：**
```typescript
{
  "data": {
    "totalExecutions": number,      // 执行总次数
    "successRate": number,          // 成功率 (%)
    "publishedProducts": number,    // 发布商品数
    "totalDuration": number,        // 运行时长 (小时)
    "changeFromLastMonth": {
      "executions": number,         // 较上月变化 (%)
      "successRate": number,        // 较上月变化 (%)
      "products": number,           // 较上月变化
      "duration": number            // 较上月变化
    }
  }
}
```

### GET /api/dashboard/executions
获取最近执行记录。

**查询参数：**
- `limit`: 返回记录数（默认 5）

**响应：**
```typescript
{
  "executions": [
    {
      "id": number,
      "workflowName": string,
      "status": "success" | "error",
      "duration": number,          // 秒
      "errorMessage": string | undefined,
      "startedAt": string          // ISO 8601
    }
  ],
  "total": number
}
```

### GET /api/dashboard/trend
获取本周执行趋势。

**响应：**
```typescript
{
  "weekly": [
    {
      "date": string,              // YYYY-MM-DD
      "count": number
    }
  ]
}
```

### GET /api/dashboard/user
获取用户概览信息。

**响应：**
```typescript
{
  "data": {
    "userName": string,
    "planName": string,
    "daysActive": number,
    "lastLoginAt": string,
    "activeWorkflows": number,
    "todayExecutions": number,
    "pendingTasks": number
  }
}
```

## 数据库查询

### 统计数据查询
```sql
-- 总执行次数
SELECT COUNT(*) as count FROM crawler_runs;

-- 成功率
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as rate
FROM crawler_runs;

-- 发布商品数
SELECT COUNT(DISTINCT asin) as count FROM clean_products;

-- 运行时长（小时）
SELECT SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 3600 as total
FROM crawler_runs;
```

### 执行记录查询
```sql
SELECT 
  id,
  workflow_name,
  status,
  EXTRACT(EPOCH FROM (ended_at - started_at)) as duration,
  error_message,
  started_at
FROM crawler_runs
ORDER BY started_at DESC
LIMIT $1;
```

### 本周趋势查询
```sql
SELECT 
  DATE(started_at) as date,
  COUNT(*) as count
FROM crawler_runs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY date;
```

## 前端组件设计

### 1. HomePage (修改)
**文件：** `src/pages/HomePage.tsx`

**变更：**
- 移除静态数据
- 添加 `dashboardState` 状态
- 添加 `loadDashboardData()` 函数
- 添加刷新按钮
- 添加加载骨架屏
- 添加错误处理

### 2. DashboardSkeleton (新增)
**文件：** `src/components/DashboardSkeleton.tsx`

**功能：**
- 显示加载时的骨架屏
- 与实际布局一致

### 3. dashboardService (新增)
**文件：** `src/services/dashboardService.ts`

**功能：**
- 封装所有 API 调用
- 统一错误处理

## 后端实现

### 文件结构
```
backend/
├── api/
│   └── dashboard.ts          # Dashboard 路由
├── services/
│   └── dashboardStats.ts     # 统计查询服务
└── db/
    └── index.ts             # 数据库连接
```

### 实现要点
- 使用现有的数据库连接池
- 统一的错误处理
- 返回默认值（数据库连接失败时）

## 错误处理

### 前端
- API 请求失败：显示错误提示和重试按钮
- 部分数据失败：显示可用数据
- 空数据：显示友好的空状态

### 后端
- 数据库连接失败：返回默认值
- 空结果：返回空数组
- 查询超时：设置超时时间

## 用户体验

### 加载状态
- 首次加载：显示骨架屏
- 刷新数据：显示加载中状态（不隐藏现有数据）

### 错误状态
- 显示错误消息
- 提供重试按钮

### 空数据
- 显示友好的空状态提示
- 提供操作引导（如"创建工作流"）

## 文件结构

### 前端
```
src/
├── pages/
│   └── HomePage.tsx           # 修改
├── components/
│   └── DashboardSkeleton.tsx  # 新增
└── services/
    └── dashboardService.ts    # 新增
```

### 后端
```
backend/
├── api/
│   └── dashboard.ts           # 新增
└── services/
    └── dashboardStats.ts      # 新增
```

## 实施步骤

### Phase 1: 后端 API
1. 创建 dashboard 路由
2. 实现统计数据查询
3. 实现执行记录查询
4. 实现趋势数据查询
5. 实现用户概览查询

### Phase 2: 前端组件
6. 创建 dashboardService
7. 创建 DashboardSkeleton 组件
8. 修改 HomePage 组件
9. 添加刷新功能

### Phase 3: 集成测试
10. 测试数据加载
11. 测试错误处理
12. 测试空数据状态

## 后续优化
- [ ] 数据缓存（减少数据库查询）
- [ ] WebSocket 实时更新
- [ ] 导出统计数据
- [ ] 自定义时间范围
