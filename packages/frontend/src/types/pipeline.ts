// Pipeline 运行数据类型定义

export interface PipelineStepMeta {
  stepNum: number;
  stepName: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
}

export interface PipelineRunMetadata {
  runId: string;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  options: {
    mock: boolean;
    headless: boolean;
    skipTo: number;
    envPath: string;
  };
  steps: PipelineStepMeta[];
  passed: number;
  failed: number;
  skipped: number;
}

export interface PipelineRunSummary extends PipelineRunMetadata {
  productTitle?: string;
}
