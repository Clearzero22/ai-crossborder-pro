# 这个目录包含了项目的所有Typescript 类型定义，确保代码的类型安全

## 📁 types 目录详解
这个目录包含了项目的 所有 TypeScript 类型定义 ，确保代码的类型安全。

### 📋 目录结构
```
types/
├── index.ts          ← 统一导出入口
├── dashboard.ts      ← 仪表盘相关类型
└── plan.ts           ← 套餐相关类型
```
## 1️⃣ dashboard.ts - 仪表盘类型定义
### 📊 核心接口
接口名 用途 DashboardStats 统计数据（执行次数、成功率、发布商品数等） DashboardExecution 执行记录（工作流名称、状态、耗时等） TrendDataPoint 趋势数据点（日期、数量） DashboardUser 用户概览（用户名、套餐、活跃天数等） ApiResponse<T> API 响应包装 ExecutionsResponse 执行记录响应 TrendResponse 趋势响应 DashboardState Dashboard 组件状态

### 💡 类型详解 DashboardStats
```
{
  totalExecutions: number;           // 总执行次数
  successRate: number;               // 成功率
  publishedProducts: number;         // 发布商品数
  totalDuration: number;             // 总耗时（分钟）
  changeFromLastMonth: {             // 较上月变化
    executions: number;
    successRate: number;
    products: number;
    duration: number;
  };
}
``` DashboardExecution
```
{
  id: number;
  workflowName: string;
  status: 'success' | 'error';       // 状态
  duration: number;                  // 耗时（秒）
  errorMessage?: string;             // 错误信息（可选）
  startedAt: string;                 // 开始时间
}
```
## 2️⃣ plan.ts - 套餐类型定义
### 🎯 核心类型
类型名 用途 PlanLevel 套餐等级（1=免费, 2=专业, 3=企业） SubscriptionStatus 订阅状态（active/expired/cancelled） Plan 套餐信息 Usage 使用量信息 Subscription 订阅信息 PlanLimits 套餐限制 PlanResponse 完整套餐响应 PlanMessageType WebSocket 消息类型 PlanUpdateMessage WebSocket 消息 PlanState Plan Context 状态 PlanContextValue Plan Context 值 FeatureCheckResult 功能检查结果

### 💡 类型详解 PlanResponse（完整套餐数据）
```
{
  plan: Plan;
  usage: Usage;
  subscription: Subscription;
  limits: PlanLimits;
}
``` PlanState（Context 状态）
```
{
  plan: PlanResponse | null;
  loading: boolean;
  error: string | null;
  usagePercent: number;              // 使用百分比
  isNearLimit: boolean;              // 是否接近限制
  isExpired: boolean;                // 是否已过期
  daysUntilExpiry: number;           // 距过期天数
}
``` PlanContextValue
```
{
  state: PlanState;
  refresh: () => Promise<void>;      // 刷新套餐
  checkLimit: (feature: string) => FeatureCheckResult; // 检查功能限制
}
```
## 3️⃣ index.ts - 统一导出
```
export * from './plan';
export * from './dashboard';
```
这样其他文件可以直接从 @/types 导入所有类型：

```
import { PlanResponse, DashboardStats } from '@/types';
```
## 🎨 类型设计亮点
### 1️⃣ 模块化组织
按功能模块拆分类型，易于维护。

### 2️⃣ 完整的状态定义
每个功能模块都有对应的 *State 接口，用于组件状态管理。

### 3️⃣ 类型安全的 API 响应
使用泛型 ApiResponse<T> 包装 API 响应。

### 4️⃣ 清晰的导出结构
通过 index.ts 统一导出，简化导入语句。