// src/services/mockDashboardData.ts
import type { DashboardStats, DashboardExecution, TrendDataPoint, DashboardUser } from '../types/dashboard';

/** Mock 统计数据 */
export const mockStats: DashboardStats = {
  totalExecutions: 1247,
  successRate: 96.8,
  publishedProducts: 856,
  totalDuration: 328,
  changeFromLastMonth: {
    executions: 12.5,
    successRate: 2.1,
    products: 48,
    duration: 42,
  },
};

/** Mock 执行记录 */
export const mockExecutions: DashboardExecution[] = [
  {
    id: 1,
    workflowName: '创建新品并上架到Shopify',
    status: 'success',
    duration: 23,
    startedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 2,
    workflowName: '批量更新商品价格',
    status: 'success',
    duration: 45,
    startedAt: new Date(Date.now() - 720000).toISOString(),
  },
  {
    id: 3,
    workflowName: '同步库存到亚马逊',
    status: 'error',
    duration: 12,
    errorMessage: 'API 认证失败',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 4,
    workflowName: 'AI生成商品描述',
    status: 'success',
    duration: 8,
    startedAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 5,
    workflowName: '抓取竞品价格数据',
    status: 'success',
    duration: 134,
    startedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

/** Mock 本周趋势 */
export const mockTrend: TrendDataPoint[] = [
  { date: '2026-04-22', count: 12 },
  { date: '2026-04-23', count: 18 },
  { date: '2026-04-24', count: 8 },
  { date: '2026-04-25', count: 14 },
  { date: '2026-04-26', count: 16 },
  { date: '2026-04-27', count: 20 },
  { date: '2026-04-28', count: 14 },
];

/** Mock 用户概览 */
export const mockUser: DashboardUser = {
  userName: '跨境小助手',
  planName: '专业版',
  daysActive: 128,
  lastLoginAt: new Date().toISOString(),
  activeWorkflows: 3,
  todayExecutions: 14,
  pendingTasks: 2,
};

/** 模拟 API 延迟 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Mock API 服务 */
export const mockDashboardService = {
  async getStats(): Promise<DashboardStats> {
    await delay(500);
    return mockStats;
  },

  async getExecutions(limit = 5): Promise<DashboardExecution[]> {
    await delay(300);
    return mockExecutions.slice(0, limit);
  },

  async getTrend(): Promise<TrendDataPoint[]> {
    await delay(200);
    return mockTrend;
  },

  async getUser(): Promise<DashboardUser> {
    await delay(100);
    return mockUser;
  },
};
