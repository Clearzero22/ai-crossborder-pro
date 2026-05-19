/**
 * Pipeline Data API — 读取 integration-test runs/ 目录下的 JSON 文件
 *
 * GET /api/pipeline/runs                              — 运行列表
 * GET /api/pipeline/runs/:runId                       — 单次运行元数据
 * GET /api/pipeline/runs/:runId/steps/:stepNum/input  — 步骤输入数据
 * GET /api/pipeline/runs/:runId/steps/:stepNum/output — 步骤输出数据
 */

import * as fs from 'fs';
import * as path from 'path';
import { Hono } from 'hono';

// 路径: packages/backend/src/routes/ → packages/backend/integration-test/runs/
const RUNS_DIR = path.resolve(__dirname, '..', '..', 'integration-test', 'runs');

const pipeline = new Hono();

// ─── GET /api/pipeline/runs ─────────────────────────────────────

pipeline.get('/runs', async (c) => {
  try {
    if (!fs.existsSync(RUNS_DIR)) {
      return c.json({ runs: [] });
    }

    const dirs = fs.readdirSync(RUNS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse();

    const runs = [];
    for (const runId of dirs) {
      const metaPath = path.join(RUNS_DIR, runId, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

        // 尝试从 step1-output 提取商品标题
        let productTitle: string | undefined;
        try {
          const step1 = JSON.parse(
            fs.readFileSync(path.join(RUNS_DIR, runId, 'step1-output.json'), 'utf-8')
          );
          if (step1.title) productTitle = step1.title;
        } catch { /* step1-output 不存在则跳过 */ }

        runs.push({ ...meta, productTitle });
      } catch {
        // metadata.json 解析失败则跳过
      }
    }

    return c.json({ runs });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ─── GET /api/pipeline/runs/:runId ──────────────────────────────

pipeline.get('/runs/:runId', async (c) => {
  const { runId } = c.req.param();
  const metaPath = path.join(RUNS_DIR, runId, 'metadata.json');

  if (!fs.existsSync(metaPath)) {
    return c.json({ error: `Run ${runId} not found` }, 404);
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return c.json(meta);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ─── GET /api/pipeline/runs/:runId/steps/:stepNum/:type ────────

pipeline.get('/runs/:runId/steps/:stepNum/:type', async (c) => {
  const { runId, stepNum, type } = c.req.param();

  if (type !== 'input' && type !== 'output') {
    return c.json({ error: 'Type must be "input" or "output"' }, 400);
  }

  const filePath = path.join(RUNS_DIR, runId, `step${stepNum}-${type}.json`);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: `File step${stepNum}-${type}.json not found for run ${runId}` }, 404);
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return c.json(data);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export const pipelineDataRoutes = pipeline;
