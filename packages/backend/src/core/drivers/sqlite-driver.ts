import BetterSqlite3 from 'better-sqlite3';
import type { IDatabaseDriver, QueryResult, DriverConfig } from './types';
import { translateSql } from './sql-helpers';
import * as fs from 'fs';
import * as path from 'path';

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS crawler_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id        TEXT UNIQUE NOT NULL,
  source        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','completed','failed','partial')),
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  items_scraped INT NOT NULL DEFAULT 0,
  errors        INT NOT NULL DEFAULT 0,
  error         TEXT,
  params        TEXT
);

CREATE TABLE IF NOT EXISTS raw_data (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES crawler_runs(run_id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  content    TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_raw_run_id ON raw_data(run_id);

CREATE TABLE IF NOT EXISTS staging_data (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id    TEXT NOT NULL REFERENCES crawler_runs(run_id) ON DELETE CASCADE,
  source    TEXT NOT NULL,
  data      TEXT NOT NULL,
  parsed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staging_run_id ON staging_data(run_id);

CREATE TABLE IF NOT EXISTS clean_products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id         TEXT NOT NULL REFERENCES crawler_runs(run_id) ON DELETE CASCADE,
  source         TEXT NOT NULL,
  url            TEXT,
  external_id    TEXT,
  title          TEXT,
  price          REAL,
  currency       TEXT,
  description    TEXT,
  images         TEXT,
  specifications TEXT,
  scraped_at     TEXT,
  ingested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_clean_source ON clean_products(source);
CREATE INDEX IF NOT EXISTS idx_clean_external_id ON clean_products(external_id);

CREATE TABLE IF NOT EXISTS ai_recognition_results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id         TEXT,
  node_id        TEXT NOT NULL,
  image_url      TEXT,
  template_id    TEXT,
  prompt         TEXT,
  result         TEXT NOT NULL,
  model          TEXT,
  status         TEXT NOT NULL DEFAULT 'success'
                 CHECK (status IN ('success','failed')),
  error          TEXT,
  recognized_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_results_run ON ai_recognition_results(run_id);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id    TEXT UNIQUE NOT NULL,
  template_id     TEXT,
  workflow_name   TEXT NOT NULL,
  status          TEXT DEFAULT 'running'
                  CHECK (status IN ('running','completed','failed','aborted')),
  total_steps     INT DEFAULT 0,
  success_steps   INT DEFAULT 0,
  error_steps     INT DEFAULT 0,
  duration_ms     INT,
  trigger         TEXT DEFAULT 'manual',
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_template ON workflow_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_executions_started ON workflow_executions(started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_step_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id    TEXT NOT NULL REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
  step_index      INT NOT NULL,
  node_id         TEXT NOT NULL,
  node_label      TEXT NOT NULL,
  node_type       TEXT NOT NULL DEFAULT 'step',
  status          TEXT DEFAULT 'running'
                  CHECK (status IN ('running','success','error')),
  input_data      TEXT,
  output_data     TEXT,
  config_data     TEXT,
  duration_ms     INT,
  error           TEXT,
  logs            TEXT,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_steps_execution ON workflow_step_records(execution_id);
CREATE INDEX IF NOT EXISTS idx_steps_node_id ON workflow_step_records(node_id);
CREATE INDEX IF NOT EXISTS idx_steps_status ON workflow_step_records(status);

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id    TEXT NOT NULL REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
  node_id         TEXT,
  node_label      TEXT,
  level           TEXT NOT NULL CHECK (level IN ('info','success','error')),
  message         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_execution ON workflow_execution_logs(execution_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// JSON columns that SQLite stores as TEXT but should be returned as parsed objects
const JSON_COLUMNS = new Set([
  'params', 'data', 'specifications', 'images',
  'input_data', 'output_data', 'config_data', 'logs',
]);

function parseJsonRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const parsed = { ...row };
    for (const col of Object.keys(parsed)) {
      if (JSON_COLUMNS.has(col) && typeof parsed[col] === 'string' && parsed[col].length > 0) {
        try {
          parsed[col] = JSON.parse(parsed[col] as string);
        } catch { /* keep as string if not valid JSON */ }
      }
    }
    return parsed;
  });
}

export class SqliteDriver implements IDatabaseDriver {
  readonly driverName = 'sqlite' as const;
  private db!: BetterSqlite3.Database;

  constructor(private config: DriverConfig) {}

  async connect(): Promise<void> {
    const dbPath = this.config.sqlitePath || 'data/crawler.db';
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    this.db = new BetterSqlite3(path.resolve(dbPath));

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version < 2) {
      this.db.exec(SQLITE_SCHEMA);
      this.db.pragma('user_version = 2');
    }
  }

  async disconnect(): Promise<void> {
    this.db.close();
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const translatedSql = translateSql(sql);
    const stmt = this.db.prepare(translatedSql);

    if (/^\s*SELECT\b/i.test(sql) || /RETURNING\b/i.test(sql)) {
      const rows = stmt.all(...params) as Record<string, unknown>[];
      return { rows: parseJsonRows(rows), rowCount: rows.length };
    }

    const info = stmt.run(...params);
    return { rows: [], rowCount: info.changes };
  }
}
