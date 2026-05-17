-- ============================================================
-- SQLite Schema — AI CrossBorder Pro
-- Auto-applied by SqliteDriver on first connect (user_version pragma)
-- ============================================================

-- ─── Runs ────────────────────────────────────────────────
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

-- ─── Raw ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raw_data (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES crawler_runs(run_id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  content    TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_raw_run_id ON raw_data(run_id);

-- ─── Staging ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staging_data (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id    TEXT NOT NULL REFERENCES crawler_runs(run_id) ON DELETE CASCADE,
  source    TEXT NOT NULL,
  data      TEXT NOT NULL,
  parsed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_staging_run_id ON staging_data(run_id);

-- ─── Clean ───────────────────────────────────────────────
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

-- ─── AI ──────────────────────────────────────────────────
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

-- ─── Workflow Executions ─────────────────────────────────
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

-- ─── Workflow Step Records ───────────────────────────────
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

-- ─── Workflow Logs ───────────────────────────────────────
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
