# Database Schema Reference

## Overview

- **Default driver:** SQLite (file: `~/.ai-crossborder-pro/data/crawler.db`)
- **Optional driver:** PostgreSQL (config via env vars)
- **SQLite schema:** Auto-created on connect via `user_version` pragma (version 2)
- **PostgreSQL schema:** Applied externally via `db/init/01-schema.sql` + `02-workflow-schema.sql`
- **No migration system:** Schema changes require manual `ALTER TABLE` or version bump

---

## Table Relationship Diagram

```
crawler_runs (parent)
  |-- raw_data.run_id           ON DELETE CASCADE
  |-- staging_data.run_id       ON DELETE CASCADE
  |-- clean_products.run_id     ON DELETE CASCADE

workflow_executions (parent)
  |-- workflow_step_records.execution_id    ON DELETE CASCADE
  |-- workflow_execution_logs.execution_id  ON DELETE CASCADE

settings (standalone key-value)
profiles (standalone browser profiles)
```

---

## Table: `crawler_runs`

Crawler execution tracking.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| run_id | TEXT | TEXT | UNIQUE NOT NULL |
| source | TEXT | TEXT | NOT NULL |
| status | TEXT | TEXT | NOT NULL DEFAULT 'running', CHECK IN ('running','completed','failed','partial') |
| started_at | TEXT | TIMESTAMPTZ | NOT NULL |
| completed_at | TEXT | TIMESTAMPTZ | nullable |
| items_scraped | INT | INT | NOT NULL DEFAULT 0 |
| errors | INT | INT | NOT NULL DEFAULT 0 |
| error | TEXT | TEXT | nullable |
| params | TEXT (JSON) | JSONB | nullable |

---

## Table: `raw_data`

Raw scraped HTML/API responses.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| run_id | TEXT | TEXT | NOT NULL, FK -> crawler_runs ON DELETE CASCADE |
| url | TEXT | TEXT | NOT NULL |
| content | TEXT | TEXT | NOT NULL |
| fetched_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |

**Index:** `idx_raw_run_id` on `run_id`

---

## Table: `staging_data`

Parsed but uncleaned intermediate data.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| run_id | TEXT | TEXT | NOT NULL, FK -> crawler_runs ON DELETE CASCADE |
| source | TEXT | TEXT | NOT NULL |
| data | TEXT (JSON) | JSONB | NOT NULL |
| parsed_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |

**Index:** `idx_staging_run_id` on `run_id`

---

## Table: `clean_products`

Normalized product data (ETL output).

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| run_id | TEXT | TEXT | NOT NULL, FK ON DELETE CASCADE |
| source | TEXT | TEXT | NOT NULL |
| url | TEXT | TEXT | nullable |
| external_id | TEXT | TEXT | nullable |
| title | TEXT | TEXT | nullable |
| price | REAL | NUMERIC(10,2) | nullable |
| currency | TEXT | TEXT | nullable |
| description | TEXT | TEXT | nullable |
| images | TEXT (JSON) | TEXT[] | nullable |
| specifications | TEXT (JSON) | JSONB | nullable |
| scraped_at | TEXT | TIMESTAMPTZ | nullable |
| ingested_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |

**Constraints:** UNIQUE(source, external_id)
**Indexes:** `idx_clean_source`, `idx_clean_external_id`

---

## Table: `ai_recognition_results`

AI vision recognition results.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| run_id | TEXT | TEXT | nullable |
| node_id | TEXT | TEXT | NOT NULL |
| image_url | TEXT | TEXT | nullable |
| template_id | TEXT | TEXT | nullable |
| prompt | TEXT | TEXT | nullable |
| result | TEXT | TEXT | NOT NULL |
| model | TEXT | TEXT | nullable |
| status | TEXT | TEXT | NOT NULL DEFAULT 'success', CHECK IN ('success','failed') |
| error | TEXT | TEXT | nullable |
| recognized_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |

