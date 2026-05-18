import { AmazonProductService } from '../src/services/amazon-product-service';
import type { AmazonSearchResult, AmazonProductResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

export async function runStep4(
  step3Data: AmazonSearchResult,
  options: PipelineOptions,
): Promise<AmazonProductResult> {
  const asin = step3Data.asins?.[0];
  if (!asin) {
    throw new StepError(4, 'Amazon Product', 'No ASINs from Step 3');
  }

  info(`Scraping ASIN: ${asin}`);

  const service = new AmazonProductService();
  try {
    const result = await service.scrape({ asin, headless: options.headless });
    return result as AmazonProductResult;
  } finally {
    await service.close();
  }
}
