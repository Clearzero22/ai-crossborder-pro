# Workflow Editor - Visual Workflow Automation Tool

**Last Updated:** 2026-04-29

---

## Project Overview

A visual workflow editor for building and executing automation workflows. Users can drag and drop nodes onto a canvas, configure them, and execute workflows with real-time feedback.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono + Bun/Node.js
- **Automation**: Playwright (browser automation)
- **Database**: PostgreSQL (optional, for persistence)

---

## Quick Start

### Prerequisites

- Node.js 18+ (for frontend)
- Bun (recommended for backend) or Node.js with tsx
- PostgreSQL (optional, for dashboard stats)

### Installation

```bash
# Frontend dependencies
npm install

# Backend dependencies (external project)
cd /Users/clearzero22/development/ai/01_amazon_projects/node_plawright_test/quick-test && npm install
```

### Running the Project

**Terminal 1 - Backend API (port 3456):**
```bash
cd /Users/clearzero22/development/ai/01_amazon_projects/node_plawright_test/quick-test && npm run api:dev
```

**Terminal 2 - Frontend Vite (port 5173):**
```bash
npm run dev
```

**Terminal 3 - PostgreSQL (optional):**
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
```

Access the application at `http://localhost:5173`

---

## Architecture

### Frontend Structure

```
src/
├── App.tsx                    # Root component
├── main.tsx                   # Entry point
├── components/                # UI components
│   ├── Canvas.tsx            # Workflow canvas
│   ├── WorkflowNode.tsx      # Node rendering
│   ├── ConfigPanel.tsx       # Node configuration
│   ├── NodePanel.tsx         # Left sidebar nodes
│   ├── Layout.tsx            # App layout
│   └── ...
├── pages/                     # Page components
│   ├── WorkflowPage.tsx      # Main workflow editor
│   ├── DataDashboardPage.tsx # Data dashboard
│   ├── ExecutionDataPage.tsx # Execution history
│   ├── AIPage.tsx            # AI tools page
│   └── ...
├── engine/                    # Workflow engine
│   ├── WorkflowEngine.ts     # Core execution engine
│   ├── DataBus.ts            # Node data passing
│   ├── pluginRegistry.ts     # Plugin registration
│   ├── pluginTypes.ts        # Plugin type definitions
│   ├── types.ts              # Core types
│   ├── mockExecutors/        # Mock executors (dev)
│   └── realExecutors/        # Real executors (production)
├── plugins/                   # Node plugins
│   └── index.ts              # Plugin registration
├── context/                   # React contexts
├── hooks/                     # Custom hooks
├── services/                  # API services
├── types/                     # Type definitions
└── utils/                     # Utility functions
```

### Backend Structure

```
backend/
├── server.ts                  # Hono server entry
├── api/                       # API routes
│   ├── dashboard.ts          # Dashboard endpoints
│   └── keywords.ts           # Keyword scraping
├── services/                  # Business logic
│   ├── dashboardStats.ts     # Dashboard stats service
│   └── xiyouzhaociService.ts # Xiyouzhaoci crawler
├── db/                        # Database layer
│   └── index.ts              # PostgreSQL client
├── types/                     # Backend types
│   └── dashboard.ts
└── output/                    # Generated files
```

---

## Core Concepts

### Workflow Engine

The `WorkflowEngine` executes nodes sequentially:

```
Start → Node A → Node B → Node C → End
         ↓         ↓         ↓
       output   output   output
```

Each node receives input from the previous node via `DataBus`.

### Node Plugins

Nodes are defined as `NodePlugin` with:

- `id`: Unique identifier
- `label`: Display name
- `category`: Node category (ai, browser, data, etc.)
- `executor`: Execution logic with `inputSchema`, `outputSchema`, `configSchema`

### Node Execution Flow

1. User configures node settings
2. Engine calls `executor.execute(context)`
3. Executor processes input + config
4. Returns output to DataBus
5. Next node receives previous output as input

---

## API Endpoints

### Health & Status
- `GET /api/health` - Health check

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/executions?limit=N` - Recent executions
- `GET /api/dashboard/trend` - Weekly trend data
- `GET /api/dashboard/user` - User dashboard info

### Keywords
- `POST /api/keywords/xiyouzhaoci` - Scrape Amazon keywords

### Proxy Configuration

Frontend proxies `/api` requests to `http://localhost:3456` (see `vite.config.ts`).

---

## Adding New Nodes

### 1. Define the Executor

```typescript
// src/plugins/index.ts
export const myNodePlugin: NodePlugin = {
  id: 'my-node',
  label: 'My Node',
  category: 'data',
  executor: {
    type: 'my-node',
    label: 'My Node',
    inputSchema: { /* input fields */ },
    outputSchema: { /* output fields */ },
    configSchema: { /* user config fields */ },
    async execute(ctx) {
      // Your logic here
      return { result: 'data' };
    },
  },
};
```

### 2. Register the Plugin

```typescript
// src/plugins/index.ts
export const plugins = [
  myNodePlugin,
  // ... other plugins
];
```

### 3. Add Icon (optional)

```typescript
// src/components/Icons.tsx
export const MyIcon = () => (
  <svg>...</svg>
);
```

---

## Build & Deploy

### Development
```bash
npm run dev          # Frontend dev server
cd /Users/clearzero22/development/ai/01_amazon_projects/node_plawright_test/quick-test && npm run api:dev  # Backend dev server
```

### Production Build
```bash
npm run build        # Build frontend to dist/
npm run preview      # Preview production build
cd /Users/clearzero22/development/ai/01_amazon_projects/node_plawright_test/quick-test && npm run api  # Production backend
```

---

## Environment Variables

**Frontend (.env.local):**
```bash
VITE_API_URL=http://localhost:3456
```

**Backend:**
```bash
PORT=3456
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

---

## Related Documentation

- [Backend README](./backend/README.md) - Backend API details
- [docs/plans/](./docs/plans/) - Design documents and plans
- [docs/xiyouzhaoci-*.md](./docs/) - Xiyouzhaoci integration docs

---

## Troubleshooting

**Port 3456 already in use:**
```bash
lsof -ti:3456 | xargs kill -9
```

**Vite proxy not working:**
- Ensure backend is running on port 3456
- Check `vite.config.ts` proxy configuration

**Playwright browsers not found:**
```bash
cd backend && npx playwright install chromium
```
