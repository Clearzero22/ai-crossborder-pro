# Dynamic Subscription Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将静态套餐信息改为动态数据，支持实时更新、功能限制和升级引导。

**Architecture:** 使用 React Context 管理全局套餐状态，WebSocket 实时推送更新，PlanGuard 组件实现功能守卫。

**Tech Stack:** React Context, WebSocket, TypeScript, Vite

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/types/plan.ts`

**Step 1: Create type definitions file**

```typescript
// src/types/plan.ts

/** 套餐等级 */
export type PlanLevel = 1 | 2 | 3; // 1=免费, 2=专业, 3=企业

/** 套餐订阅状态 */
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

/** 套餐信息 */
export interface Plan {
  id: string;           // "free", "pro", "enterprise"
  name: string;         // "免费版", "专业版", "企业版"
  level: PlanLevel;
}

/** 使用量信息 */
export interface Usage {
  current: number;      // 当前使用次数
  total: number;        // 总次数
  resetDate: string;    // 重置日期 "2024-12-31"
}

/** 订阅信息 */
export interface Subscription {
  status: SubscriptionStatus;
  startDate: string;    // "2024-01-01"
  endDate: string;      // "2024-12-31"
  autoRenew: boolean;
}

/** 套餐限制 */
export interface PlanLimits {
  maxWorkflows: number;
  maxExecutionsPerDay: number;
  features: string[];   // ["ai", "api", "export", "custom-domain"]
}

/** 完整套餐响应 */
export interface PlanResponse {
  plan: Plan;
  usage: Usage;
  subscription: Subscription;
  limits: PlanLimits;
}

/** WebSocket 消息类型 */
export type PlanMessageType = 'plan_updated' | 'usage_updated' | 'subscription_expired';

/** WebSocket 消息 */
export interface PlanUpdateMessage {
  type: PlanMessageType;
  data: PlanResponse;
  timestamp: string;
}

/** Context 状态 */
export interface PlanState {
  plan: PlanResponse | null;
  loading: boolean;
  error: string | null;
  usagePercent: number;
  isNearLimit: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
}

/** Context 值 */
export interface PlanContextValue {
  state: PlanState;
  refresh: () => Promise<void>;
  checkLimit: (feature: string) => { allowed: boolean; reason?: string };
}

/** 功能检查结果 */
export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
}
```

**Step 2: Commit**

```bash
cd /Users/clearzero22/development/ai/01_amazon_projects/chatgpt_pages/implementations/dashboard/workflow-editor
git add src/types/plan.ts
git commit -m "feat: add plan subscription type definitions"
```

---

## Task 2: Create Plan Service

**Files:**
- Create: `src/services/planService.ts`

**Step 1: Create plan service**

```typescript
// src/services/planService.ts
import type { PlanResponse } from '../types/plan';

