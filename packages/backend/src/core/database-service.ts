import { createDatabaseDriver, type IDatabaseDriver } from './drivers';
import type { DriverConfig } from './drivers/types';
import { CrawlerRun, ProductRecord } from './types';

const DEFAULT_PG_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crawler_db',
  user: process.env.DB_USER || 'crawler',
  password: process.env.DB_PASS || 'crawler_pass',
};

export class DatabaseService {
  private driver: IDatabaseDriver;

  constructor(pgConfig?: Record<string, unknown>) {
    const driverType = (process.env.DB_DRIVER || 'sqlite') as 'postgres' | 'sqlite';
    this.driver = createDatabaseDriver(driverType, {
      pgConfig: pgConfig || DEFAULT_PG_CONFIG,
      sqlitePath: process.env.DB_PATH || 'data/crawler.db',
    });
  }

  get driverName(): 'postgres' | 'sqlite' {
    return this.driver.driverName;
  }

  async connect(): Promise<void> {
    await this.driver.connect();
  }

  async disconnect(): Promise<void> {
    await this.driver.disconnect();
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await this.query(
      "SELECT value FROM settings WHERE key = $1",
      [key],
    );
    return result.rows.length > 0 ? (result.rows[0].value as string) : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = datetime('now')",
      [key, value],
    );
  }

  async query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    return this.driver.query(sql, params);
  }

  // ─── Runs ─────────────────────────────────────────────────

  async insertRun(run: CrawlerRun): Promise<void> {
    await this.driver.query(
      `INSERT INTO crawler_runs (run_id, source, status, started_at, items_scraped, errors, params)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (run_id) DO UPDATE SET
         status = EXCLUDED.status,
         completed_at = $8::timestamptz,
         items_scraped = EXCLUDED.items_scraped,
         errors = EXCLUDED.errors,
         error = $9`,
      [
        run.runId, run.source, run.status, run.startedAt,
        run.itemsScraped, run.errors, JSON.stringify(run.params),
        run.completedAt || null, run.error || null,
      ]
    );
  }

  async updateRun(run: CrawlerRun): Promise<void> {
    await this.driver.query(
      `UPDATE crawler_runs
       SET status = $2, completed_at = $3, items_scraped = $4, errors = $5, error = $6
       WHERE run_id = $1`,
      [run.runId, run.status, run.completedAt || null, run.itemsScraped, run.errors, run.error || null]
    );
  }

  async listRuns(limit: number = 20): Promise<CrawlerRun[]> {
    const result = await this.driver.query(
      'SELECT * FROM crawler_runs ORDER BY started_at DESC LIMIT $1',
      [limit]
    );
    return result.rows.map(r => this._mapRun(r));
  }

  async getRun(runId: string): Promise<CrawlerRun | null> {
    const result = await this.driver.query('SELECT * FROM crawler_runs WHERE run_id = $1', [runId]);
    return result.rows.length ? this._mapRun(result.rows[0]) : null;
  }

  // ─── Raw ─────────────────────────────────────────────────

  async insertRaw(runId: string, url: string, content: string): Promise<number> {
    const result = await this.driver.query(
      'INSERT INTO raw_data (run_id, url, content) VALUES ($1, $2, $3) RETURNING id',
      [runId, url, content]
    );
    return Number(result.rows[0].id);
  }

  async getRawByRun(runId: string) {
    const result = await this.driver.query(
      'SELECT * FROM raw_data WHERE run_id = $1 ORDER BY fetched_at',
      [runId]
    );
    return result.rows;
  }

  // ─── Staging ──────────────────────────────────────────────

  async insertStaging(runId: string, source: string, data: unknown): Promise<number> {
    const result = await this.driver.query(
      'INSERT INTO staging_data (run_id, source, data) VALUES ($1, $2, $3::jsonb) RETURNING id',
      [runId, source, JSON.stringify(data)]
    );
    return Number(result.rows[0].id);
  }

  async getStagingByRun(runId: string) {
    const result = await this.driver.query(
      'SELECT * FROM staging_data WHERE run_id = $1 ORDER BY parsed_at',
      [runId]
    );
    return result.rows;
  }

  // ─── Clean ────────────────────────────────────────────────

  async upsertProduct(record: ProductRecord): Promise<number> {
    const images = this.driverName === 'sqlite'
      ? JSON.stringify(record.images)
      : record.images as unknown;

    const result = await this.driver.query(
      `INSERT INTO clean_products (run_id, source, url, external_id, title, price, currency, description, images, specifications, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       ON CONFLICT (source, external_id) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         url = EXCLUDED.url,
         title = EXCLUDED.title,
         price = EXCLUDED.price,
         currency = EXCLUDED.currency,
         description = EXCLUDED.description,
         images = EXCLUDED.images,
         specifications = EXCLUDED.specifications,
         scraped_at = EXCLUDED.scraped_at
       RETURNING id`,
      [
        record.runId, record.source, record.url, record.externalId,
        record.title, record.price || null, record.currency || null,
        record.description || null, images,
        JSON.stringify(record.specifications), record.scrapedAt,
      ]
    );
    return Number(result.rows[0].id);
  }

  async getProducts(source?: string, limit: number = 20): Promise<ProductRecord[]> {
    let query = 'SELECT * FROM clean_products';
    const params: unknown[] = [];
    if (source) {
      query += ' WHERE source = $1';
      params.push(source);
    }
    query += ' ORDER BY ingested_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const result = await this.driver.query(query, params);
    return result.rows.map(r => this._mapProduct(r));
  }

  async getProductsByRun(runId: string): Promise<ProductRecord[]> {
    const result = await this.driver.query(
      'SELECT * FROM clean_products WHERE run_id = $1 ORDER BY ingested_at DESC',
      [runId],
    );
    return result.rows.map(r => this._mapProduct(r));
  }

  async getStats(): Promise<{ runs: number; products: number; aiResults: number }> {
    const [runs, products, aiResults] = await Promise.all([
      this.driver.query('SELECT COUNT(*)::int as count FROM crawler_runs'),
      this.driver.query('SELECT COUNT(*)::int as count FROM clean_products'),
      this.driver.query('SELECT COUNT(*)::int as count FROM ai_recognition_results'),
    ]);
    return {
      runs: Number(runs.rows[0].count),
      products: Number(products.rows[0].count),
      aiResults: Number(aiResults.rows[0].count),
    };
  }

  // ─── AI Recognition Results ───────────────────────────────

  async insertAiResult(params: {
    runId?: string;
    nodeId: string;
    imageUrl?: string;
    templateId?: string;
    prompt?: string;
    result: string;
    model?: string;
    status?: 'success' | 'failed';
    error?: string;
  }): Promise<number> {
    const res = await this.driver.query(
      `INSERT INTO ai_recognition_results (run_id, node_id, image_url, template_id, prompt, result, model, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        params.runId || null, params.nodeId, params.imageUrl || null,
        params.templateId || null, params.prompt || null, params.result,
        params.model || null, params.status || 'success', params.error || null,
      ],
    );
    return Number(res.rows[0].id);
  }

  async getAiResults(runId?: string, limit = 50): Promise<any[]> {
    if (runId) {
      const res = await this.driver.query(
        `SELECT id, run_id, node_id, image_url, template_id, prompt, result, model, status, error, recognized_at
         FROM ai_recognition_results WHERE run_id = $1 ORDER BY id LIMIT $2`,
        [runId, limit],
      );
      return res.rows;
    }
    const res = await this.driver.query(
      `SELECT id, run_id, node_id, image_url, template_id, prompt, result, model, status, error, recognized_at
       FROM ai_recognition_results ORDER BY id DESC LIMIT $1`,
      [limit],
    );
    return res.rows;
  }

  // ─── Workflow Execution Methods ───────────────────────────

  async insertWorkflowExecution(params: {
    executionId: string;
    templateId: string | null;
    workflowName: string;
    trigger: string;
  }): Promise<void> {
    await this.driver.query(
      `INSERT INTO workflow_executions (execution_id, template_id, workflow_name, trigger)
       VALUES ($1, $2, $3, $4)`,
      [params.executionId, params.templateId, params.workflowName, params.trigger]
    );
  }

  async listWorkflowExecutions(params: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<Record<string, unknown>[]> {
    if (params.status) {
      const result = await this.driver.query(
        `SELECT * FROM workflow_executions WHERE status = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
        [params.status, params.limit, params.offset]
      );
      return result.rows;
    }
    const result = await this.driver.query(
      `SELECT * FROM workflow_executions ORDER BY started_at DESC LIMIT $1 OFFSET $2`,
      [params.limit, params.offset]
    );
    return result.rows;
  }

  async getWorkflowExecution(executionId: string): Promise<{
    execution: Record<string, unknown> | null;
    steps: Record<string, unknown>[];
    logs: Record<string, unknown>[];
  }> {
    const execResult = await this.driver.query(
      `SELECT * FROM workflow_executions WHERE execution_id = $1`, [executionId]
    );
    const execution = execResult.rows[0] || null;
    if (!execution) return { execution: null, steps: [], logs: [] };

    const [stepsResult, logsResult] = await Promise.all([
      this.driver.query(
        `SELECT * FROM workflow_step_records WHERE execution_id = $1 ORDER BY step_index`,
        [executionId]
      ),
      this.driver.query(
        `SELECT * FROM workflow_execution_logs WHERE execution_id = $1 ORDER BY created_at`,
        [executionId]
      ),
    ]);
    return { execution, steps: stepsResult.rows, logs: logsResult.rows };
  }

  async completeWorkflowExecution(params: {
    executionId: string;
    status: string;
    durationMs: number | null;
  }): Promise<void> {
    const [{ rows: totalRows }, { rows: successRows }, { rows: errorRows }] = await Promise.all([
      this.driver.query(`SELECT COUNT(*) as count FROM workflow_step_records WHERE execution_id = $1`, [params.executionId]),
      this.driver.query(`SELECT COUNT(*) as count FROM workflow_step_records WHERE execution_id = $1 AND status = 'success'`, [params.executionId]),
      this.driver.query(`SELECT COUNT(*) as count FROM workflow_step_records WHERE execution_id = $1 AND status = 'error'`, [params.executionId]),
    ]);

    await this.driver.query(
      `UPDATE workflow_executions SET status = $1, duration_ms = $2, total_steps = $3, success_steps = $4, error_steps = $5, completed_at = NOW() WHERE execution_id = $6`,
      [params.status, params.durationMs, Number(totalRows[0].count), Number(successRows[0].count), Number(errorRows[0].count), params.executionId]
    );
  }

  async insertWorkflowStep(params: {
    executionId: string;
    stepIndex: number;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: string;
    inputData: unknown;
    outputData: unknown;
    configData: unknown;
    durationMs: number | null;
    error: string | null;
    logs: unknown;
  }): Promise<void> {
    await this.driver.query(
      `INSERT INTO workflow_step_records (execution_id, step_index, node_id, node_label, node_type, status, input_data, output_data, config_data, duration_ms, error, logs, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb, NOW())`,
      [
        params.executionId, params.stepIndex, params.nodeId, params.nodeLabel,
        params.nodeType, params.status,
        JSON.stringify(params.inputData || {}), JSON.stringify(params.outputData || {}),
        JSON.stringify(params.configData || {}),
        params.durationMs, params.error,
        JSON.stringify(params.logs || []),
      ]
    );
  }

  async getStepHistory(nodeId: string, limit: number): Promise<Record<string, unknown>[]> {
    const result = await this.driver.query(
      `SELECT ws.*, we.workflow_name, we.started_at as exec_started_at
       FROM workflow_step_records ws
       JOIN workflow_executions we ON ws.execution_id = we.execution_id
       WHERE ws.node_id = $1
       ORDER BY ws.id DESC LIMIT $2`,
      [nodeId, limit]
    );
    return result.rows;
  }

  async insertWorkflowLogs(executionId: string, logs: Array<{
    node_id?: string;
    node_label?: string;
    level: string;
    message: string;
  }>): Promise<number> {
    for (const log of logs) {
      await this.driver.query(
        `INSERT INTO workflow_execution_logs (execution_id, node_id, node_label, level, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [executionId, log.node_id || null, log.node_label || null, log.level || 'info', log.message || '']
      );
    }
    return logs.length;
  }

  async getWorkflowStats(): Promise<{
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    activeNodes: number;
    nodeStats: Record<string, unknown>[];
    trend: Record<string, unknown>[];
  }> {
    const [
      totalRes, successRes, avgRes, nodesRes
    ] = await Promise.all([
      this.driver.query(`SELECT COUNT(*) as count FROM workflow_executions`),
      this.driver.query(`SELECT COUNT(*) as count FROM workflow_executions WHERE status = 'completed'`),
      this.driver.query(`SELECT ROUND(AVG(duration_ms)) as avg FROM workflow_executions WHERE status = 'completed'`),
      this.driver.query(`SELECT COUNT(DISTINCT node_id) as count FROM workflow_step_records`),
    ]);

    const totalExecs = Number(totalRes.rows[0].count);
    const successExecs = Number(successRes.rows[0].count);

    // FILTER (WHERE ...) is PG-specific, use SUM(CASE WHEN ...) for SQLite
    const nodeStatsSql = this.driverName === 'postgres'
      ? `SELECT node_id, node_label, COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'success') as success, ROUND(AVG(duration_ms)) as avg_ms
         FROM workflow_step_records GROUP BY node_id, node_label ORDER BY total DESC`
      : `SELECT node_id, node_label, COUNT(*) as total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success, ROUND(AVG(duration_ms)) as avg_ms
         FROM workflow_step_records GROUP BY node_id, node_label ORDER BY total DESC`;
    const nodeStats = (await this.driver.query(nodeStatsSql)).rows;

    // INTERVAL '30 days' is PG-specific, use JS precomputed date for SQLite
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const trendSql = this.driverName === 'postgres'
      ? `SELECT DATE(started_at) as date, COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as success, COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM workflow_executions WHERE started_at > NOW() - INTERVAL '30 days' GROUP BY DATE(started_at) ORDER BY date DESC`
      : `SELECT DATE(started_at) as date, COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM workflow_executions WHERE started_at > ? GROUP BY DATE(started_at) ORDER BY date DESC`;
    const trendParams = this.driverName === 'postgres' ? [] : [thirtyDaysAgo];
    const trend = (await this.driver.query(trendSql, trendParams)).rows;

    return {
      totalExecutions: totalExecs,
      successRate: totalExecs > 0 ? Math.round(successExecs / totalExecs * 100) : 0,
      avgDurationMs: Number(avgRes.rows[0].avg) || 0,
      activeNodes: Number(nodesRes.rows[0].count),
      nodeStats,
      trend,
    };
  }

  // ─── Mappers ──────────────────────────────────────────────

  private _mapRun(row: Record<string, unknown>): CrawlerRun {
    return {
      runId: row.run_id as string,
      source: row.source as string,
      status: row.status as CrawlerRun['status'],
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || undefined,
      itemsScraped: Number(row.items_scraped),
      errors: Number(row.errors),
      error: (row.error as string) || undefined,
      params: typeof row.params === 'string' ? JSON.parse(row.params) : (row.params || {}),
    };
  }

  private _mapProduct(row: Record<string, unknown>): ProductRecord {
    let images = row.images || [];
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
    let specs = row.specifications || {};
    if (typeof specs === 'string') {
      specs = JSON.parse(specs);
    }
    return {
      source: row.source as string,
      runId: row.run_id as string,
      url: row.url as string,
      externalId: row.external_id as string,
      title: (row.title as string) || '',
      price: row.price != null ? String(row.price) : undefined,
      currency: (row.currency as string) || undefined,
      description: (row.description as string) || undefined,
      images: images as string[],
      specifications: specs as Record<string, string>,
      scrapedAt: row.scraped_at as string,
    };
  }
}
