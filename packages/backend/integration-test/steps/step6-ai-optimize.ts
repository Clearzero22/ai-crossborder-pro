import { GeminiFileService } from '../src/services/gemini-file-service';
import type {
  GigaB2BCrawlResult,
  AmazonProductResult,
  XiyouzhaociResult,
  AiOptimizeResult,
  PipelineOptions,
} from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

function buildOptimizePrompt(
  title: string,
  step4: AmazonProductResult,
  step5: XiyouzhaociResult,
): string {
  const competitorSection = `
## 竞品 Listing 分析（Top 1）

### 竞品 1: ${step4.brand ? step4.brand + ' — ' : ''}${step4.title}
- 价格: $${step4.price} | 评分: ${step4.rating}星
- 五点描述:
${(step4.bulletPoints || []).slice(0, 3).map((b, i) => `  ${i + 1}. ${String(b).slice(0, 150)}`).join('\n')}

分析要点: 提取竞品共性卖点、差异化方向、关键词覆盖策略
`;

  const keywordSection = step5.keywords.length > 0
    ? `\n## 关键词数据\n${step5.keywords.slice(0, 15).map((k, i) => `${i + 1}. ${k.keyword} (搜索量: ${k.searchVolume || '-'}, 难度: ${k.difficulty || '-'})`).join('\n')}`
    : '';

  return `你是一位资深的 Amazon 跨境电商 Listing 优化专家。请根据以下商品信息和竞品数据，优化文案。

## 我的商品信息
- 标题: ${title}

${competitorSection}${keywordSection}

## 输出要求

请严格按以下结构输出 JSON:
{
  "optimizedTitle": "200字符以内的优化标题",
  "optimizedBulletPoints": ["五点1", "五点2", "五点3", "五点4", "五点5"],
  "optimizedLongDescription": "300-500字长描述",
  "seoKeywords": ["关键词1", "关键词2", ...],
  "competitorAnalysis": "竞品分析总结"
}

语气: 专业、可信、突出品质
只输出 JSON，不要其他文字`;
}

function parseOptimizeResponse(response: string): AiOptimizeResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        optimizedTitle: parsed.optimizedTitle || '',
        optimizedBulletPoints: parsed.optimizedBulletPoints || [],
        optimizedLongDescription: parsed.optimizedLongDescription || '',
        seoKeywords: parsed.seoKeywords || [],
        competitorAnalysis: parsed.competitorAnalysis || '',
        rawResponse: response,
      };
    }
  } catch {
    // fall through
  }

  return {
    optimizedTitle: response.split('\n')[0]?.slice(0, 200) || '',
    optimizedBulletPoints: [],
    optimizedLongDescription: response.slice(0, 1000),
    seoKeywords: [],
    competitorAnalysis: '',
    rawResponse: response,
  };
}

export async function runStep6(
  step1Data: GigaB2BCrawlResult,
  step4Data: AmazonProductResult,
  step5Data: XiyouzhaociResult,
  options: PipelineOptions,
): Promise<AiOptimizeResult> {
  info('Building optimization prompt...');

  const prompt = buildOptimizePrompt(step1Data.title, step4Data, step5Data);

  const service = new GeminiFileService();
  try {
    info('Sending to Gemini...');
    const result = await service.chat(prompt, {
      headless: options.headless,
      responseTimeout: 90000,
    });

    if (!result.success) {
      throw new StepError(6, 'AI Optimize', result.error || 'Gemini returned failure');
    }

    return parseOptimizeResponse(result.response);
  } finally {
    await service.close();
  }
}
