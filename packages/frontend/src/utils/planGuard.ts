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
