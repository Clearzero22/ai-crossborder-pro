# Backend Architecture

## Technology

- **Framework:** Hono 4.12 + `@hono/node-server`
- **Language:** TypeScript 5.5
- **Browser Automation:** Playwright 1.59, Puppeteer-core 24, chrome-remote-interface
- **Database:** better-sqlite3 12, pg 8
- **AI SDK:** openai 6 (used by Qwen + OpenAI providers)
- **Build:** esbuild 0.28
- **Runtime:** tsx 4 (development)

## File Structure

```
packages/backend/src/
├── api-server.ts              # Hono app (1505 lines, all routes)
├── core/
│   ├── database-service.ts    # High-level DB API (470 lines)
│   ├── api-key-config.ts      # Encrypted API key management
│   ├── browser-config.ts      # Browser automation configuration
│   ├── run-context.ts         # Local file run context
│   └── drivers/
│       ├── types.ts           # IDatabaseDriver interface
│       ├── index.ts           # Driver factory
│       ├── sqlite-driver.ts   # SQLite implementation (embedded schema)
│       ├── postgres-driver.ts # PostgreSQL implementation
│       └── sql-helpers.ts     # PG → SQLite SQL translation
├── services/
│   ├── crawler-service.ts     # Crawler orchestration
│   ├── ai-vision-service.ts   # Legacy AI vision (Qwen)
│   ├── amazon-search-service.ts
│   ├── amazon-product-service.ts
│   ├── gemini-file-service.ts # Browser-based Gemini upload
│   ├── chatgpt-file-service.ts # Browser-based ChatGPT upload
│   └── xiyouzhaociService.ts  # Keyword mining
├── ai-providers/              # New multi-provider system
│   ├── index.ts               # Barrel export + initialization
│   ├── types.ts               # IAiProvider interface
│   ├── base.ts                # BaseAiProvider abstract class
│   ├── registry.ts            # ProviderRegistry singleton
│   ├── ai-router.ts           # AiRouter with fallback
│   ├── templates.ts           # Prompt template library
│   └── providers/
│       ├── qwen.provider.ts
│       ├── openai.provider.ts
│       ├── claude.provider.ts
│       └── gemini.provider.ts
├── routes/
│   └── pipeline-data-routes.ts # Pipeline filesystem API
├── crawlers/
│   ├── base-crawler.ts
│   └── gigab2b/               # GigaB2B crawler
└── test-*.ts                  # 20+ standalone test scripts
```

## Request Processing Pattern

Every API handler follows the same pattern:

```typescript
app.get('/api/something', async (c) => {
  const db = createDb();           // 1. Create new DB instance
  if (!db) return error;           // 2. Fallback if unavailable
  try {
    await db.connect();           // 3. Connect
    const result = await db.query(...); // 4. Execute query
    return c.json(result);         // 5. Return response
  } catch (error) {
    return c.json(error, 500);     // 6. Error handling
  } finally {
    await db.disconnect();         // 7. Always disconnect
  }
});
```

## ETL Pipeline (3 Layers)

```
Raw Layer           Staging Layer          Clean Layer
(raw_data)    →     (staging_data)    →    (clean_products)
HTML/JSON           Semi-structured         Normalized
                    extracted data          ProductRecord
```

### GigaB2B Crawler Flow

```
POST /api/crawl/gigab2b
  → CrawlerService.runGigaB2B(url)
    → BaseCrawler.navigate(page)    // Load URL in Playwright
    → BaseCrawler.extract(page)     // Extract data via selectors
    → BaseCrawler.clean(staging)    // Normalize to ProductRecord
    → DB: insertRun() + insertRaw() + insertStaging() + upsertProduct()
```

## AI Provider Architecture

```
IAiProvider (interface)
  ├── recognize(request) → string
  ├── compare(request) → string
  └── chat(messages, model) → string
       ↑
BaseAiProvider (abstract)
  ├── Image processing (Base64/URL)
  └── Template resolution
       ↑
QwenProvider   OpenAiProvider   ClaudeProvider   GeminiProvider
(DashScope)    (GPT-4o)        (Claude 3.5)     (Gemini 2.0)
```

### Router Flow

```
AiRouter.recognize(image, templateId, model, options)
  → globalRegistry.getAllEnabled() (sorted by priority)
  → Try first provider
  → If fails + fallback enabled → try next
  → Up to maxRetries (default 3)
```

### API Key Management

```
apiKeyConfig.getProviderConfig(providerName)
  → DB: settings table, key = 'ai_key_{provider}'
  → Encrypted: AES-256-GCM, key derived from machine-id via scrypt
  → Fallback: process.env.{VARIABLE}
```

## Static File Serving (Production)

When `FRONTEND_DIR` is set:
- `GET /assets/*` → Serves static files with proper MIME types
- `GET /*` (non-API) → SPA fallback to `index.html`

## Security Concerns

1. **Zero authentication** on all 30+ endpoints
2. **Per-request DB create/destroy** — no connection pooling
3. **Command injection** in browser-config.ts (user-controlled paths)
4. **Hardcoded DB password** (`crawler_pass`)
5. **No rate limiting** on AI endpoints
6. **No input validation framework** (manual checks only)
