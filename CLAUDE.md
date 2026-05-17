# AI Crossborder Pro — Monorepo

## Quick Start

```bash
npm install   # first time only
npm run dev   # start all: frontend(5173) + backend(3456) + electron
```

## Dev Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend + backend + electron together |
| `npm run dev:frontend` | Vite dev server only (port 5173) |
| `npm run dev:backend` | API server only (port 3456) |
| `npm run dev:electron` | Build TS then launch Electron |

## Build & Package

| Command | Output |
|---------|--------|
| `npm run build` | Build all packages (frontend + backend + electron TS) |
| `npm run build:win` | Windows installer (NSIS) |
| `npm run build:mac` | macOS DMG |
| `npm run build:linux` | Linux AppImage + DEB |
| `npm run clean` | Remove all dist/release artifacts |

## Architecture

```
packages/
  frontend/   React + Vite + Tailwind (dev: 5173)
  backend/    API server with Playwright/AI services (dev: 3456)
  electron/   Desktop shell, bundles frontend + backend
```

- **Dev mode:** Electron loads `localhost:5173`, backend runs separately on `:3456`
- **Production:** Electron forks backend process, waits for health check, then loads app
