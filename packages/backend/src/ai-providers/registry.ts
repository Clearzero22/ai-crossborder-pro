/**
 * AI Provider 注册表
 * 管理所有可用的 AI Provider
 */

import type { IAiProvider } from './types';

interface ProviderRegistryEntry {
  provider: IAiProvider;
  priority: number;
  enabled: boolean;
}

export class ProviderRegistry {
  private providers: Map<string, ProviderRegistryEntry> = new Map();

  /**
   * 注册一个 Provider
   */
  register(provider: IAiProvider, priority = 0, enabled = true): void {
    this.providers.set(provider.providerName, {
      provider,
      priority,
      enabled,
    });
  }

  /**
   * 取消注册一个 Provider
   */
  unregister(providerName: string): void {
    this.providers.delete(providerName);
  }

  /**
   * 获取指定的 Provider
   */
  get(providerName: string): IAiProvider | undefined {
    const entry = this.providers.get(providerName);
    if (!entry || !entry.enabled) return undefined;
    return entry.provider;
  }

  /**
   * 获取所有已启用的 Provider（按优先级排序）
   */
  getAllEnabled(): IAiProvider[] {
    const entries = Array.from(this.providers.values())
      .filter((entry) => entry.enabled)
      .sort((a, b) => a.priority - b.priority);
    return entries.map((entry) => entry.provider);
  }

  /**
   * 获取所有 Provider（包括禁用的）
   */
  getAll(): IAiProvider[] {
    return Array.from(this.providers.values()).map((entry) => entry.provider);
  }

  /**
   * 获取优先级最高的可用 Provider
   */
  getDefault(): IAiProvider | undefined {
    const enabled = this.getAllEnabled();
    return enabled[0];
  }

  /**
   * 启用/禁用 Provider
   */
  setEnabled(providerName: string, enabled: boolean): boolean {
    const entry = this.providers.get(providerName);
    if (!entry) return false;
    entry.enabled = enabled;
    return true;
  }

  /**
   * 检查 Provider 是否可用
   */
  isAvailable(providerName: string): boolean {
    const entry = this.providers.get(providerName);
    return !!entry && entry.enabled;
  }
}

// 全局注册表实例
export const globalRegistry = new ProviderRegistry();
