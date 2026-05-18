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
  const templateId = 'product-analysis';
  const analyses: string[] = [];

  for (let i = 0; i < step1Data.images.length; i++) {
    const imageUrl = step1Data.images[i];
    info(`Analyzing image ${i + 1}/${step1Data.images.length}...`);
    try {
      const result = await service.recognize(imageUrl, templateId);
      analyses.push(result);
    } catch (err) {
      info(`  ⚠️ Image ${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
      analyses.push(`[Failed to analyze image ${i + 1}: ${err}]`);
    }
  }

  return {
    analyses,
    templateUsed: templateId,
    model: 'qwen3.6-flash',
  };
}
