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

/**
 * 初始化所有配置了 API Key 的 Providers
 *
 * 根据环境变量自动注册可用的 Provider
 */
export function initializeProviders(): void {
  console.log('[AI Providers] 初始化中...');

  // 阿里云 Qwen
  if (process.env.DASHSCOPE_API_KEY) {
    try {
      const qwen = new QwenProvider();
      globalRegistry.register(qwen, 0, true);
      console.log(`[AI Providers] 已注册: ${qwen.displayName}`);
    } catch (e) {
      console.warn('[AI Providers] 注册 Qwen 失败:', e);
    }
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAiProvider();
      globalRegistry.register(openai, 1, true);
      console.log(`[AI Providers] 已注册: ${openai.displayName}`);
    } catch (e) {
      console.warn('[AI Providers] 注册 OpenAI 失败:', e);
    }
  }

  // Anthropic Claude
  if (process.env.CLAUDE_API_KEY) {
    try {
      const claude = new ClaudeProvider();
      globalRegistry.register(claude, 2, true);
      console.log(`[AI Providers] 已注册: ${claude.displayName}`);
    } catch (e) {
      console.warn('[AI Providers] 注册 Claude 失败:', e);
    }
  }

  // Google Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = new GeminiProvider();
      globalRegistry.register(gemini, 3, true);
      console.log(`[AI Providers] 已注册: ${gemini.displayName}`);
    } catch (e) {
      console.warn('[AI Providers] 注册 Gemini 失败:', e);
    }
  }

  const available = globalRegistry.getAllEnabled();
  console.log(`[AI Providers] 初始化完成，可用: ${available.length} 个 Provider`);
}
