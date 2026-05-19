export interface GigaB2BCrawlResult {
  title: string;
  price: string;
  description: string;
  images: string[];
  specifications: Record<string, string>;
  url: string;
  source: 'gigab2b-crawl' | 'mock-data';
}

export interface AiVisionResult {
  analyses: string[];
  searchKeywords: string[];
  templateUsed: string;
  model: string;
}

export interface AmazonSearchResult {
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}

export interface AmazonProductResult {
  asin: string;
  title: string;
  brand: string;
  price: string;
  rating: string;
  bulletPoints: string[];
  longDescription: string;
  images: string[];
  specifications: Record<string, string>;
  bestSellersRank: string[];
}

export interface XiyouzhaociResult {
  asin: string;
  keywords: Array<{
    rank: number;
    keyword: string;
    searchVolume: string | null;
    difficulty: string | null;
    trafficShare: string | null;
  }>;
  totalKeywords: number;
}

export interface AiOptimizeResult {
  optimizedTitle: string;
  optimizedBulletPoints: string[];
  optimizedLongDescription: string;
  seoKeywords: string[];
  competitorAnalysis: string;
  rawResponse: string;
}

export interface PipelineContext {
  step1?: GigaB2BCrawlResult;
  step2?: AiVisionResult;
  step3?: AmazonSearchResult;
  step4?: AmazonProductResult;
  step5?: XiyouzhaociResult;
  step6?: AiOptimizeResult;
}

export interface PipelineOptions {
  mock: boolean;
  realCrawlUrl?: string;
  headless: boolean;
  skipTo: number;
  envPath: string;
}

export class StepError extends Error {
  constructor(
    public readonly stepNum: number,
    public readonly stepName: string,
    message: string,
  ) {
    super(`Step ${stepNum} (${stepName}): ${message}`);
    this.name = 'StepError';
  }
}
