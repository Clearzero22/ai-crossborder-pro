# 这个目录包含前端数据服务层，负责与后端 API 进行通信、数据缓存和Mock 数据管理

## 📁 services 目录详解
这个目录包含了 前端数据服务层 ，负责与后端 API 通信、数据缓存和 Mock 数据管理。

### 1️⃣ dashboardService.ts - 仪表盘数据服务 📋 功能概述
提供仪表盘相关的数据获取功能，支持 Mock 数据 和 真实 API 两种模式。
 🔑 核心配置
```
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.DEV;
```
- 开发环境默认使用 Mock 数据
- 可通过环境变量 VITE_USE_MOCK=true 强制使用 Mock 📦 提供的方法
方法 功能 API 端点 getStats() 获取统计数据 /api/dashboard/stats getExecutions(limit) 获取执行记录 /api/dashboard/executions getTrend() 获取趋势数据 /api/dashboard/trend getUser() 获取用户概览 /api/dashboard/user
 💡 设计特点
- ✅ 降级策略 ：API 失败时自动回退到 Mock 数据
- ✅ 类型安全 ：完整的 TypeScript 类型定义
- ✅ 错误处理 ：优雅的异常捕获和日志输出
### 2️⃣ mockDashboardData.ts - 仪表盘 Mock 数据 📊 包含的 Mock 数据
数据类型 内容 mockStats 统计数据（执行次数、成功率、发布商品数等） mockExecutions 5条执行记录（含成功、失败状态） mockTrend 7天的趋势数据 mockUser 用户信息（用户名、套餐、活跃天数等）
 ⏱️ 模拟延迟
```
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```
每个方法都添加了 100-500ms 的随机延迟，模拟真实网络请求体验。
 📈 数据示例
```
mockStats: {
  totalExecutions: 1247,
  successRate: 96.8,
  publishedProducts: 856,
  totalDuration: 328,
  changeFromLastMonth: { ... }
}
```
### 3️⃣ planService.ts - 套餐服务 🏗️ 类结构
使用单例模式设计：

```
class PlanService { ... }
export const planService = new PlanService();
``` 💾 缓存策略（三重缓存）
层级 存储位置 有效期 1 内存缓存 5分钟 2 localStorage 1小时 3 默认套餐 永久（兜底）
 🔄 获取流程
```
getPlan() 
  → 检查内存缓存 → 有效则返回
  → 检查 localStorage → 有效则返回（异步刷新）
  → 调用 API → 成功则更新缓存
  → 失败则返回默认免费套餐
``` 📦 核心方法
方法 功能 getPlan(forceRefresh) 获取套餐信息（支持强制刷新） clearCache() 清除所有缓存
 🆓 默认免费套餐
```
{
  plan: { id: 'free', name: '免费版', level: 1 },
  usage: { current: 0, total: 100, resetDate: ... },
  subscription: { status: 'active', ... },
  limits: { maxWorkflows: 3, maxExecutionsPerDay: 100, ... }
}
```
## 🗂️ 目录结构关系
```
services/
├── dashboardService.ts     ← 仪表盘 API 服务
├── mockDashboardData.ts    ← 仪表盘 Mock 数据
└── planService.ts          ← 套餐服务（带缓存）
```
## 💡 技术亮点
### 1️⃣ 优雅的降级策略
dashboardService 先尝试 API，失败时自动回退到 Mock，保证开发体验。

### 2️⃣ 完善的缓存机制
planService 的三重缓存设计，减少 API 请求，提升用户体验。

### 3️⃣ 类型安全
所有服务都有完整的 TypeScript 类型定义，来自 ../types/ 。

### 4️⃣ 单例模式
planService 使用单例模式，保证全局唯一实例。