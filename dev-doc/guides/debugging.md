# Debugging Guide

## 1. Debugging Frontend (React + Vite)

### Browser DevTools

Electron opens DevTools automatically in dev mode (`mode: 'detach'`).

- **Console:** All `console.log` output from React
- **Network:** All `/api/*` requests proxied to backend
- **Elements:** React component tree via React DevTools
- **Sources:** Source maps enabled by Vite

### React DevTools

Install React Developer Tools extension (works in Electron).

### Common Issues

| Issue | Solution |
|-------|---------|
| Blank page after Vite start | Check browser console for errors, ensure port 5173 is free |
| API requests return 502 | Backend not running, check `http://localhost:3456/api/health` |
| HMR not working | Check if file is in `packages/frontend/src/` |
| Port 5173 in use | `npx kill-port 5173` or change Vite port |

## 2. Debugging Backend (Hono API)

### Console Output

Backend logs to stdout/stderr. In dev mode, visible in the terminal running `npm run dev:backend`.

### VS Code Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeArgs": ["--loader", "tsx"],
      "args": ["packages/backend/src/api-server.ts"],
      "cwd": "${workspaceFolder}",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>"]
    }
  ]
}
```

### Common Issues

| Issue | Solution |
|-------|---------|
| DB connection error | Check SQLite file permissions, or PostgreSQL Docker status |
| Playwright crash | Run `npx playwright install chromium` |
| AI API 401 error | Check API key in Settings UI or env vars |
| Port 3456 in use | `npx kill-port 3456` |
| SQL translation error | Check `sql-helpers.ts` — PG syntax may not translate to SQLite |

### Logging Backend from Electron

In production, backend stdout is piped to Electron main process console:
```
[Backend] 🚀 API 服务器已启动
[Backend] 📍 http://localhost:3456
```

## 3. Debugging Electron

### Main Process

Add `mainWindow.webContents.openDevTools({ mode: 'detach' })` in `main.ts` to always open DevTools.

### VS Code Launch Configuration

```json
{
  "name": "Debug Electron Main",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["electron", "--inspect=9229", "."],
  "cwd": "${workspaceFolder}/packages/electron",
  "console": "integratedTerminal"
}
```

### Common Issues

| Issue | Solution |
|-------|---------|
| Backend fails to start | Check `process.resourcesPath` in console, ensure `backend-dist/` exists |
| Blank window in production | Backend health check failed, check backend logs |
| Auto-update not working | Check `GH_TOKEN` env var, verify GitHub releases exist |
| Native module crash | Run `npx electron-builder install-app-deps` |

### IPC Debugging

In `preload.ts`, add logging:
```typescript
console.log('[IPC] invoking:', channel);
```

In `main.ts`, verify handler registration:
```typescript
ipcMain.handle('my-channel', (event, ...args) => {
  console.log('[IPC] received:', channel, args);
  return result;
});
```

## 4. Debugging Workflow Execution

### Step-by-Step Execution

1. Set execution mode to "Manual" in the Header
2. Add nodes to the workflow
3. Click "Start" — first node executes
4. Click "Next Step" for each subsequent node
5. Watch the ConfigPanel (right panel) for output data

### Node-Level Debugging

Each node executor logs to the console. Check browser console for:
```
[Engine] Executing node: ai-vision
[Engine] Node ai-vision completed in 2.3s
```

### Data Flow Debugging

1. Select a node on the canvas
2. Switch to "步骤数据" (Step Data) tab in ConfigPanel
3. View input/output data for each step

### Common Issues

| Issue | Solution |
|-------|---------|
| Node stuck on "running" | Check browser console for unhandled promise rejection |
| Data not passing between nodes | Verify input/output schema match in plugin definition |
| `placeholderImagePath` undefined | Build error — see `plugins/index.ts:504` |
| Node returns empty output | Check API response in Network tab, verify backend is running |

## 5. Debugging Build

### Frontend Build

```bash
cd packages/frontend
npm run build  # tsc + vite build
```

Check `dist/` for output.

### Backend Build

```bash
cd packages/backend
npm run build  # esbuild bundles to backend-dist/
```

### Full Build

```bash
npm run build  # frontend → backend → electron
```

### Common Build Errors

| Error | Solution |
|-------|---------|
| TS2304: Cannot find name | Missing import or type definition |
| Module not found | Run `npm install` from monorepo root |
| esbuild error | Check import paths, ensure relative imports use correct extensions |
| electron-builder error | Check `electron-builder.yml` paths, ensure `dist-electron/` exists |

## 6. Useful Tools

- **API Testing:** `curl http://localhost:3456/api/health`
- **DB Inspection:** `sqlite3 ~/.ai-crossborder-pro/data/crawler.db`
- **Process Management:** `npx kill-port 3456`, `npx kill-port 5173`
- **Network:** Browser DevTools → Network tab (filter `/api/`)
