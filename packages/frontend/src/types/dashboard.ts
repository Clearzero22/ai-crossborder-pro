// src/types/dashboard.ts

/** 统计数据 */
export interface DashboardStats {
  totalExecutions: number;
  successRate: number;
  publishedProducts: number;
  totalDuration: number;
  changeFromLastMonth: {
    executions: number;
    successRate: number;
    products: number;
    duration: number;
  };
}

/** 执行记录 */
export interface DashboardExecution {
  id: number;
  workflowName: string;
  status: 'success' | 'error';
  duration: number;
  errorMessage?: string;
  startedAt: string;
}

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string;
  count: number;
}

/** 用户概览 */
export interface DashboardUser {
  userName: string;
  planName: string;
  daysActive: number;
  lastLoginAt: string;
  activeWorkflows: number;
  todayExecutions: number;
  pendingTasks: number;
}

/** API 响应包装 */
export interface ApiResponse<T> {
  data: T;
}

/** 执行记录响应 */
export interface ExecutionsResponse {
  executions: DashboardExecution[];
  total: number;
}

/** 趋势响应 */
export interface TrendResponse {
  weekly: TrendDataPoint[];
}

/** Dashboard 状态 */
export interface DashboardState {
  stats: DashboardStats | null;
  executions: DashboardExecution[];
  trend: TrendDataPoint[];
  user: DashboardUser | null;
  loading: boolean;
  error: string | null;
}
