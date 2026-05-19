import { AiVisionService } from '../src/services/ai-vision-service';
import type { GigaB2BCrawlResult, AiVisionResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

export async function runStep2(
  step1Data: GigaB2BCrawlResult,
  _options: PipelineOptions,
): Promise<AiVisionResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new StepError(2, 'AI Vision', 'DASHSCOPE_API_KEY not set in environment');
  }

  if (!step1Data.images || step1Data.images.length === 0) {
    throw new StepError(2, 'AI Vision', 'No images from Step 1 to analyze');
  }

  const service = new AiVisionService();
  const analyses: string[] = [];
  const allKeywords: string[] = [];

  // 产品深度分析 — 保留给 Step 6 用
  for (let i = 0; i < step1Data.images.length; i++) {
    const imageUrl = step1Data.images[i];
    info(`[${i + 1}/${step1Data.images.length}] Product analysis...`);
    try {
      const result = await service.recognize(imageUrl, 'product-analysis');
      analyses.push(result);
    } catch (err) {
      info(`  ⚠️ Image ${i + 1} analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      analyses.push(`[Failed to analyze image ${i + 1}: ${err}]`);
    }
  }

  // 提取搜索关键词 — 给 Step 3 用
  const keywordImage = step1Data.images[0];
  info('Extracting search keywords...');
  try {
    const kwResult = await service.recognize(keywordImage, 'extract-search-keywords');
    const keywords = kwResult
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    allKeywords.push(...keywords);
    info(`Extracted ${keywords.length} keywords: ${keywords.slice(0, 3).join(', ')}...`);
  } catch (err) {
    info(`  ⚠️ Keyword extraction failed, will fallback to title: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    analyses,
    searchKeywords: allKeywords,
    templateUsed: 'product-analysis + extract-search-keywords',
    model: 'qwen3.6-flash',
  };
}
