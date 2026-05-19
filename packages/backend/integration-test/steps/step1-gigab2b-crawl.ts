import { CrawlerService } from '../src/services/crawler-service';
import type { GigaB2BCrawlResult, PipelineOptions } from '../lib/pipeline-types';
import { getMockProductData } from '../lib/mock-data';
import { info, stepError } from '../lib/logger';

const DEFAULT_CRAWL_URL = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';

export async function runStep1(
  options: PipelineOptions,
): Promise<GigaB2BCrawlResult> {
  if (options.mock) {
    info('[MOCK] Using predefined product data');
    return getMockProductData();
  }

  const crawlUrl = options.realCrawlUrl || DEFAULT_CRAWL_URL;
  info(`Crawling: ${crawlUrl}`);

  const svc = new CrawlerService();
  const summary = await svc.runGigaB2B(crawlUrl, {
    saveFiles: true,
    headless: options.headless,
  });

  if (summary.status !== 'completed' || !summary.clean) {
    stepError(1, 'GigaB2B Crawl', `Run ${summary.runId} ended with status: ${summary.status}`);
    info('Falling back to mock data');
    return getMockProductData();
  }

  const clean = summary.clean;
  const allImages = Array.isArray(clean.images) ? clean.images : [];
  // 过滤掉 banner 设计图，只保留商品主图
  const productImages = allImages.filter((img: string) => !img.includes('bannerDesign'));
  // 最多取 2 张图片用于 AI 识图
  const images = productImages.slice(0, 2);

  info(`Total images: ${allImages.length}, product images (non-banner): ${productImages.length}, using: ${images.length}`);

  return {
    source: 'gigab2b-crawl',
    url: crawlUrl,
    title: clean.title || '',
    price: clean.price || '',
    description: clean.description || '',
    images,
    specifications: (clean.specifications as Record<string, string>) || {},
  };
}
