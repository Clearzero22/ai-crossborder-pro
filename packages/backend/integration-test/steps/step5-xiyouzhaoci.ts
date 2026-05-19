import { scrapeXiyouzhaociKeywords } from '../src/services/xiyouzhaociService';
import type { AmazonProductResult, XiyouzhaociResult, PipelineOptions } from '../lib/pipeline-types';
import { StepError } from '../lib/pipeline-types';
import { info } from '../lib/logger';

export async function runStep5(
  step4Data: AmazonProductResult,
  options: PipelineOptions,
): Promise<XiyouzhaociResult> {
  const asin = step4Data.asin;
  if (!asin) {
    throw new StepError(5, 'Xiyouzhaoci', 'No ASIN from Step 4');
  }

  info(`Fetching keywords for ASIN: ${asin}`);

  const result = await scrapeXiyouzhaociKeywords(asin, {
    headless: options.headless,
    maxKeywords: 50,
    saveCsv: false,
  });

  return {
    asin: result.asin,
    totalKeywords: result.totalKeywords,
    keywords: result.keywords.map((kw) => ({
      rank: kw.rank,
      keyword: kw.keyword,
      searchVolume: kw.searchVolume,
      difficulty: kw.difficulty,
      trafficShare: kw.trafficShare,
    })),
  };
}
