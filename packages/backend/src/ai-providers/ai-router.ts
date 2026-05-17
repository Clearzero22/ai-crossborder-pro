/**
 * AI Router Service
 * 统一的 AI 服务路由入口，支持：
 * - 指定 Provider
 * - 自动降级
 * - 优先策略
 */

import { globalRegistry } from './registry';
import { getPromptTemplate } from './templates';
import type { IAiProvider, RecognizeRequest, CompareRequest, ChatMessage } from './types';

export interface RouterOptions {
  /** 指定使用的 Provider */
  providerName?: string;
  /** 是否启用自动降级 */
  fallbackEnabled?: boolean;
  /** 降级尝试次数 */
  maxRetries?: number;
}

export class AiRouter {
  private options: Required<RouterOptions>;

  constructor(options?: RouterOptions) {
    this.options = {
      providerName: options?.providerName || '',
      fallbackEnabled: options?.fallbackEnabled ?? true,
      maxRetries: options?.maxRetries ?? 3,
    };
  }

  /**
   * 设置选项
   */
  setOptions(options: Partial<RouterOptions>): void {
    Object.assign(this.options, options);
  }

  /**
   * 获取要使用的 Provider（按优先级）
   */
  private getProvidersForRequest(preferredName?: string): IAiProvider[] {
    const all = globalRegistry.getAllEnabled();
    if (!all.length) {
      throw new Error('没有可用的 AI Provider');
    }

    if (preferredName) {
      const preferred = globalRegistry.get(preferredName);
      if (preferred) {
        return [preferred, ...all.filter((p) => p.providerName !== preferredName)];
      }
    }

    return all;
  }

  /**
   * 带降级的执行
   */
  private async executeWithFallback<T>(
    fn: (provider: IAiProvider) => Promise<T>,
    preferredName?: string,
  ): Promise<T> {
    const providers = this.getProvidersForRequest(preferredName);
    let lastError: Error | null = null;

    for (let i = 0; i < Math.min(providers.length, this.options.maxRetries); i++) {
      const provider = providers[i];
      try {
        if (i > 0) {
          console.log(`[AI Router] 降级到: ${provider.displayName}`);
        }
        return await fn(provider);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[AI Router] Provider ${provider.displayName} 失败:`, lastError.message);
      }
    }

    throw lastError || new Error('所有 Provider 都失败了');
  }

  // ─── 核心方法 ─────────────────────────────────────────────────

  /**
   * 单图识别
   */
  async recognize(
    image: string,
    promptOrTemplateId?: string,
    model?: string,
    options?: RouterOptions,
  ): Promise<string> {
    const request = this.buildRecognizeRequest(image, promptOrTemplateId, model);
    const providerName = options?.providerName || this.options.providerName;
    const useFallback = options?.fallbackEnabled ?? this.options.fallbackEnabled;

    if (useFallback) {
      return await this.executeWithFallback(
        (provider) => provider.recognize(request),
        providerName,
      );
    }

    const provider = providerName
      ? globalRegistry.get(providerName)
      : globalRegistry.getDefault();
    if (!provider) throw new Error('没有可用的 AI Provider');

    return provider.recognize(request);
  }

  /**
   * 多图对比
   */
  async compare(
    images: string[],
    promptOrTemplateId?: string,
    model?: string,
    options?: RouterOptions,
  ): Promise<string> {
    const request = this.buildCompareRequest(images, promptOrTemplateId, model);
    const providerName = options?.providerName || this.options.providerName;
    const useFallback = options?.fallbackEnabled ?? this.options.fallbackEnabled;

    if (useFallback) {
      return await this.executeWithFallback(
        (provider) => provider.compare(request),
        providerName,
      );
    }

    const provider = providerName
      ? globalRegistry.get(providerName)
      : globalRegistry.getDefault();
    if (!provider) throw new Error('没有可用的 AI Provider');

    return provider.compare(request);
  }

  /**
   * 通用聊天
   */
  async chat(
    messages: ChatMessage[],
    model?: string,
    options?: RouterOptions,
  ): Promise<string> {
    const providerName = options?.providerName || this.options.providerName;
    const useFallback = options?.fallbackEnabled ?? this.options.fallbackEnabled;

    if (useFallback) {
      return await this.executeWithFallback(
        (provider) => provider.chat(messages, model),
        providerName,
      );
    }

    const provider = providerName
      ? globalRegistry.get(providerName)
      : globalRegistry.getDefault();
    if (!provider) throw new Error('没有可用的 AI Provider');

    return provider.chat(messages, model);
  }

  // ─── 辅助方法 ─────────────────────────────────────────────────

  private buildRecognizeRequest(
    image: string,
    promptOrTemplateId?: string,
    model?: string,
  ): RecognizeRequest {
    const template = promptOrTemplateId ? getPromptTemplate(promptOrTemplateId) : undefined;
    return {
      image,
      prompt: template ? undefined : promptOrTemplateId,
      templateId: template ? promptOrTemplateId : undefined,
      model,
    };
  }

  private buildCompareRequest(
    images: string[],
    promptOrTemplateId?: string,
    model?: string,
  ): CompareRequest {
    const template = promptOrTemplateId ? getPromptTemplate(promptOrTemplateId) : undefined;
    return {
      images,
      prompt: template ? undefined : promptOrTemplateId,
      templateId: template ? promptOrTemplateId : undefined,
      model,
    };
  }
}

// 全局 AI Router 实例
export const aiRouter = new AiRouter();
