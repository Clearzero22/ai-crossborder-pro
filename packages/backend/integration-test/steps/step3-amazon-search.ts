import { AmazonSearchService } from '../src/services/amazon-search-service';
import type { GigaB2BCrawlResult, AmazonSearchResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

export async function runStep3(
  step1Data: GigaB2BCrawlResult,
  options: PipelineOptions,
): Promise<AmazonSearchResult> {
  const keyword = step1Data.title;
  if (!keyword) {
    throw new StepError(3, 'Amazon Search', 'No title from Step 1 to use as search keyword');
  }

  info(`Searching: "${keyword.slice(0, 80)}..."`);

  const service = new AmazonSearchService();
  try {
    const result = await service.search(keyword, 20, { headless: options.headless });
    return result as AmazonSearchResult;
  } finally {
    await service.close();
  }
}
