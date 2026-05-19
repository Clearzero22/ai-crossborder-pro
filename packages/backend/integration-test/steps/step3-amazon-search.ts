import { AmazonSearchService } from '../src/services/amazon-search-service';
import type { GigaB2BCrawlResult, AiVisionResult, AmazonSearchResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

export async function runStep3(
  step1Data: GigaB2BCrawlResult,
  step2Data: AiVisionResult,
  options: PipelineOptions,
): Promise<AmazonSearchResult> {
  // 优先使用 Step 2 提取的关键词，回退到 Step 1 的 title
  const keyword = step2Data.searchKeywords?.[0] || step1Data.title;
  if (!keyword) {
    throw new StepError(3, 'Amazon Search', 'No keyword from Step 2 or title from Step 1');
  }

  const source = step2Data.searchKeywords?.[0] ? 'AI Vision keyword' : 'Step 1 title';
  info(`Searching (${source}): "${keyword.slice(0, 80)}..."`);

  const service = new AmazonSearchService();
  try {
    const result = await service.search(keyword, 20, { headless: options.headless });
    return result as AmazonSearchResult;
  } finally {
    await service.close();
  }
}
