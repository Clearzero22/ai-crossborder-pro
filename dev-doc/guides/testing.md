# Testing Guide

## Current State

The project does **not** have a proper test framework. Testing is done via standalone scripts that make real API calls.

## Existing Test Scripts

All in `packages/backend/`:

| Script | What It Tests |
|--------|--------------|
| `npm run test:gigab2b` | GigaB2B crawler |
| `npm run test:amazon` | Amazon search |
| `npm run test:amazon-product` | Amazon product scrape |
| `npm run test:gemini` | Gemini file upload |
| `npm run test:chatgpt` | ChatGPT file upload |
| `npm run test:gemini:simple` | Basic Gemini test |
| `npm run test:xiyouzhaoci` | Keyword mining |
| `npm run test:doubao` | Doubao AI |
| `npm run test:bilibili` | Bilibili scraping |
| `npm run test:taobao` | Taobao scraping |
| `npm run test:seller-sprite` | SellerSprite |
| `npm run test:parallel` | Parallel operations |

## Running Tests

```bash
cd packages/backend
npm run test:gigab2b        # Runs test-gigab2b.ts with tsx
```

These scripts:
- Can run independently (no API server needed)
- Make real HTTP requests and browser automation
- Require configured API keys for AI tests
- Output results to console
- No assertions — manual result verification

## Recommended Test Framework Setup (Future)

### Unit Tests — Vitest

```bash
cd packages/frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

### What to Test

| Area | Priority | Examples |
|------|----------|----------|
| WorkflowEngine | High | Sequential execution, data passing, cancellation |
| Plugin executors | High | Input/output mapping, error handling |
| SQL helpers | High | PG → SQLite translation correctness |
| Database service | Medium | CRUD operations, connection handling |
| AI Router | Medium | Fallback chain, provider selection |
| API endpoints | Medium | Request validation, response format |
| React components | Low | Rendering, user interactions |

### Example: WorkflowEngine Test

```typescript
// tests/engine.test.ts
import { describe, it, expect } from 'vitest';
import { WorkflowEngine } from '../src/engine/WorkflowEngine';

describe('WorkflowEngine', () => {
  it('executes nodes sequentially', async () => {
    const engine = new WorkflowEngine();
    const order: string[] = [];

    engine.registerMany([
      { type: 'a', execute: async () => { order.push('a'); return { data: 'a' }; } },
      { type: 'b', execute: async () => { order.push('b'); return { data: 'b' }; } },
    ]);

    await engine.execute([
      { id: '1', type: 'a', data: {} },
      { id: '2', type: 'b', data: {} },
    ], {});

    expect(order).toEqual(['a', 'b']);
  });
});
```

### Example: SQL Helper Test

```typescript
// tests/sql-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { translateSql } from '../src/core/drivers/sql-helpers';

describe('translateSql', () => {
  it('converts $N params to ?', () => {
    expect(translateSql('SELECT * FROM t WHERE id = $1')).toBe(
      'SELECT * FROM t WHERE id = ?'
    );
  });

  it('strips type casts', () => {
    expect(translateSql("SELECT $1::jsonb")).toBe('SELECT ?');
    expect(translateSql("SELECT COUNT(*)::int")).toBe('SELECT COUNT(*)');
  });

  it('converts NOW() to datetime', () => {
    expect(translateSql("SELECT NOW()")).toBe("SELECT datetime('now')");
  });
});
```

### Example: API Endpoint Test

```typescript
// tests/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/api-server';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await app.request('/api/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});
```
