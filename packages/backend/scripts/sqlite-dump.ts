/**
 * Export SQLite data to SQL file for cross-platform migration.
 *
 * Usage: DB_DRIVER=sqlite npx tsx scripts/sqlite-dump.ts
 * Output: data/crawler-dump.sql
 */

import BetterSqlite3 from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/crawler.db');
const OUTPUT_PATH = path.resolve(__dirname, '../data/crawler-dump.sql');

const TABLES = [
  'crawler_runs',
  'raw_data',
  'staging_data',
  'clean_products',
  'ai_recognition_results',
  'workflow_executions',
  'workflow_step_records',
  'workflow_execution_logs',
];

function escapeSql(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`SQLite database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new BetterSqlite3(DB_PATH, { readonly: true });

  const lines: string[] = [];
  lines.push('-- =====================================================');
  lines.push('-- AI CrossBorder Pro — SQLite Data Dump');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- Compatible with: SQLite (INSERT OR IGNORE) & PostgreSQL');
  lines.push('-- =====================================================');
  lines.push('');

  for (const table of TABLES) {
    const count = (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any).c;
    console.log(`Exporting ${table}: ${count} rows`);

    if (count === 0) {
      lines.push(`-- ${table}: 0 rows (skipped)`);
      lines.push('');
      continue;
    }

    lines.push(`-- ${table}: ${count} rows`);
    const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map(c => escapeSql(row[c]));
      lines.push(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')});`);
    }
    lines.push('');
  }

  db.close();

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');
  console.log(`\nExported to ${OUTPUT_PATH}`);
  console.log(`Total size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
}

main();
