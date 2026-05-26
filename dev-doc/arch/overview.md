# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Shell                        │
│  ┌────────────────┐     ┌──────────────────────────┐   │
│  │  Main Process   │     │  Backend Child Process    │   │
│  │  (main.ts)      │────>│  (api-server.js)         │   │
│  │  IPC handlers   │fork │  Hono HTTP Server        │   │
│  │  Auto-updater   │     │  Port 3456               │   │
│  └───────┬─────────┘     └──────────┬───────────────┘   │
│          │ preload.ts               │                    │
│          │ contextBridge            │                    │
│  ┌───────┴──────────────────────────┴───────────────┐   │
│  │              Renderer Process (BrowserWindow)      │   │
│  │  React SPA + Vite + Tailwind                       │   │
│  │  WorkflowEngine (client-side execution)             │   │
│  │  Plugin System (16 nodes)                          │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
ai-crossborder-pro/
├── packages/
│   ├── frontend/     React + Vite + Tailwind (port 5173)
│   ├── backend/      Hono API + Playwright + AI providers (port 3456)
│   └── electron/     Desktop shell (bundles frontend + backend)
├── package.json      npm workspaces, build scripts
└── dev-doc/          Development documentation
```

## Data Flow

### Development Mode
```
Browser → http://localhost:5173 (Vite HMR)
         └─ /api/* → proxy → http://localhost:3456 (Hono)
```

### Production Mode (Electron)
```
Electron Main → fork(api-server.js) → wait /api/health
           → BrowserWindow → http://localhost:3456
           → Backend serves frontend-dist/ as static files
```

### Workflow Execution
```
User clicks "Start"
  → useWorkflowState.startExecution()
  → WorkflowEngine.execute(nodes)
  → For each step node:
    → executor.execute(config, inputData)
      → fetch('/api/...') (backend API call)
      → Playwright browser automation
      → AI provider API call
    → DataBus passes output → next node input
  → Persist to /api/workflow/executions + steps + logs
```

## Process Model

| Process | Runtime | Port | Purpose |
|---------|---------|------|---------|
| Electron Main | Electron | - | Window management, IPC, auto-update |
| Backend | Node.js (forked) | 3456 | API server, browser automation, AI |
| Renderer | Chromium | - | React UI, workflow engine |

## Key Design Decisions

1. **Client-side workflow engine** — Execution runs in the browser, not the backend
2. **Dual database** — SQLite default (zero config) + PostgreSQL optional
3. **No router** — SPA navigation via state, no react-router
4. **Per-request DB connections** — Each API handler creates/destroys its own DB connection
5. **Mock plugins** — 5 e-commerce nodes (open-shopify, extract-info, fill-info, upload-images, publish) return fake data
6. **Dual AI architecture** — Legacy `AiVisionService` + new `ai-providers/` system coexist

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, Recharts |
| Backend | Hono, TypeScript, Playwright, better-sqlite3, pg, openai SDK |
| Electron | Electron 42, electron-builder 26, electron-updater |
| AI | Qwen, OpenAI GPT-4o, Claude 3.5, Gemini 2.0 |
| Build | npm workspaces, esbuild, tsc |

## Port Assignments

| Port | Service |
|------|---------|
| 3456 | Backend API (Hono) |
| 5173 | Frontend dev (Vite) |
| 5432 | PostgreSQL (Docker, optional) |
| 8080 | Plan updates WebSocket (default) |
