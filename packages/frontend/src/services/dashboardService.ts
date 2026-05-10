// src/services/dashboardService.ts
import type { DashboardStats, DashboardExecution, TrendDataPoint, DashboardUser, ApiResponse, ExecutionsResponse, TrendResponse } from '../types/dashboard';
import { mockDashboardService } from './mockDashboardData';

const API_BASE = '/api/dashboard';

/** 是否使用 mock 数据（开发环境默认开启） */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.DEV;

export const dashboardService = {
  /** 获取统计数据 */
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) return mockDashboardService.getStats();

    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data: ApiResponse<DashboardStats> = await res.json();
      return data.data;
    } catch (error) {
      console.warn('API 调用失败，使用 mock 数据', error);
      return mockDashboardService.getStats();
    }
  },

  /** 获取执行记录 */
  async getExecutions(limit = 5): Promise<DashboardExecution[]> {
    if (USE_MOCK) return mockDashboardService.getExecutions(limit);

    try {
      const res = await fetch(`${API_BASE}/executions?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch executions');
      const data: ExecutionsResponse = await res.json();
      return data.executions;
    } catch (error) {
      console.warn('API 调用失败，使用 mock 数据', error);
      return mockDashboardService.getExecutions(limit);
    }
  },

  /** 获取趋势数据 */
  async getTrend(): Promise<TrendDataPoint[]> {
    if (USE_MOCK) return mockDashboardService.getTrend();

    try {
      const res = await fetch(`${API_BASE}/trend`);
      if (!res.ok) throw new Error('Failed to fetch trend');
      const data: TrendResponse = await res.json();
      return data.weekly;
    } catch (error) {
      console.warn('API 调用失败，使用 mock 数据', error);
      return mockDashboardService.getTrend();
    }
  },

  /** 获取用户概览 */
  async getUser(): Promise<DashboardUser> {
    if (USE_MOCK) return mockDashboardService.getUser();

    try {
      const res = await fetch(`${API_BASE}/user`);
      if (!res.ok) throw new Error('Failed to fetch user');
      const data: ApiResponse<DashboardUser> = await res.json();
      return data.data;
    } catch (error) {
      console.warn('API 调用失败，使用 mock 数据', error);
      return mockDashboardService.getUser();
    }
  },
};
