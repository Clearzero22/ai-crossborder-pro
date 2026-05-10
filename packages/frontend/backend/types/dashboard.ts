// backend/types/dashboard.ts

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

export interface ExecutionRecord {
  id: number;
  workflowName: string;
  status: 'success' | 'error';
  duration: number;
  errorMessage?: string;
  startedAt: Date;
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface DashboardUser {
  userName: string;
  planName: string;
  daysActive: number;
  lastLoginAt: Date;
  activeWorkflows: number;
  todayExecutions: number;
  pendingTasks: number;
}