const API_BASE = '/api';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class PlanService {
  private cache: { data: PlanResponse; expiry: number } | null = null;

  /**
   * 获取套餐信息
   * @param forceRefresh - 强制刷新，忽略缓存
   */
  async getPlan(forceRefresh = false): Promise<PlanResponse> {
    // 检查缓存
    if (!forceRefresh && this.cache) {
      if (Date.now() < this.cache.expiry) {
        return this.cache.data;
      }
      this.cache = null;
    }

    // 从 localStorage 读取备用缓存
    const localCache = this.getLocalCache();
    if (localCache && !forceRefresh) {
      // 异步更新缓存
      this.fetchPlan().catch(() => {});
      return localCache;
    }

    return this.fetchPlan();
  }

  private async fetchPlan(): Promise<PlanResponse> {
    try {
      const response = await fetch(`${API_BASE}/plan`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: PlanResponse = await response.json();

      // 更新缓存
      this.cache = {
        data,
        expiry: Date.now() + CACHE_DURATION,
      };
      this.setLocalCache(data);

      return data;
    } catch (error) {
      // 返回默认免费套餐
      return this.getDefaultPlan();
    }
  }

  private getDefaultPlan(): PlanResponse {
    return {
      plan: {
        id: 'free',
        name: '免费版',
        level: 1,
      },
      usage: {
        current: 0,
        total: 100,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      subscription: {
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        autoRenew: false,
      },
      limits: {
        maxWorkflows: 3,
        maxExecutionsPerDay: 100,
        features: ['basic'],
      },
    };
  }

  private getLocalCache(): PlanResponse | null {
    try {
      const cached = localStorage.getItem('plan_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 1 小时有效期
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          return data;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private setLocalCache(data: PlanResponse): void {
    try {
      localStorage.setItem('plan_cache', JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore
    }
  }

  /** 清除缓存 */
  clearCache(): void {
    this.cache = null;
    localStorage.removeItem('plan_cache');
  }
}

export const planService = new PlanService();
```

**Step 2: Commit**

```bash
git add src/services/planService.ts
git commit -m "feat: add plan service with caching and fallback"
```

---

## Task 3: Create Plan Guard Utility

**Files:**
- Create: `src/utils/planGuard.ts`

**Step 1: Create plan guard utility**

```typescript
// src/utils/planGuard.ts
import type { PlanResponse, FeatureCheckResult } from '../types/plan';

/**
 * 检查功能是否可用
 */
export function checkFeatureLimit(
  plan: PlanResponse | null,
  feature: string
): FeatureCheckResult {
  if (!plan) {
    return { allowed: true }; // 无数据时允许
  }

  // 检查订阅状态
  if (plan.subscription.status === 'expired') {
    return { allowed: false, reason: '套餐已过期，请续费' };
  }

  if (plan.subscription.status === 'cancelled') {
    return { allowed: false, reason: '套餐已取消' };
  }

  // 检查执行次数
  if (feature === 'workflow-execution') {
    if (plan.usage.current >= plan.usage.total) {
      return { allowed: false, reason: '执行次数已用完，请升级套餐' };
    }
  }

  // 检查功能权限
  if (!plan.limits.features.includes(feature)) {
    return { allowed: false, reason: '当前套餐不支持此功能' };
  }

  return { allowed: true };
}

/**
 * 计算使用百分比
 */
export function calculateUsagePercent(plan: PlanResponse | null): number {
  if (!plan) return 0;
  return Math.round((plan.usage.current / plan.usage.total) * 100);
}

/**
 * 检查是否接近限制
 */
export function isNearLimit(plan: PlanResponse | null, threshold = 80): boolean {
  if (!plan) return false;
  return calculateUsagePercent(plan) >= threshold;
}

/**
 * 计算到期天数
 */
export function getDaysUntilExpiry(plan: PlanResponse | null): number {
  if (!plan) return 0;

  const endDate = new Date(plan.subscription.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * 检查是否已过期
 */
export function isExpired(plan: PlanResponse | null): boolean {
  if (!plan) return false;
  return plan.subscription.status === 'expired' || getDaysUntilExpiry(plan) === 0;
}
```

**Step 2: Commit**

```bash
git add src/utils/planGuard.ts
git commit -m "feat: add plan guard utility for feature checks"
```

---

## Task 4: Create Plan WebSocket Hook

**Files:**
- Create: `src/hooks/usePlanWebSocket.ts`

**Step 1: Create WebSocket hook**

```typescript
// src/hooks/usePlanWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import type { PlanUpdateMessage } from '../types/plan';

interface UsePlanWebSocketOptions {
  wsUrl: string;
  onMessage: (message: PlanUpdateMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * WebSocket 连接管理
 */
export function usePlanWebSocket({
  wsUrl,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UsePlanWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: PlanUpdateMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        onDisconnect?.();

        // 自动重连（指数退避）
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [wsUrl, onMessage, onConnect, onDisconnect, onError]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect };
}
```

**Step 2: Commit**

```bash
git add src/hooks/usePlanWebSocket.ts
git commit -m "feat: add WebSocket hook with auto-reconnect"
```

---

## Task 5: Create Plan Context

**Files:**
- Create: `src/context/PlanContext.tsx`

**Step 1: Create Plan Context**

```typescript
// src/context/PlanContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { planService } from '../services/planService';
import { usePlanWebSocket } from '../hooks/usePlanWebSocket';
import {
  calculateUsagePercent,
  isNearLimit,
  getDaysUntilExpiry,
  isExpired,
  checkFeatureLimit,
} from '../utils/planGuard';
import type { PlanContextValue, PlanState, PlanResponse, FeatureCheckResult } from '../types/plan';

const PlanContext = createContext<PlanContextValue | null>(null);

interface PlanProviderProps {
  children: ReactNode;
  wsUrl?: string;
  pollInterval?: number; // 轮询间隔（毫秒），WebSocket 失败时使用
}

export function PlanProvider({
  children,
  wsUrl = '',
  pollInterval = 5 * 60 * 1000,
}: PlanProviderProps) {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsEnabled, setWsEnabled] = useState(!!wsUrl);

  // 计算派生状态
  const usagePercent = calculateUsagePercent(plan);
  const nearLimit = isNearLimit(plan);
  const expired = isExpired(plan);
  const daysUntilExpiry = getDaysUntilExpiry(plan);

  const state: PlanState = {
    plan,
    loading,
    error,
    usagePercent,
    isNearLimit: nearLimit,
    isExpired: expired,
    daysUntilExpiry,
  };

  // 刷新套餐数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await planService.getPlan(true);
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取套餐信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查功能限制
  const checkLimit = useCallback(
    (feature: string): FeatureCheckResult => {
      return checkFeatureLimit(plan, feature);
    },
    [plan]
  );

  // 初始化加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 轮询（当 WebSocket 不可用时）
  useEffect(() => {
    if (wsEnabled) return; // WebSocket 可用时不轮询

    const interval = setInterval(() => {
      refresh();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [wsEnabled, pollInterval, refresh]);

  // WebSocket 连接
  usePlanWebSocket({
    wsUrl,
    onMessage: useCallback((message) => {
      setPlan(message.data);
    }, []),
    onConnect: useCallback(() => {
      setWsEnabled(true);
      setError(null);
    }, []),
    onDisconnect: useCallback(() => {
      setWsEnabled(false);
    }, []),
    onError: useCallback(() => {
      setWsEnabled(false);
    }, []),
  });

  const value: PlanContextValue = {
    state,
    refresh,
    checkLimit,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlanContext(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlanContext must be used within PlanProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add src/context/PlanContext.tsx
git commit -m "feat: add PlanContext with WebSocket and polling support"
```

---

## Task 6: Update App.tsx to Integrate PlanProvider

**Files:**
- Modify: `src/App.tsx:1-10`

**Step 1: Add PlanProvider to App**

```typescript
// src/App.tsx
import { useWorkflowState } from './hooks/useWorkflowState';
import { PlanProvider } from './context/PlanContext'; // 新增
import './plugins';
import Layout from './components/Layout';
// ... 其他导入

const WS_URL = import.meta.env.VITE_PLAN_WS_URL || 'ws://localhost:8080/plan-updates';

export default function App() {
  return (
    <PlanProvider wsUrl={WS_URL}>
      <AppContent />
    </PlanProvider>
  );
}

function AppContent() {  // 重命名原有组件
  const {
    state, selectNode, setZoom, toggleWorkflow, setActiveTab, setNavActive, toggleSidebar,
    startExecution, stopExecution, testNode,
    addNode, removeNode, moveNode, workflowNodes,
    nodeConfigs, setNodeConfig,
    headless, setHeadless,
  } = useWorkflowState();

  // ... 其余代码不变
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate PlanProvider into App"
```

---

## Task 7: Update PlanInfo Component

**Files:**
- Modify: `src/components/PlanInfo.tsx`

**Step 1: Update PlanInfo to use dynamic data**

```typescript
// src/components/PlanInfo.tsx
import { usePlanContext } from '../context/PlanContext';
import type { PlanInfo as PlanInfoType } from '../types';

interface PlanInfoProps {
  collapsed?: boolean;
}

export default function PlanInfo({ collapsed }: PlanInfoProps) {
  const { state, refresh } = usePlanContext();

  // 兼容旧的 planInfo prop（如果仍在使用）
  const planData = state.plan;

  if (!planData) {
    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const { plan, usage, subscription } = planData;
  const percent = state.usagePercent;
  const isNearLimit = state.isNearLimit;
  const isExpired = state.isExpired;
  const daysLeft = state.daysUntilExpiry;

  if (collapsed) {
    return (
      <div className="p-3 border-t border-gray-200 flex flex-col items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isNearLimit ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          <svg className={`w-4 h-4 ${isNearLimit ? 'text-red-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
      {/* 套餐名称和刷新按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">当前计划：</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900">{plan.name}</span>
          <button
            onClick={refresh}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="刷新"
            disabled={state.loading}
          >
            <svg className={`w-3 h-3 ${state.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 执行次数 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">执行次数</span>
        <span className={`text-xs ${isNearLimit ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
          {usage.current.toLocaleString()} / {usage.total.toLocaleString()}
        </span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-colors ${
            isNearLimit ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* 到期时间 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">到期时间</span>
        <span className={`text-xs ${daysLeft <= 7 ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
          {subscription.endDate}
          {daysLeft <= 30 && daysLeft > 0 && ` (${daysLeft}天)`}
        </span>
      </div>

      {/* 警告提示 */}
      {isNearLimit && !isExpired && (
        <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
          执行次数即将用完
        </div>
      )}

      {isExpired && (
        <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          套餐已过期
        </div>
      )}

      {/* 升级按钮 */}
      <button
        onClick={() => {/* 后续添加打开对话框 */}}
        className="w-full py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        升级计划
      </button>
    </div>
  );
}
```

**Step 2: Update Sidebar to not pass planInfo prop**

```typescript
// src/components/Sidebar.tsx
interface SidebarProps {
  navItems: NavItem[];
  activeNavId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavSelect: (id: string) => void;
  // 移除 planInfo prop
}

export default function Sidebar({ navItems, activeNavId, collapsed, onToggle, onNavSelect }: SidebarProps) {
  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200 ${
      collapsed ? 'w-16' : 'w-56'
    }`}>
      <Logo collapsed={collapsed} />
      <NavMenu items={navItems} activeId={activeNavId} collapsed={collapsed} onSelect={onNavSelect} />
      <PlanInfo collapsed={collapsed} />  {/* 不再传递 planInfo */}
      {/* ... */}
    </aside>
  );
}
```

**Step 3: Update App.tsx to remove planInfo**

```typescript
// src/App.tsx
function AppContent() {
  // ... 其他代码

  return (
    <Layout
      sidebar={
        <Sidebar
          navItems={navItems}
          activeNavId={state.navActiveId}
          collapsed={state.sidebarCollapsed}
          onToggle={toggleSidebar}
          onNavSelect={setNavActive}
          // 移除 planInfo prop
        />
      }
      {/* ... */}
    />
  );
}
```

**Step 4: Commit**

```bash
git add src/components/PlanInfo.tsx src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: update PlanInfo to use dynamic data from PlanContext"
```

---

## Task 8: Create PlanGuard Component

**Files:**
- Create: `src/components/PlanGuard.tsx`

**Step 1: Create PlanGuard component**

```typescript
// src/components/PlanGuard.tsx
import { ReactNode, useCallback } from 'react';
import { usePlanContext } from '../context/PlanContext';

interface PlanGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  onBlocked?: (reason: string) => void;
}

export default function PlanGuard({ feature, children, fallback, onBlocked }: PlanGuardProps) {
  const { checkLimit } = usePlanContext();

  const handleClick = useCallback((e: React.MouseEvent) => {
    const result = checkLimit(feature);

    if (!result.allowed) {
      e.preventDefault();
      e.stopPropagation();
      onBlocked?.(result.reason || '功能不可用');
      return false;
    }

    return true;
  }, [feature, checkLimit, onBlocked]);

  const result = checkLimit(feature);

  if (!result.allowed && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 用法示例：
 * <PlanGuard
 *   feature="workflow-execution"
 *   onBlocked={(reason) => toast.error(reason)}
 * >
 *   <button onClick={runWorkflow}>运行</button>
 * </PlanGuard>
 */
```

**Step 2: Commit**

```bash
git add src/components/PlanGuard.tsx
git commit -m "feat: add PlanGuard component for feature restriction"
```

---

## Task 9: Create PlanAlert Component

**Files:**
- Create: `src/components/PlanAlert.tsx`

**Step 1: Create PlanAlert component**

```typescript
// src/components/PlanAlert.tsx
import { usePlanContext } from '../context/PlanContext';

type AlertType = 'warning' | 'error' | 'info';

interface AlertConfig {
  type: AlertType;
  message: string;
  visible: boolean;
}

export default function PlanAlert() {
  const { state } = usePlanContext();

  const alertConfig = getAlertConfig(state);

  if (!alertConfig.visible) {
    return null;
  }

  const colors = {
    warning: 'bg-orange-50 border-orange-200 text-orange-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`border-t px-4 py-2 text-sm text-center ${colors[alertConfig.type]}`}>
      <span className="font-medium">{alertConfig.message}</span>
    </div>
  );
}

function getAlertConfig(state: PlanState): AlertConfig {
  if (state.isExpired) {
    return {
      type: 'error',
      message: '套餐已过期，请续费以继续使用',
      visible: true,
    };
  }

  if (state.daysUntilExpiry <= 3) {
    return {
      type: 'error',
      message: `套餐将在 ${state.daysUntilExpiry} 天后到期，请及时续费`,
      visible: true,
    };
  }

  if (state.daysUntilExpiry <= 7) {
    return {
      type: 'warning',
      message: `套餐将在 ${state.daysUntilExpiry} 天后到期`,
      visible: true,
    };
  }

  if (state.isNearLimit) {
    return {
      type: 'warning',
      message: `执行次数即将用完 (${state.usagePercent}%)`,
      visible: true,
    };
  }

  return {
    type: 'info',
    message: '',
    visible: false,
  };
}
```

**Step 2: Integrate PlanAlert into Layout**

```typescript
// src/components/Layout.tsx
import PlanAlert from './PlanAlert';

export default function Layout({ sidebar, header, mainContent, userOverlay }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      {sidebar}
      <main className="flex-1 flex flex-col min-w-0">
        <PlanAlert />  {/* 添加警告横幅 */}
        {header}
        {mainContent}
      </main>
      {userOverlay}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/PlanAlert.tsx src/components/Layout.tsx
git commit -m "feat: add PlanAlert component for subscription warnings"
```

---

## Task 10: Create UpgradeModal Component

**Files:**
- Create: `src/components/UpgradeModal.tsx`

**Step 1: Create UpgradeModal component**

```typescript
// src/components/UpgradeModal.tsx
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  return (
    <dialog
      open={open}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">升级套餐</h2>
          <p className="text-sm text-gray-500 mt-1">解锁更多功能和执行次数</p>
        </div>

        {/* 套餐选项 */}
        <div className="space-y-3 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">专业版</span>
              <span className="text-sm text-gray-500">¥299/月</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 50,000 次执行/月</li>
              <li>• 无限工作流</li>
              <li>• AI 助手</li>
              <li>• API 访问</li>
            </ul>
          </div>

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">企业版</span>
              <span className="text-sm text-gray-500">联系我们</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 无限执行次数</li>
              <li>• 专属技术支持</li>
              <li>• 私有化部署</li>
              <li>• 定制功能开发</li>
            </ul>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <p className="text-sm text-gray-600 text-center mb-3">联系销售团队</p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:sales@example.com"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              邮箱
            </a>
            <a
              href="tel:+86-400-xxx-xxxx"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              电话
            </a>
            <a
              href="#"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-321-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              微信
            </a>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          稍后再说
        </button>
      </div>
    </dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/UpgradeModal.tsx
git commit -m "feat: add UpgradeModal with contact information"
```

---

## Task 11: Integrate UpgradeModal with PlanInfo

**Files:**
- Modify: `src/components/PlanInfo.tsx`
- Modify: `src/App.tsx`

**Step 1: Add upgrade modal state to App**

```typescript
// src/App.tsx
import { useState } from 'react';
import UpgradeModal from './components/UpgradeModal';

function AppContent() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // ... 其他代码

  return (
    <Layout
      sidebar={
        <Sidebar
          navItems={navItems}
          activeNavId={state.navActiveId}
          collapsed={state.sidebarCollapsed}
          onToggle={toggleSidebar}
          onNavSelect={setNavActive}
        />
      }
      header={/* ... */}
      mainContent={/* ... */}
      userOverlay={<UserOverlay />}
    />
    <UpgradeModal
      open={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
    />
  );
}
```

**Step 2: Update PlanInfo to trigger modal**

```typescript
// src/components/PlanInfo.tsx

interface PlanInfoProps {
  collapsed?: boolean;
  onUpgrade?: () => void;  // 新增
}

export default function PlanInfo({ collapsed, onUpgrade }: PlanInfoProps) {
  const { state, refresh } = usePlanContext();

  // ... 其他代码

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
      {/* ... 其他内容 */}

      {/* 升级按钮 */}
      <button
        onClick={() => onUpgrade?.()}
        className="w-full py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        升级计划
      </button>
    </div>
  );
}
```

**Step 3: Pass onUpgrade prop in Sidebar**

```typescript
// src/components/Sidebar.tsx

interface SidebarProps {
  navItems: NavItem[];
  activeNavId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavSelect: (id: string) => void;
  onUpgrade?: () => void;  // 新增
}

export default function Sidebar({ navItems, activeNavId, collapsed, onToggle, onNavSelect, onUpgrade }: SidebarProps) {
  return (
    <aside className={/* ... */}>
      <Logo collapsed={collapsed} />
      <NavMenu items={navItems} activeId={activeNavId} collapsed={collapsed} onSelect={onNavSelect} />
      <PlanInfo collapsed={collapsed} onUpgrade={onUpgrade} />
      {/* ... */}
    </aside>
  );
}
```

**Step 4: Pass onUpgrade in App**

```typescript
// src/App.tsx

<Layout
  sidebar={
    <Sidebar
      navItems={navItems}
      activeNavId={state.navActiveId}
      collapsed={state.sidebarCollapsed}
      onToggle={toggleSidebar}
      onNavSelect={setNavActive}
      onUpgrade={() => setUpgradeModalOpen(true)}
    />
  }
  {/* ... */}
/>
```

**Step 5: Commit**

```bash
git add src/components/PlanInfo.tsx src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: integrate UpgradeModal with PlanInfo and Sidebar"
```

---

## Task 12: Add PlanGuard to Workflow Execution

**Files:**
- Modify: `src/hooks/useWorkflowState.ts`
- Modify: `src/components/Header.tsx`

**Step 1: Update startExecution to check limits**

```typescript
// src/hooks/useWorkflowState.ts
import { usePlanContext } from '../context/PlanContext';

export function useWorkflowState() {
  // ... 现有代码
  const { checkLimit } = usePlanContext();

  const startExecution = useCallback(() => {
    // 检查执行次数限制
    const limitCheck = checkLimit('workflow-execution');
    if (!limitCheck.allowed) {
      // 显示错误提示
      alert(limitCheck.reason || '执行次数不足');
      return;
    }

    // 现有的执行逻辑
    setState(prev => {
      if (prev.executing) return prev;
      return {
        ...prev,
        executing: true,
        currentStep: 0,
        totalSteps: stepNodeCount,
        activeTab: 'logs',
        executionLogs: [],
        nodeStatuses: Object.fromEntries(workflowNodes.map(n => [n.id, 'idle'] as const)),
        stepOutputs: {},
      };
    });

    // ... 其余代码
  }, [checkLimit, /* 其他依赖 */]);

  // ... 返回
}
```

**Step 2: Commit**

```bash
git add src/hooks/useWorkflowState.ts
git commit -m "feat: add execution limit check before running workflow"
```

---

## Task 13: Add Environment Variable Configuration

**Files:**
- Create: `.env.local`
- Modify: `.env.example`

**Step 1: Create .env.local**

```bash
# .env.local
VITE_PLAN_WS_URL=ws://localhost:8080/plan-updates
VITE_API_BASE_URL=http://localhost:3456/api
```

**Step 2: Create .env.example**

```bash
# .env.example
VITE_PLAN_WS_URL=ws://localhost:8080/plan-updates
VITE_API_BASE_URL=http://localhost:3456/api
```

**Step 3: Commit**

```bash
git add .env.local .env.example
git commit -m "feat: add environment variables for API configuration"
```

---

## Task 14: Add Loading and Error States

**Files:**
- Modify: `src/components/PlanInfo.tsx`

**Step 1: Enhance error handling in PlanInfo**

```typescript
// src/components/PlanInfo.tsx

export default function PlanInfo({ collapsed, onUpgrade }: PlanInfoProps) {
  const { state, refresh } = usePlanContext();

  if (state.loading && !state.plan) {
    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (state.error && !state.plan) {
    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center space-y-2">
          <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-gray-500">无法加载套餐信息</p>
          <button
            onClick={refresh}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // ... 其余代码
}
```

**Step 2: Commit**

```bash
git add src/components/PlanInfo.tsx
git commit -m "feat: add loading and error states to PlanInfo"
```

---

## Task 15: Final Integration and Testing

**Step 1: Update types index**

```typescript
// src/types/index.ts
export * from './plan';
```

**Step 2: Verify all imports**

检查所有组件的导入路径是否正确。

**Step 3: Test scenarios**

1. **加载状态**：刷新页面，查看骨架屏
2. **正常状态**：查看套餐信息显示
3. **接近限制**：修改 mock 数据使 usage > 80%
4. **已过期**：修改 subscription.status = 'expired'
5. **功能限制**：尝试执行工作流（应该被限制）
6. **升级对话框**：点击升级按钮

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete dynamic subscription plan implementation

- Add PlanContext with WebSocket and polling support
- Create PlanGuard for feature restriction
- Add PlanAlert for subscription warnings
- Add UpgradeModal with contact information
- Update PlanInfo with dynamic data
- Integrate execution limit checking"
```

---

## 测试清单

- [ ] 页面加载时套餐信息正确显示
- [ ] 刷新按钮功能正常
- [ ] 进度条百分比计算正确
- [ ] 接近限制时进度条变红
- [ ] 到期天数显示正确
- [ ] 即将到期时显示警告
- [ ] 已过期时显示错误状态
- [ ] 点击升级按钮打开对话框
- [ ] 对话框联系方式正确显示
- [ ] 执行工作流时检查限制
- [ ] 超限时禁止执行并显示提示
- [ ] WebSocket 连接失败时降级为轮询
- [ ] 离线时显示本地缓存数据

---

## 完成

实施完成后，套餐订阅功能将完全动态化，支持：
- 实时更新（WebSocket）
- 自动降级（轮询）
- 功能限制（PlanGuard）
- 用户提醒（PlanAlert）
- 升级引导（UpgradeModal）
