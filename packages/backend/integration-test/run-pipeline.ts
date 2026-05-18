import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import type { PipelineContext, PipelineOptions } from './lib/pipeline-types';
import {
  header,
  stepStart,
  stepSuccess,
  stepError,
  stepSkipped,
  dataSnapshot,
  info,
  summary,
} from './lib/logger';
import { runStep1 } from './steps/step1-gigab2b-crawl';
import { runStep2 } from './steps/step2-ai-vision';
import { runStep3 } from './steps/step3-amazon-search';
import { runStep4 } from './steps/step4-amazon-product';
import { runStep5 } from './steps/step5-xiyouzhaoci';
import { runStep6 } from './steps/step6-ai-optimize';

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  const options: PipelineOptions = {
    mock: false,
    headless: false,
    skipTo: 0,
    envPath: path.resolve(__dirname, '..', '.env'),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mock') options.mock = true;
    else if (arg === '--headless') options.headless = true;
    else if (arg === '--real-crawl' && args[i + 1]) {
      options.mock = false;
      options.realCrawlUrl = args[++i];
    } else if (arg === '--skip-to' && args[i + 1]) {
      options.skipTo = parseInt(args[++i], 10);
    } else if (arg === '--env' && args[i + 1]) {
      options.envPath = args[++i];
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (fs.existsSync(options.envPath)) {
    dotenv.config({ path: options.envPath });
    info(`Loaded env from ${options.envPath}`);
  } else {
    dotenv.config();
  }

  header(options);

  if (!process.env.DASHSCOPE_API_KEY) {
    info('⚠️  DASHSCOPE_API_KEY not set — Step 2 (AI Vision) will fail');
  }

  const ctx: PipelineContext = {};
  const pipelineStart = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // ─── Step 1: GigaB2B Crawl ────────────────────────────────
  if (options.skipTo <= 1) {
    stepStart(1, 'GigaB2B Crawl');
    try {
      const t = Date.now();
      ctx.step1 = await runStep1(options);
      stepSuccess(1, 'GigaB2B Crawl', Date.now() - t);
      dataSnapshot('Step 1 output', { title: ctx.step1.title, images: ctx.step1.images.length, source: ctx.step1.source });
      passed++;
    } catch (err) {
      stepError(1, 'GigaB2B Crawl', err);
      failed++;
    }
  } else {
    stepSkipped(1, 'GigaB2B Crawl', '--skip-to');
    skipped++;
  }

  // ─── Step 2: AI Vision ────────────────────────────────────
  if (ctx.step1 && options.skipTo <= 2) {
    stepStart(2, 'AI Vision');
    try {
      const t = Date.now();
      ctx.step2 = await runStep2(ctx.step1, options);
      stepSuccess(2, 'AI Vision', Date.now() - t);
      dataSnapshot('Step 2 output', { analyses: ctx.step2.analyses.length, template: ctx.step2.templateUsed });
      passed++;
    } catch (err) {
      stepError(2, 'AI Vision', err);
      failed++;
    }
  } else {
    stepSkipped(2, 'AI Vision', !ctx.step1 ? 'no Step 1 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 3: Amazon Search ────────────────────────────────
  if (ctx.step1 && options.skipTo <= 3) {
    stepStart(3, 'Amazon Search');
    try {
      const t = Date.now();
      ctx.step3 = await runStep3(ctx.step1, options);
      stepSuccess(3, 'Amazon Search', Date.now() - t);
      dataSnapshot('Step 3 output', { keyword: ctx.step3.keyword, asins: ctx.step3.asins.length, total: ctx.step3.total });
      passed++;
    } catch (err) {
      stepError(3, 'Amazon Search', err);
      failed++;
    }
  } else {
    stepSkipped(3, 'Amazon Search', !ctx.step1 ? 'no Step 1 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 4: Amazon Product ───────────────────────────────
  if (ctx.step3 && options.skipTo <= 4) {
    stepStart(4, 'Amazon Product');
    try {
      const t = Date.now();
      ctx.step4 = await runStep4(ctx.step3, options);
      stepSuccess(4, 'Amazon Product', Date.now() - t);
      dataSnapshot('Step 4 output', { asin: ctx.step4.asin, title: ctx.step4.title?.slice(0, 60), brand: ctx.step4.brand });
      passed++;
    } catch (err) {
      stepError(4, 'Amazon Product', err);
      failed++;
    }
  } else {
    stepSkipped(4, 'Amazon Product', !ctx.step3 ? 'no Step 3 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 5: Xiyouzhaoci ──────────────────────────────────
  if (ctx.step4 && options.skipTo <= 5) {
    stepStart(5, 'Xiyouzhaoci');
    try {
      const t = Date.now();
      ctx.step5 = await runStep5(ctx.step4, options);
      stepSuccess(5, 'Xiyouzhaoci', Date.now() - t);
      dataSnapshot('Step 5 output', { asin: ctx.step5.asin, totalKeywords: ctx.step5.totalKeywords });
      passed++;
    } catch (err) {
      stepError(5, 'Xiyouzhaoci', err);
      failed++;
    }
  } else {
    stepSkipped(5, 'Xiyouzhaoci', !ctx.step4 ? 'no Step 4 data' : '--skip-to');
    skipped++;
  }

  // ─── Step 6: AI Optimize ──────────────────────────────────
  if (ctx.step1 && ctx.step4 && ctx.step5 && options.skipTo <= 6) {
    stepStart(6, 'AI Optimize');
    try {
      const t = Date.now();
      ctx.step6 = await runStep6(ctx.step1, ctx.step4, ctx.step5, options);
      stepSuccess(6, 'AI Optimize', Date.now() - t);
      dataSnapshot('Step 6 output', { optimizedTitle: ctx.step6.optimizedTitle?.slice(0, 80), seoKeywords: ctx.step6.seoKeywords.length });
      passed++;
    } catch (err) {
      stepError(6, 'AI Optimize', err);
      failed++;
    }
  } else {
    const missing = [];
    if (!ctx.step1) missing.push('Step 1');
    if (!ctx.step4) missing.push('Step 4');
    if (!ctx.step5) missing.push('Step 5');
    stepSkipped(6, 'AI Optimize', missing.length > 0 ? `missing ${missing.join(', ')}` : '--skip-to');
    skipped++;
  }

  // ─── Summary ──────────────────────────────────────────────
  summary(passed, failed, skipped, Date.now() - pipelineStart);

  // ─── Save results ─────────────────────────────────────────
  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const resultFile = path.join(outputDir, `pipeline-result-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(ctx, null, 2), 'utf-8');
  info(`Result saved to: ${resultFile}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Pipeline crashed:', err);
  process.exit(2);
});
