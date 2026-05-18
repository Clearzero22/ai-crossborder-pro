import { CrawlerService } from '../src/services/crawler-service';
import type { GigaB2BCrawlResult, PipelineOptions } from '../lib/pipeline-types';
import { getMockProductData } from '../lib/mock-data';
import { info, stepError } from '../lib/logger';

export async function runStep1(
  options: PipelineOptions,
): Promise<GigaB2BCrawlResult> {
  if (options.mock) {
    info('[MOCK] Using predefined product data');
    return getMockProductData();
  }

  if (!options.realCrawlUrl) {
    info('[SKIP] No --real-crawl URL provided, using mock data');
    return getMockProductData();
  }

  const svc = new CrawlerService();
  const summary = await svc.runGigaB2B(options.realCrawlUrl, {
    saveFiles: true,
    headless: options.headless,
  });

  if (summary.status !== 'completed' || !summary.clean) {
    stepError(1, 'GigaB2B Crawl', `Run ${summary.runId} ended with status: ${summary.status}`);
    info('Falling back to mock data');
    return getMockProductData();
  }

  const clean = summary.clean;
  return {
    source: 'gigab2b-crawl',
    url: options.realCrawlUrl,
    title: clean.title || '',
    price: clean.price || '',
    description: clean.description || '',
    images: Array.isArray(clean.images) ? clean.images : [],
    specifications: (clean.specifications as Record<string, string>) || {},
  };
}
