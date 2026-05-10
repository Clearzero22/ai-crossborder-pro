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
