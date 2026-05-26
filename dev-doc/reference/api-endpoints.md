# API Endpoints Reference

Backend server: `http://localhost:3456` (Hono framework)

---

## Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check (DB + AI status) | No |

**Response:** `{ status, db, ai, timestamp }`

---

## Crawler

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/crawl/gigab2b` | Execute GigaB2B crawler | No |
| GET | `/api/runs` | List crawler runs | No |
| GET | `/api/runs/:id` | Single run detail (with staging + clean) | No |

**POST /api/crawl/gigab2b** body:
```json
{ "url": "string (required)", "headless": true, "saveToDb": true }
```

---

## AI Vision (Legacy)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/ai/templates` | List prompt templates | No |
| POST | `/api/ai/recognize` | Single image recognition | No |
| POST | `/api/ai/compare` | Multi-image comparison | No |
| GET | `/api/ai/results` | Query AI results by runId | No |
| POST | `/api/ai/optimize` | Listing copy optimization (Gemini/ChatGPT) | No |

**POST /api/ai/recognize** body:
```json
{ "image": "string (URL or Base64)", "templateId": "string", "prompt": "string", "model": "string", "runId": "string", "nodeId": "string" }
```

**POST /api/ai/compare** body:
```json
{ "images": ["url1", "url2", ...], "prompt": "string", "templateId": "string", "model": "string" }
```

**POST /api/ai/optimize** body:
```json
{ "title": "string (required)", "description": "string", "bulletPoints": ["string"], "longDescription": "string", "competitors": [{...}], "keywords": [{...}], "tone": "professional|marketing|concise", "language": "zh-CN", "headless": false }
```

---

## Amazon

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/search/amazon` | Keyword search | No |
| POST | `/api/scrape/amazon-product` | Product detail scrape | No |

**POST /api/search/amazon** body:
```json
{ "keyword": "string (required)", "maxResults": 20, "headless": true }
```

**POST /api/scrape/amazon-product** body:
```json
{ "asin": "string", "url": "string", "headless": true, "saveToDb": true }
```

---

## Keywords

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/keywords/xiyouzhaoci` | Xiyouzhaoci keyword mining | No |

**Body:**
```json
{ "asin": "string (required, 10 alphanumeric)", "headless": true, "maxKeywords": 50 }
```

---

## File Upload AI (Browser-based)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/gemini/upload` | Upload file to Gemini via browser | No |
| POST | `/api/chatgpt/upload` | Upload file to ChatGPT via browser | No |

**Body:**
```json
{ "filePath": "string", "prompt": "string (required)", "headless": true, "responseTimeout": 60000 }
```

---

## Database Query

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/db/stats` | DB statistics (runs, products, ai results) | No |
| GET | `/api/db/runs` | List runs (limit query param) | No |
| GET | `/api/db/products` | List products (limit query param) | No |
| GET | `/api/db/ai-results` | List AI results (runId, limit) | No |
| GET | `/api/db/runs/:runId/products` | Products by run | No |
| GET | `/api/db/runs/:runId/raw` | Raw data by run | No |
| GET | `/api/db/runs/:runId/staging` | Staging data by run | No |

---

## Workflow Execution

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/workflow/executions` | Create execution record | No |
| GET | `/api/workflow/executions` | List executions (status, limit, offset) | No |
| GET | `/api/workflow/executions/:id` | Execution detail with steps + logs | No |
| PUT | `/api/workflow/executions/:id/complete` | Mark execution complete | No |
| POST | `/api/workflow/steps` | Write step data | No |
| GET | `/api/workflow/steps/:node_id/history` | Node execution history | No |
| POST | `/api/workflow/logs` | Write logs (batch) | No |
| GET | `/api/workflow/stats` | Dashboard statistics | No |

---

## Pipeline Data

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/pipeline/runs` | List pipeline runs (filesystem) | No |
| GET | `/api/pipeline/runs/:runId` | Single run metadata | No |
| GET | `/api/pipeline/runs/:runId/steps/:stepNum/:type` | Step input/output JSON | No |

---

## Browser Settings

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/settings/browser` | Get browser config + status | No |
| PUT | `/api/settings/browser` | Update browser config | No |
| POST | `/api/settings/browser/test` | Test browser launch | No |
| GET | `/api/settings/browser/versions` | Chromium version info | No |
| POST | `/api/settings/browser/download` | Download Chromium (SSE stream) | No |
| GET | `/api/settings/browser/profiles` | List browser profiles | No |
| POST | `/api/settings/browser/profiles` | Create profile | No |
| PUT | `/api/settings/browser/profiles/active` | Set active profile | No |
| PUT | `/api/settings/browser/profiles/:id` | Update profile | No |
| DELETE | `/api/settings/browser/profiles/:id` | Delete profile | No |

---

## AI Provider Keys

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/settings/ai-keys` | Get all provider configs (masked) | No |
| PUT | `/api/settings/ai-keys/:provider` | Update provider API key | No |
| DELETE | `/api/settings/ai-keys/:provider` | Delete provider config | No |
| POST | `/api/settings/ai-keys/:provider/test` | Test provider connection | No |

Valid providers: `qwen`, `openai`, `claude`, `gemini`

---

## Static Files (Production Only)

When `FRONTEND_DIR` is set, the backend serves frontend assets:
- `GET /assets/*` — Static assets (JS, CSS, images, fonts)
- `GET /*` — SPA fallback to `index.html`

---

## Security Notes

- All endpoints have zero authentication
- Any device on the LAN can access all APIs
- `POST /api/gemini/upload` `filePath` parameter has no path validation (arbitrary file read)
- API keys stored encrypted in DB but served via unauthenticated endpoints
