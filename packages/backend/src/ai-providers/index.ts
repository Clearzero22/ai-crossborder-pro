/**
 * AI Providers 统一入口
 *
 * 使用示例:
 *
 * import { initializeProviders, aiRouter } from './ai-providers';
 *
 * // 初始化 Providers
 * initializeProviders();
 *
 * // 使用默认 Provider 识别图片
 * const result = await aiRouter.recognize(image, 'product-analysis');
 *
 * // 指定使用 OpenAI
 * const result = await aiRouter.recognize(image, 'product-analysis', undefined, {
 *   providerName: 'openai',
 * });
 */

// 导出类型
export * from './types';

// 导出模板
export * from './templates';

// 导出基类
export { BaseAiProvider } from './base';

// 导出 Providers
export { QwenProvider, QWEN_VL_MODELS } from './providers/qwen.provider';
export { OpenAiProvider, OPENAI_MODELS } from './providers/openai.provider';
export { ClaudeProvider, CLAUDE_MODELS } from './providers/claude.provider';
export { GeminiProvider, GEMINI_MODELS } from './providers/gemini.provider';

// 导出注册中心和路由
export { ProviderRegistry, globalRegistry } from './registry';
export { AiRouter, aiRouter } from './ai-router';

// 本文件内使用
import { QwenProvider } from './providers/qwen.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { globalRegistry } from './registry';
import { apiKeyConfig, type ProviderName } from '../core/api-key-config';

// Provider 优先级配置
const PROVIDER_PRIORITY: Record<ProviderName, number> = {
  qwen: 0,
  openai: 1,
  claude: 2,
  gemini: 3,
};

// Provider 类映射
const PROVIDER_CLASSES = {
  qwen: QwenProvider,
  openai: OpenAiProvider,
  claude: ClaudeProvider,
  gemini: GeminiProvider,
};

/**
 * 初始化所有配置了 API Key 的 Providers
 *
 * 优先从数据库读取配置，如果不存在则回退到环境变量
 */
export async function initializeProviders(): Promise<void> {
  console.log('[AI Providers] 初始化中...');

  // 尝试初始化所有支持的 Provider
  const providers: ProviderName[] = ['qwen', 'openai', 'claude', 'gemini'];

  for (const providerName of providers) {
    await initializeProvider(providerName);
  }

  const available = globalRegistry.getAllEnabled();
  console.log(`[AI Providers] 初始化完成，可用: ${available.length} 个 Provider`);
}

/**
 * 初始化单个 Provider
 */
async function initializeProvider(providerName: ProviderName): Promise<void> {
  try {
    // 从数据库或环境变量获取配置
    const config = await apiKeyConfig.getProviderConfig(providerName);

    if (!config?.apiKey) {
      console.log(`[AI Providers] ${providerName} 未配置，跳过`);
      return;
    }

    // 创建 Provider 实例
    const ProviderClass = PROVIDER_CLASSES[providerName];
    const instance = new ProviderClass({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    // 注册到全局注册中心
    globalRegistry.register(instance, PROVIDER_PRIORITY[providerName], true);
    console.log(`[AI Providers] 已注册: ${instance.displayName}`);
  } catch (e) {
    console.warn(`[AI Providers] 注册 ${providerName} 失败:`, e);
  }
}

/**
 * 重载指定 Provider 的配置（热更新）
 *
 * 用于运行时更新 API Key 后重新初始化 Provider
 */
export async function reloadProvider(providerName: ProviderName): Promise<boolean> {
  console.log(`[AI Providers] 重载 Provider: ${providerName}`);

  try {
    // 1. 先注销旧的 Provider
    globalRegistry.unregister(providerName);
    console.log(`[AI Providers] 已注销旧实例: ${providerName}`);

    // 2. 重新初始化
    await initializeProvider(providerName);

    // 3. 检查是否成功
    const provider = globalRegistry.get(providerName);
    if (provider) {
      console.log(`[AI Providers] ${providerName} 重载成功`);
      return true;
    } else {
      console.log(`[AI Providers] ${providerName} 重载后未激活（可能配置已删除）`);
      return false;
    }
  } catch (e) {
    console.error(`[AI Providers] 重载 ${providerName} 失败:`, e);
    return false;
  }
}

/**
 * 获取当前所有 Provider 的状态
 */
export function getProviderStatus(): Array<{
  name: string;
  displayName: string;
  enabled: boolean;
  priority: number;
}> {
  const all = globalRegistry.getAllEnabled();
  return all.map(p => ({
    name: p.providerName,
    displayName: p.displayName,
    enabled: true,
    priority: PROVIDER_PRIORITY[p.providerName as ProviderName] ?? 999,
  }));
}
