/**
 * AI 优化执行器 — 通过后端 Gemini 服务优化商品文案
 *
 * 调用 POST /api/ai/optimize，由后端 Playwright 操作 Gemini 网页版完成文案优化。
 * 不再需要前端传递 API Key。
 */
import type { NodeExecutor } from '../types';

export const claudeOptimizeExecutor: NodeExecutor = {
  type: 'ai-optimize',
  label: 'AI 优化商品文案',
  icon: 'zap',
  category: 'ai',

  inputSchema: {
    title: { type: 'string', label: '商品标题', required: true },
    description: { type: 'string', label: '商品描述' },
    brand: { type: 'string', label: '品牌' },
  },

  outputSchema: {
    optimizedTitle: { type: 'string', label: '优化标题' },
    optimizedDescription: { type: 'string', label: '优化描述' },
    seoKeywords: { type: 'string[]', label: 'SEO 关键词' },
  },

  configSchema: {
    tone: {
      type: 'select', label: '输出语气',
      default: 'professional',
      options: [
        { label: '专业', value: 'professional' },
        { label: '营销', value: 'marketing' },
        { label: '简洁', value: 'concise' },
      ],
    },
    language: {
      type: 'select', label: '输出语言',
      default: 'zh-CN',
      options: [
        { label: '中文', value: 'zh-CN' },
        { label: 'English', value: 'en-US' },
        { label: '日本語', value: 'ja-JP' },
      ],
    },
  },

  async execute(ctx) {
    const tone = (ctx.config.tone as string) || 'professional';
    const language = (ctx.config.language as string) || 'zh-CN';
    const title = (ctx.input.title as string) || '';
    const description = (ctx.input.description as string) || '';
    const bulletPoints = ctx.input.bulletPoints as string[] | undefined;
    const longDescription = ctx.input.longDescription as string | undefined;

    // Extract competitor data from all upstream outputs
    const allOutputs = ctx.allOutputs || {};
    const competitors: Array<Record<string, unknown>> = [];
    for (const [nodeId, output] of Object.entries(allOutputs)) {
      if (nodeId.startsWith('amazon-product') && output.title) {
        competitors.push({
          title: output.title,
          brand: output.brand,
          price: output.price,
          rating: output.rating,
          bulletPoints: output.bulletPoints,
          longDescription: output.longDescription,
        });
      }
    }

    // Extract keywords from upstream
    const keywords: Array<Record<string, unknown>> = [];
    for (const [, output] of Object.entries(allOutputs)) {
      if (Array.isArray(output.rawKeywords)) {
        keywords.push(...(output.rawKeywords as Array<Record<string, unknown>>).slice(0, 15));
      }
    }

    ctx.logger('info', `调用后端 Gemini 文案优化，语言: ${language}，语气: ${tone}`);
    if (competitors.length > 0) {
      ctx.logger('info', `附带 ${competitors.length} 个竞品 Listing 数据`);
    }

    const resp = await fetch('/api/ai/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        bulletPoints,
        longDescription,
        competitors: competitors.slice(0, 3),
        keywords,
        tone,
        language,
      }),
      signal: ctx.abortSignal,
    });

    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try {
        const err = await resp.json();
        errMsg = err.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await resp.json();

    ctx.logger('success', 'Gemini 文案优化完成');

    return {
      optimizedTitle: data.optimizedTitle || title,
      optimizedDescription: data.optimizedDescription || description,
      optimizedBulletPoints: data.optimizedBulletPoints || [],
      optimizedLongDescription: data.optimizedLongDescription || '',
      seoKeywords: data.seoKeywords || [],
      competitorAnalysis: data.competitorAnalysis || '',
    };
  },
};