**Index:** `idx_ai_results_run` on `run_id`

---

## Table: `workflow_executions`

Workflow run tracking.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| execution_id | TEXT | TEXT | UNIQUE NOT NULL |
| template_id | TEXT | TEXT | nullable |
| workflow_name | TEXT | TEXT | NOT NULL |
| status | TEXT | TEXT | DEFAULT 'running', CHECK IN ('running','completed','failed','aborted') |
| total_steps | INT | INT | DEFAULT 0 |
| success_steps | INT | INT | DEFAULT 0 |
| error_steps | INT | INT | DEFAULT 0 |
| duration_ms | INT | INT | nullable |
| trigger | TEXT | TEXT | DEFAULT 'manual' |
| started_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |
| completed_at | TEXT | TIMESTAMPTZ | nullable |

**Indexes:** `idx_executions_status`, `idx_executions_template`, `idx_executions_started (DESC)`

---

## Table: `workflow_step_records`

Individual node execution data.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| execution_id | TEXT | TEXT | NOT NULL, FK ON DELETE CASCADE |
| step_index | INT | INT | NOT NULL |
| node_id | TEXT | TEXT | NOT NULL |
| node_label | TEXT | TEXT | NOT NULL |
| node_type | TEXT | TEXT | NOT NULL DEFAULT 'step' |
| status | TEXT | TEXT | DEFAULT 'running', CHECK IN ('running','success','error') |
| input_data | TEXT (JSON) | JSONB | nullable |
| output_data | TEXT (JSON) | JSONB | nullable |
| config_data | TEXT (JSON) | JSONB | nullable |
| duration_ms | INT | INT | nullable |
| error | TEXT | TEXT | nullable |
| logs | TEXT (JSON) | JSONB | nullable |
| started_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |
| completed_at | TEXT | TIMESTAMPTZ | nullable |

**Indexes:** `idx_steps_execution`, `idx_steps_node_id`, `idx_steps_status`

---

## Table: `workflow_execution_logs`

Workflow event logs.

| Column | SQLite | PostgreSQL | Constraints |
|--------|--------|------------|-------------|
| id | INTEGER AUTOINCREMENT | SERIAL | PK |
| execution_id | TEXT | TEXT | NOT NULL, FK ON DELETE CASCADE |
| node_id | TEXT | TEXT | nullable |
| node_label | TEXT | TEXT | nullable |
| level | TEXT | TEXT | NOT NULL, CHECK IN ('info','success','error') |
| message | TEXT | TEXT | NOT NULL |
| created_at | TEXT | TIMESTAMPTZ | NOT NULL DEFAULT now |

**Index:** `idx_logs_execution` on `execution_id`

---

## Table: `settings` (SQLite only)

Key-value configuration store. Not in PG init scripts.

| Column | Type | Constraints |
|--------|------|-------------|
| key | TEXT | PRIMARY KEY |
| value | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL DEFAULT now |

---

## Table: `profiles` (SQLite only)

Browser profile configuration. Not in PG init scripts.

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL |
| path | TEXT | NOT NULL |
| created_at | TEXT | NOT NULL DEFAULT now |

---

## SQLite vs PostgreSQL Differences

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Primary keys | `INTEGER AUTOINCREMENT` | `SERIAL` |
| Timestamps | `TEXT` + `datetime('now')` | `TIMESTAMPTZ` + `NOW()` |
| JSON data | `TEXT` (serialized) | `JSONB` (native) |
| Arrays | `TEXT` (JSON) | `TEXT[]` (native) |
| Prices | `REAL` | `NUMERIC(10,2)` |
| SQL translation | `$N` -> `?`, `NOW()` -> `datetime('now')`, `::type` stripped | Native PG SQL |
| Schema init | Embedded in driver, auto via `user_version` | External `.sql` files |
| Missing tables | N/A | `settings`, `profiles` not in init scripts |
