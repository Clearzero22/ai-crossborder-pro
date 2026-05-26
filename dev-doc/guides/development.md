# Development Guide

## Prerequisites

- Node.js 18+
- npm 9+
- Git
- (Optional) Docker — for PostgreSQL

## First-Time Setup

```bash
git clone <repo-url>
cd ai-crossborder-pro
npm install
```

`postinstall` automatically runs `npx electron-builder install-app-deps` to rebuild native modules for Electron.

## Starting Development

```bash
npm run dev
```

This starts three processes concurrently:

| Process | Port | What It Does |
|---------|------|-------------|
| Vite dev server | 5173 | Hot-reloading React frontend |
| Backend API | 3456 | Hono server with Playwright + AI |
| Electron | - | Desktop shell |

**Individual starts:**

```bash
npm run dev:frontend    # Vite only (port 5173)
npm run dev:backend     # API server only (port 3456)
npm run dev:electron    # Build TS + launch Electron
```

## Project Structure

```
packages/
  frontend/src/     # React app
    components/     # UI components (~40 files)
    pages/          # Page components (12 files)
    plugins/        # Workflow node definitions (16 plugins)
    hooks/          # Custom React hooks
    engine/         # WorkflowEngine (client-side)
    services/       # API client services
    context/        # React context providers
  backend/src/      # API server
    api-server.ts   # All routes (1505 lines)
    core/           # Database, API key, browser config
    services/       # Business logic services
    ai-providers/   # Multi-AI provider system
    routes/         # Additional route modules
    crawlers/       # Web scraping implementations
  electron/electron/ # Desktop shell
    main.ts         # Main process
    preload.ts      # Renderer bridge
    updater.ts      # Auto-update
    backend-launcher.ts  # Backend process management
```

## Making Changes

### Frontend Changes

1. Edit files in `packages/frontend/src/`
2. Vite auto-reloads (HMR) at `http://localhost:5173`
3. If Electron is open, it also reflects changes

### Backend Changes

1. Edit files in `packages/backend/src/`
2. **No hot reload** — restart backend manually:
   ```bash
   # Stop Ctrl+C, then:
   npm run dev:backend
   ```
3. Alternative: `npm run api:dev` uses `tsx watch` (auto-restart on file change)

### Electron Changes

1. Edit files in `packages/electron/electron/`
2. Must rebuild TS and restart Electron:
   ```bash
   npm run dev:electron
   ```

## Code Conventions

- **TypeScript strict mode** enabled
- **Tailwind CSS** for styling (no CSS modules, no styled-components)
- **No comments** in production code (unless explicitly requested)
- **Component naming:** PascalCase for components, camelCase for hooks/utilities
- **File naming:** PascalCase for components (`WorkflowNode.tsx`), kebab-case for utilities

## Common Tasks

### Add a new page

1. Create `packages/frontend/src/pages/MyPage.tsx`
2. Add import in `App.tsx`
3. Add case to the `navActiveId` switch statement
4. Add menu item to `NavMenu.tsx`

### Add a new API endpoint

1. Add route handler in `packages/backend/src/api-server.ts`
2. Add corresponding `createDb()` + `connect/disconnect` pattern
3. Frontend calls via `fetch('/api/my-endpoint')` (proxied by Vite)

### Modify database schema

1. Edit `packages/backend/src/core/drivers/sqlite-driver.ts` — bump `user_version`, add migration
2. For PostgreSQL: edit `packages/backend/db/init/*.sql`
3. Update `dev-doc/reference/database-schema.md`

## Running Tests

```bash
# Backend test scripts (standalone, not integrated)
cd packages/backend
npm run test:gigab2b
npm run test:amazon
npm run test:gemini
npm run test:chatgpt
# ... 25+ test scripts available
```

Note: These are standalone scripts, not a proper test suite. They execute real API calls and require configured API keys.

## Environment Variables

Copy `.env.example` (if exists) or create `.env` in project root:

```bash
# AI Keys (optional, can be configured via UI)
DASHSCOPE_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx

# Database (optional, defaults to SQLite)
# DB_DRIVER=sqlite
# DB_PATH=~/.ai-crossborder-pro/data/crawler.db

# Browser (optional)
# CHROME_DATA_DIR=~/.ai-crossborder-pro/chrome-profile
```

For Electron: API keys are stored in `{userData}/.env` and configured via the Settings UI.
