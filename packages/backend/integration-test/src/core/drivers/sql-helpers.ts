/**
 * Translate PostgreSQL SQL to SQLite-compatible SQL.
 * - $N parameters → ?
 * - $N::type casts → ?
 * - COUNT(*)::int → COUNT(*)
 * - NOW() → datetime('now')
 * - NUMERIC(x,y) → REAL
 */
export function translateSql(sql: string): string {
  return sql
    .replace(/\$(\d+)::\w+/gi, '?')
    .replace(/::int\b/gi, '')
    .replace(/\$(\d+)/g, '?')
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bNUMERIC\(\d+,\d+\)/gi, 'REAL');
}
