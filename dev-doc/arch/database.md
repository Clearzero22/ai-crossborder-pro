# Database Architecture

## Driver Abstraction

```
DatabaseService (high-level API)
  └── IDatabaseDriver (interface)
        ├── SqliteDriver (better-sqlite3)
        └── PostgresDriver (pg)
              └── sql-helpers.ts (PG → SQLite translation)
```

### IDatabaseDriver Interface

```typescript
interface IDatabaseDriver {
  driverName: 'postgres' | 'sqlite';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
}
```

## SQLite Driver

- Uses `better-sqlite3` (synchronous, fast)
- Schema auto-created on connect via `PRAGMA user_version`
- Current version: 2 (entire schema re-applied idempotently)
- Default path: `~/.ai-crossborder-pro/data/crawler.db`
- WAL journal mode for concurrent read performance

### SQL Translation (`sql-helpers.ts`)

The DatabaseService writes PostgreSQL-style SQL. The SQLite driver translates it at runtime:

| PostgreSQL | SQLite |
|------------|--------|
| `$1, $2, $3` | `?, ?, ?` |
| `$7::jsonb` | `?` (cast stripped) |
| `COUNT(*)::int` | `COUNT(*)` (cast stripped) |
| `::timestamptz` | (removed) |
| `NOW()` | `datetime('now')` |
| `NUMERIC(10,2)` | `REAL` |
| `INTERVAL '30 days'` | Precomputed date string |
| `FILTER (WHERE ...)` | `SUM(CASE WHEN ... END)` |
| `$N` in ORDER BY | Static replacement |

### Known Translation Issues

1. **`$N` in ORDER BY** — `ORDER BY $1` not properly translated for dynamic column ordering
2. **JSONB operations** — `@>` and `?` JSONB operators not supported in SQLite
3. **Array operations** — `ANY()` and array literals not translated
4. **Window functions** — Not translated (not currently used)
5. **`INSERT ... ON CONFLICT ... DO UPDATE SET col = EXCLUDED.col`** — Requires SQLite 3.24+

## PostgreSQL Driver

- Uses `pg` (async, connection pool)
- Schema applied externally via `db/init/*.sql` files
- No embedded schema — assumes tables already exist
- Default config: `localhost:5432/crawler_db` (user: `crawler`, pass: `crawler_pass`)

### Missing PG Init Tables

The PG init scripts (`01-schema.sql`, `02-workflow-schema.sql`) do NOT include:
- `settings` table (used by `apiKeyConfig`)
- `profiles` table (used by `browserConfig`)

These must be created manually for PostgreSQL mode.

## Connection Pattern (Current)

Every API handler creates and destroys its own `DatabaseService`:

```typescript
const db = createDb();        // new DatabaseService()
try {
  await db.connect();          // Open connection
  // ... do work ...
} finally {
  await db.disconnect();       // Close connection
}
```

**Problems:**
- No connection pooling (PostgreSQL creates new TCP connection per request)
- SQLite creates/opens file handle per request
- ~25+ routes × create/destroy pattern = high overhead
- Exception: `browserConfig` uses a singleton `_browserDb`

## Data Flow

### Crawler ETL
```
URL → Playwright page load
     → Raw HTML → raw_data table
     → Selector extraction → staging_data table (JSON)
     → Clean/normalize → clean_products table (ProductRecord)
```

### Workflow Execution
```
WorkflowEngine.execute()
  → POST /api/workflow/executions  (create record)
  → For each step:
    → POST /api/workflow/steps     (save step input/output)
    → POST /api/workflow/logs      (save logs)
  → PUT /api/workflow/executions/:id/complete  (finalize)
```

### Settings/Config
```
API Key → settings table
  key: 'ai_key_{provider}'    → AES-256-GCM encrypted value
  key: 'ai_baseurl_{provider}' → plaintext value

Browser Config → settings table + profiles table
```

## Schema Evolution

No migration framework. Changes require:
1. Bump `user_version` in `sqlite-driver.ts`
2. Add new `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE` block
3. For PostgreSQL: manually add to init scripts
