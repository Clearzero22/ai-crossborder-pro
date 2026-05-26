# ADR-002: Per-Request Database Connection (No Connection Pool)

## Status: Legacy — Should Be Changed

## Context

Every API handler in `api-server.ts` creates a new `DatabaseService` instance, calls `connect()`, executes queries, then calls `disconnect()` in a `finally` block. This pattern is repeated in ~25 route handlers. The `browserConfig` module is the only exception, using a singleton `_browserDb`.

## Decision (Historical)

The original implementation was built for a single-user local development environment where connection overhead was negligible. PostgreSQL support was added later with the same per-request pattern.

## Problems

1. **Performance:** Each request opens/closes a TCP connection (PostgreSQL) or file handle (SQLite)
2. **Resource waste:** Under load, rapid connect/disconnect creates unnecessary overhead
3. **SQLite contention:** better-sqlite3 is synchronous, so connection overhead is minimal, but the pattern is still wasteful
4. **PostgreSQL worst case:** Creating a TCP connection per request can add 5-50ms overhead per request

## Current Workaround

The `browserConfig` module uses a singleton pattern:
```typescript
let _browserDb: DatabaseService | null = null;
let _browserDbConnected = false;

async function ensureBrowserDb(): Promise<void> {
  if (_browserDbConnected && _browserDb) return;
  // ... create and connect once ...
}
```

## Recommended Fix

### Option A: Application-Level Singleton

```typescript
// At module level in api-server.ts
const db = createDb();
await db.connect();

// Use in all handlers:
app.get('/api/health', async (c) => {
  const stats = await db.getStats();
  return c.json({ stats });
});
```

**Pros:** Simplest change, immediate performance improvement
**Cons:** Must handle reconnection on disconnect

### Option B: Connection Pool (PostgreSQL) + Singleton (SQLite)

```typescript
// PostgreSQL: pg Pool
const pool = new Pool({ ...pgConfig });

// SQLite: singleton
const sqliteDb = new DatabaseService();
await sqliteDb.connect();

// Middleware injects appropriate driver
app.use('/api/*', async (c, next) => {
  c.set('db', pool || sqliteDb);
  await next();
});
```

**Pros:** Best performance for PostgreSQL, proper pool management
**Cons:** More complex, requires middleware or DI changes

### Estimated Effort: 2-4 hours

Priority: HIGH — impacts every API request's performance.
