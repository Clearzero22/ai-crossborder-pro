# Environment Variables Reference

## AI Provider Keys

| Variable | Used By | Required | Description |
|----------|---------|----------|-------------|
| `DASHSCOPE_API_KEY` | Qwen Provider | No | DashScope API key |
| `DASHSCOPE_BASE_URL` | Qwen Provider | No | Custom DashScope base URL |
| `OPENAI_API_KEY` | OpenAI Provider | No | OpenAI API key |
| `OPENAI_BASE_URL` | OpenAI Provider | No | Custom OpenAI base URL |
| `CLAUDE_API_KEY` | Claude Provider | No | Anthropic API key |
| `CLAUDE_BASE_URL` | Claude Provider | No | Custom Anthropic base URL |
| `GEMINI_API_KEY` | Gemini Provider | No | Google AI API key |
| `GEMINI_BASE_URL` | Gemini Provider | No | Custom Gemini base URL |

Fallback: If DB not available, providers read from env vars.

---

## Database Configuration

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `DB_DRIVER` | DatabaseService | `sqlite` | `sqlite` or `postgres` |
| `DB_PATH` | DatabaseService (SQLite) | `~/.ai-crossborder-pro/data/crawler.db` | SQLite database file path |
| `DB_HOST` | DatabaseService (PG) | `localhost` | PostgreSQL host |
| `DB_PORT` | DatabaseService (PG) | `5432` | PostgreSQL port |
| `DB_NAME` | DatabaseService (PG) | `crawler_db` | PostgreSQL database name |
| `DB_USER` | DatabaseService (PG) | `crawler` | PostgreSQL user |
| `DB_PASS` | DatabaseService (PG) | `crawler_pass` | PostgreSQL password |
| `DATABASE_URL` | DatabaseService (PG) | - | PostgreSQL connection URL |

---

## Server Configuration

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | api-server.ts | `3456` | Backend API server port |
| `NODE_ENV` | api-server.ts | - | `production` or `development` |
| `DATA_DIR` | api-server.ts | `~/.ai-crossborder-pro` | Application data directory |

---

## Browser Configuration

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `BROWSER_MODE` | browser-config.ts | - | Browser automation mode |
| `BROWSER_PLAYWRIGHT_PATH` | browser-config.ts | - | Path to Playwright Chromium |
| `PLAYWRIGHT_BROWSERS_PATH` | services | - | Playwright browsers directory |
| `CHROME_DATA_DIR` | Electron main | `{userData}/chrome-profile` | Chrome user data directory |

---

## Electron-Specific

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `FRONTEND_DIR` | api-server.ts | - | Frontend dist directory (production SPA) |
| `NODE_PATH` | backend-launcher.ts | - | Node modules path for backend |
| `BACKEND_PORT` | Electron main | `3456` | Backend port (may differ if 3456 in use) |
| `GH_TOKEN` | updater.ts | - | GitHub token for dev auto-update |
| `APP_USER_DATA_DIR` | api-key-config.ts | `~/.ai-crossborder-pro` | Override for machine ID storage |

---

## Frontend (Vite)

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `VITE_PLAN_WS_URL` | App.tsx | `ws://localhost:8080/plan-updates` | WebSocket URL for plan updates |

---

## Electron Environment Forwarding

Electron main process forwards these env vars to the backend child process:

```
DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL
OPENAI_API_KEY, OPENAI_BASE_URL
CLAUDE_API_KEY, CLAUDE_BASE_URL
GEMINI_API_KEY, GEMINI_BASE_URL
DB_DRIVER, DB_PATH
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DATABASE_URL
BROWSER_MODE, BROWSER_PLAYWRIGHT_PATH
PLAYWRIGHT_BROWSERS_PATH
```

Also passes: `PORT`, `CHROME_DATA_DIR`, `DATA_DIR`, `FRONTEND_DIR`, `NODE_PATH`, `NODE_ENV`

---

## Security Notes

- `DB_PASS` defaults to `crawler_pass` in code (hardcoded)
- `GH_TOKEN` used in dev mode with `forceDevUpdateConfig: true`
- API keys stored encrypted in DB (AES-256-GCM), but env vars are plaintext
- `.env` file in `{userData}/.env` is loaded by Electron main process
