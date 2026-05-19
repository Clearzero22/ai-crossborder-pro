import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import type { PipelineContext, PipelineOptions, GigaB2BCrawlResult, AiVisionResult, AmazonSearchResult, AmazonProductResult, XiyouzhaociResult, AiOptimizeResult } from './lib/pipeline-types';
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
import {
  createRun,
  saveStepData,
  loadStepData,
  saveMetadata,
  generateRunId,
} from './lib/run-store';
import type { RunMetadata, StepRecord } from './lib/run-store';
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

const STEP_NAMES = ['', 'GigaB2B Crawl', 'AI Vision', 'Amazon Search', 'Amazon Product', 'Xiyouzhaoci', 'AI Optimize'] as const;

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

  const runId = generateRunId();
  createRun(runId);
  info(`Run ID: ${runId}`);

  const ctx: PipelineContext = {};
  const pipelineStart = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const stepRecords: StepRecord[] = [];

  const recordStep = (stepNum: number, status: 'success' | 'failed' | 'skipped', durationMs?: number, error?: string) => {
    stepRecords.push({ stepNum, stepName: STEP_NAMES[stepNum], status, durationMs, error });
  };

  // ─── Step 1: GigaB2B Crawl ────────────────────────────────
  if (options.skipTo <= 1) {
    stepStart(1, 'GigaB2B Crawl');
    saveStepData(runId, 1, options, 'input');
    try {
      const t = Date.now();
      ctx.step1 = await runStep1(options);
      saveStepData(runId, 1, ctx.step1, 'output');
      stepSuccess(1, 'GigaB2B Crawl', Date.now() - t);
      dataSnapshot('Step 1 → output', ctx.step1);
      recordStep(1, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(1, 'GigaB2B Crawl', err);
      recordStep(1, 'failed', Date.now() - (Date.now()), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    stepSkipped(1, 'GigaB2B Crawl', '--skip-to');
    recordStep(1, 'skipped');
    skipped++;
  }

  // ─── Step 2: AI Vision ────────────────────────────────────
  if (ctx.step1 && options.skipTo <= 2) {
    stepStart(2, 'AI Vision');
    saveStepData(runId, 2, { title: ctx.step1.title, images: ctx.step1.images }, 'input');
    try {
      const t = Date.now();
      ctx.step2 = await runStep2(ctx.step1, options);
      saveStepData(runId, 2, ctx.step2, 'output');
      stepSuccess(2, 'AI Vision', Date.now() - t);
      dataSnapshot('Step 2 → output', { analyses: ctx.step2.analyses, searchKeywords: ctx.step2.searchKeywords });
      recordStep(2, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(2, 'AI Vision', err);
      recordStep(2, 'failed', Date.now(), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    stepSkipped(2, 'AI Vision', !ctx.step1 ? 'no Step 1 data' : '--skip-to');
    recordStep(2, 'skipped');
    skipped++;
  }

  // ─── Step 3: Amazon Search ────────────────────────────────
  if (ctx.step1 && ctx.step2 && options.skipTo <= 3) {
    stepStart(3, 'Amazon Search');
    saveStepData(runId, 3, { searchKeywords: ctx.step2.searchKeywords, fallbackTitle: ctx.step1.title }, 'input');
    try {
      const t = Date.now();
      ctx.step3 = await runStep3(ctx.step1, ctx.step2, options);
      saveStepData(runId, 3, ctx.step3, 'output');
      stepSuccess(3, 'Amazon Search', Date.now() - t);
      dataSnapshot('Step 3 → output', ctx.step3);
      recordStep(3, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(3, 'Amazon Search', err);
      recordStep(3, 'failed', Date.now(), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    stepSkipped(3, 'Amazon Search', !ctx.step2 ? 'no Step 2 data' : '--skip-to');
    recordStep(3, 'skipped');
    skipped++;
  }

  // ─── Step 4: Amazon Product ───────────────────────────────
  if (ctx.step3 && options.skipTo <= 4) {
    stepStart(4, 'Amazon Product');
    saveStepData(runId, 4, { asins: ctx.step3.asins }, 'input');
    try {
      const t = Date.now();
      ctx.step4 = await runStep4(ctx.step3, options);
      saveStepData(runId, 4, ctx.step4, 'output');
      stepSuccess(4, 'Amazon Product', Date.now() - t);
      dataSnapshot('Step 4 → output', { asin: ctx.step4.asin, title: ctx.step4.title, brand: ctx.step4.brand, price: ctx.step4.price, rating: ctx.step4.rating, bulletPoints: ctx.step4.bulletPoints?.length || 0 });
      recordStep(4, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(4, 'Amazon Product', err);
      recordStep(4, 'failed', Date.now(), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    stepSkipped(4, 'Amazon Product', !ctx.step3 ? 'no Step 3 data' : '--skip-to');
    recordStep(4, 'skipped');
    skipped++;
  }

  // ─── Step 5: Xiyouzhaoci ──────────────────────────────────
  if (ctx.step4 && options.skipTo <= 5) {
    stepStart(5, 'Xiyouzhaoci');
    saveStepData(runId, 5, { asin: ctx.step4.asin }, 'input');
    try {
      const t = Date.now();
      ctx.step5 = await runStep5(ctx.step4, options);
      saveStepData(runId, 5, ctx.step5, 'output');
      stepSuccess(5, 'Xiyouzhaoci', Date.now() - t);
      dataSnapshot('Step 5 → output', { asin: ctx.step5.asin, totalKeywords: ctx.step5.totalKeywords, keywords: ctx.step5.keywords });
      recordStep(5, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(5, 'Xiyouzhaoci', err);
      recordStep(5, 'failed', Date.now(), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    stepSkipped(5, 'Xiyouzhaoci', !ctx.step4 ? 'no Step 4 data' : '--skip-to');
    recordStep(5, 'skipped');
    skipped++;
  }

  // ─── Step 6: AI Optimize ──────────────────────────────────
  if (ctx.step1 && ctx.step4 && ctx.step5 && options.skipTo <= 6) {
    stepStart(6, 'AI Optimize');
    saveStepData(runId, 6, { title: ctx.step1.title, step4Title: ctx.step4.title, keywordsCount: ctx.step5.keywords.length }, 'input');
    try {
      const t = Date.now();
      ctx.step6 = await runStep6(ctx.step1, ctx.step4, ctx.step5, options);
      saveStepData(runId, 6, ctx.step6, 'output');
      stepSuccess(6, 'AI Optimize', Date.now() - t);
      dataSnapshot('Step 6 → output', { optimizedTitle: ctx.step6.optimizedTitle, optimizedBulletPoints: ctx.step6.optimizedBulletPoints, seoKeywords: ctx.step6.seoKeywords, competitorAnalysis: ctx.step6.competitorAnalysis });
      recordStep(6, 'success', Date.now() - t);
      passed++;
    } catch (err) {
      stepError(6, 'AI Optimize', err);
      recordStep(6, 'failed', Date.now(), err instanceof Error ? err.message : String(err));
      failed++;
    }
  } else {
    const missing = [];
    if (!ctx.step1) missing.push('Step 1');
    if (!ctx.step4) missing.push('Step 4');
    if (!ctx.step5) missing.push('Step 5');
    stepSkipped(6, 'AI Optimize', missing.length > 0 ? `missing ${missing.join(', ')}` : '--skip-to');
    recordStep(6, 'skipped');
    skipped++;
  }

  // ─── Summary ──────────────────────────────────────────────
  summary(passed, failed, skipped, Date.now() - pipelineStart);

  // ─── Save metadata ────────────────────────────────────────
  const metadata: RunMetadata = {
    runId,
    startTime: new Date(pipelineStart).toISOString(),
    endTime: new Date().toISOString(),
    totalDurationMs: Date.now() - pipelineStart,
    options: { ...options },
    steps: stepRecords,
    passed,
    failed,
    skipped,
  };
  saveMetadata(runId, metadata);

  info(`Run saved to: runs/${runId}/`);
  info(`Files: metadata.json, step1-input.json, step1-output.json, ..., step6-output.json`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Pipeline crashed:', err);
  process.exit(2);
});
