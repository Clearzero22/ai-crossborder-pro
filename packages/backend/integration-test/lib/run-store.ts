import * as fs from 'fs';
import * as path from 'path';

export interface StepRecord {
  stepNum: number;
  stepName: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs?: number;
  error?: string;
  input?: unknown;
  output?: unknown;
}

export interface RunMetadata {
  runId: string;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  options: Record<string, unknown>;
  steps: StepRecord[];
  passed: number;
  failed: number;
  skipped: number;
}

const RUNS_DIR = path.resolve(__dirname, '..', 'runs');

function getRunDir(runId: string): string {
  return path.join(RUNS_DIR, runId);
}

export function createRun(runId: string): string {
  const dir = getRunDir(runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveStepData(runId: string, stepNum: number, data: unknown, type: 'input' | 'output'): void {
  const dir = getRunDir(runId);
  const file = path.join(dir, `step${stepNum}-${type}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadStepData<T>(runId: string, stepNum: number, type: 'input' | 'output'): T | null {
  const file = path.join(getRunDir(runId), `step${stepNum}-${type}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

export function saveMetadata(runId: string, metadata: RunMetadata): void {
  const file = path.join(getRunDir(runId), 'metadata.json');
  fs.writeFileSync(file, JSON.stringify(metadata, null, 2), 'utf-8');
}

export function loadMetadata(runId: string): RunMetadata | null {
  const file = path.join(getRunDir(runId), 'metadata.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as RunMetadata;
}

export function listRuns(): Array<{ runId: string; metadata: RunMetadata }> {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs.readdirSync(RUNS_DIR)
    .filter(name => fs.statSync(path.join(RUNS_DIR, name)).isDirectory())
    .map(runId => {
      const metadata = loadMetadata(runId);
      return { runId, metadata: metadata! };
    })
    .filter(r => r.metadata)
    .sort((a, b) => b.runId.localeCompare(a.runId));
}

export function generateRunId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function getRunsDir(): string {
  return RUNS_DIR;
}
