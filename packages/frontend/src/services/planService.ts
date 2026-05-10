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
