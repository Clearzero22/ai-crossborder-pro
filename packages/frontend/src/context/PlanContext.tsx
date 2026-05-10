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
