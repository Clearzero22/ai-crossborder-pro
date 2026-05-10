# 动态套餐订阅功能设计文档

**创建日期：** 2026-04-28
**状态：** 设计中
**优先级：** 高

## 概述

将静态套餐信息改为动态数据，支持实时更新、功能限制和升级引导。

## 需求

### 核心需求
- 套餐数据从后端 API 动态获取
- WebSocket 实时推送套餐更新
- 执行次数限制和功能守卫
- 套餐到期/超限时的视觉警告和功能限制
- 升级时引导联系销售

### 用户故事
1. 用户可以实时看到当前套餐和剩余执行次数
2. 执行次数即将用完时收到警告提示
3. 套餐到期时相关功能自动禁用
4. 点击升级可以联系销售团队

## 架构设计

### 数据流架构
```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   前端 React     │ ◄─────────────────► │   后端 API       │
│   PlanInfo      │     实时推送        │   /api/plan      │
│                 │                     │                  │
│  ┌──────────┐   │                     │  ┌────────────┐ │
│  │ PlanContext│  │   HTTP 请求         │  │ 套餐服务   │ │
│  └──────────┘   │ ───────────────────► │  └────────────┘ │
└─────────────────┘   GET /api/plan      └──────────────────┘
```

### 技术选型
- **状态管理：** React Context
- **实时通信：** WebSocket
- **降级方案：** 定时轮询
- **缓存策略：** 内存 + localStorage

## 数据结构

### API 响应
```typescript
interface PlanResponse {
  plan: {
    id: string;           // "pro", "enterprise", "free"
    name: string;         // "专业版"
    level: number;        // 1=免费, 2=专业, 3=企业
  };
  usage: {
    current: number;      // 当前使用次数
    total: number;        // 总次数
    resetDate: string;    // 重置日期
  };
  subscription: {
    status: 'active' | 'expired' | 'cancelled';
    startDate: string;
    endDate: string;
    autoRenew: boolean;
  };
  limits: {
    maxWorkflows: number;
    maxExecutionsPerDay: number;
    features: string[];
  };
}
```

### WebSocket 消息
```typescript
interface PlanUpdateMessage {
  type: 'plan_updated' | 'usage_updated' | 'subscription_expired';
  data: PlanResponse;
  timestamp: string;
}
```

### Context State
```typescript
interface PlanState {
  plan: PlanResponse | null;
  loading: boolean;
  error: string | null;
  usagePercent: number;
  isNearLimit: boolean;       // > 80%
  isExpired: boolean;
  daysUntilExpiry: number;
}
```

## 组件设计

### 1. PlanProvider（新增）
全局套餐状态管理。

```typescript
// src/context/PlanContext.tsx
interface PlanContextValue {
  state: PlanState;
  refresh: () => Promise<void>;
  checkLimit: (feature: string) => boolean;
}
```

### 2. PlanInfo（增强）
现有组件增强，新增：
- 到期倒计时
- 刷新按钮
- 超限警告样式

### 3. PlanGuard（新增）
功能守卫组件。

```typescript
<PlanGuard feature="workflow-execution">
  <button onClick={runWorkflow}>运行工作流</button>
</PlanGuard>
```

### 4. PlanAlert（新增）
全局警告横幅。

```typescript
<PlanAlert 
  type="warning" 
  message="套餐将在 3 天后到期"
/>
```

### 5. UpgradeModal（新增）
联系销售对话框。

## 生命周期

### 初始化
```typescript
useEffect(() => {
  fetchPlanData();           // 1. 获取初始数据
  connectWebSocket();         // 2. 建立 WebSocket
  setInterval(checkExpiry);   // 3. 定时检查到期

  return () => {
    disconnectWebSocket();
    clearInterval();
  };
}, []);
```

### WebSocket 消息处理
```typescript
ws.onmessage = (event) => {
  const message: PlanUpdateMessage = JSON.parse(event.data);

  switch (message.type) {
    case 'plan_updated':
    case 'usage_updated':
      updatePlan(message.data);
      break;
    case 'subscription_expired':
      notifyExpiration();
      disableFeatures();
      break;
  }
};
```

### 降级策略
- WebSocket 连接失败 → 降级为定时轮询（5分钟）
- API 请求失败 → 显示本地缓存数据

## 功能限制

### 功能检查逻辑
```typescript
function checkFeatureLimit(plan: PlanResponse, feature: string) {
  if (plan.subscription.status === 'expired') {
    return { allowed: false, reason: '套餐已过期' };
  }

  if (feature === 'workflow-execution') {
    if (plan.usage.current >= plan.usage.total) {
      return { allowed: false, reason: '执行次数已用完' };
    }
  }

  if (!plan.limits.features.includes(feature)) {
    return { allowed: false, reason: '当前套餐不支持此功能' };
  }

  return { allowed: true };
}
```

### 限制触发场景
- 执行次数 ≥ 总次数：禁用运行按钮
- 套餐过期：禁用所有付费功能
- 功能不在套餐内：隐藏或禁用相关功能

## 错误处理

### API 失败
- 首次加载：显示默认免费套餐 + 错误提示
- 刷新失败：显示 Toast 错误
- 降级：使用本地缓存

### WebSocket 失败
- 自动重连（指数退避）
- 降级为轮询
- 显示连接状态指示器

### 边界情况
- 执行次数刚好用完：立即禁用 + 弹出升级对话框
- 套餐刚好到期：标记过期 + 自动降级
- 网络切换：重新连接并获取数据

## 性能优化

1. **防抖：** 刷新按钮 1 秒内只允许一次请求
2. **缓存：** 内存缓存（5分钟）+ localStorage 备份
3. **请求合并：** 多个组件同时检查时合并为一次请求

## 文件结构

```
src/
├── context/
│   └── PlanContext.tsx          # 全局状态管理
├── components/
│   ├── PlanInfo.tsx             # 套餐信息卡片（增强）
│   ├── PlanGuard.tsx            # 功能守卫（新增）
│   ├── PlanAlert.tsx            # 警告横幅（新增）
│   └── UpgradeModal.tsx         # 升级对话框（新增）
├── hooks/
│   └── usePlanWebSocket.ts      # WebSocket 连接管理
├── services/
│   └── planService.ts           # API 调用服务
└── utils/
    └── planGuard.ts             # 功能检查逻辑
```

## 实施步骤

### Phase 1: 基础设施
1. 创建 PlanContext 和 PlanService
2. 创建 PlanWebSocket hook
3. 修改 App.tsx 集成 PlanProvider

### Phase 2: UI 组件
4. 增强 PlanInfo 组件
5. 创建 PlanGuard 组件
6. 创建 PlanAlert 组件
7. 创建 UpgradeModal 组件

### Phase 3: 集成
8. 在 WorkflowPage 中集成 PlanGuard
9. 在执行工作流时检查限制
10. 实现到期倒计时

### Phase 4: 测试与优化
11. 错误处理测试
12. 性能优化
13. 用户体验优化

## 后续优化

- [ ] 套餐对比页面
- [ ] 自助升级（支付集成）
- [ ] 使用统计图表
- [ ] 多标签页同步优化
