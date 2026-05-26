# Frontend Architecture

## Technology

- **Framework:** React 18.3 + TypeScript 5.5
- **Build:** Vite 5.4 with `@vitejs/plugin-react`
- **Styling:** Tailwind CSS 3.4 + PostCSS + Autoprefixer
- **Charts:** Recharts 3.8
- **No router library** — Navigation via `state.navActiveId` switch statement

## Component Tree

```
App.tsx
├── PlanProvider
├── SoundProvider
├── BrowserSettingsProvider
├── AiKeySettingsProvider
└── Layout.tsx
    ├── Sidebar
    │   ├── Logo
    │   ├── NavMenu
    │   └── PlanInfo
    ├── Header
    │   ├── Execution status/progress
    │   ├── Zoom controls
    │   ├── Headless toggle
    │   ├── Start/Stop/Step buttons
    │   └── Execution mode switch
    ├── UpdateNotifier
    ├── UserOverlay
    └── Page Router (navActiveId switch)
        ├── HomePage (home)
        ├── WorkflowPage (workflow)
        │   ├── NodePanel (left)
        │   │   ├── NodeSearch
        │   │   └── NodeGroup[] (browser, ai, data, flow)
        │   ├── Canvas (center)
        │   │   ├── WorkflowNode[]
        │   │   ├── NodeConnector[]
        │   │   └── StepGuide
        │   └── ConfigPanel (right)
        │       ├── ConfigTabs
        │       ├── NodeInfoHeader
        │       ├── ConfigSection[] (dynamic forms)
        │       └── TestButton
        ├── TemplatesPage
        ├── BrowserPage
        ├── AIPage
        ├── TasksPage
        ├── DataDashboardPage
        │   ├── OverviewTab
        │   ├── AllDataTable
        │   ├── NodeComparison
        │   ├── ExecutionDetail
        │   └── NodeDetailRenderers
        ├── IntegrationsPage
        ├── SettingsPage
        │   ├── AccountSection
        │   ├── ApiKeyConfigSection
        │   ├── BrowserConfigSection
        │   ├── SoftwareUpdateSection
        │   └── UpgradeModal
        ├── ExecutionDataPage
        ├── PipelineDataPage
        └── PlaceholderPage
```

## State Management

### Central Hook: `useWorkflowState()` (643 lines)

Single hook managing all workflow state:
- **Canvas state:** zoom, selected node, sidebar collapsed
- **Execution state:** executing, current step, node statuses, step outputs, logs
- **Node management:** add, remove, reorder, config
- **Template loading:** validate IDs, merge configs
- **Plan integration:** check execution limits
- **Sound effects:** node-complete, workflow-complete, error

### Context Providers

| Provider | Purpose |
|----------|---------|
| `PlanProvider` | Subscription plan limits and usage |
| `SoundProvider` | Sound effect preferences |
| `BrowserSettingsProvider` | Browser automation settings |
| `AiKeySettingsProvider` | AI provider key configurations |

## Plugin System (16 Plugins)

| Category | Plugins |
|----------|---------|
| **flow** | start, end |
| **browser** | gigab2b-crawl, amazon-search, amazon-product, xiyouzhaoci-keywords, extract-info (mock), open-shopify (mock), fill-info (mock), upload-images (mock), publish (mock) |
| **ai** | ai-vision, ai-optimize |
| **data** | view-runs, http-request, send-email |

Each plugin defines:
- `id`, `label`, `description`, `category`, `nodeType`
- `inputs` schema (data received from previous node)
- `outputs` schema (data passed to next node)
- `config` schema (user-editable settings)
- `executor` function (actual implementation)

**6 mock plugins** return hardcoded fake data.

## WorkflowEngine (Client-Side)

- Sequential execution of `type === 'step'` nodes
- `DataBus` passes output of node N as input to node N+1
- Supports `auto` (continuous) and `manual` (step-by-step) modes
- `AbortController` for cancellation
- Registers executors from plugin registry on init

## File Structure

```
packages/frontend/src/
├── App.tsx                    # Root component + page router
├── main.tsx                   # Entry point
├── components/                # ~40 UI components
│   ├── Layout.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Canvas.tsx
│   ├── WorkflowNode.tsx
│   ├── ConfigPanel.tsx
│   └── icons/                 # ~40 SVG icon components
├── pages/                     # 12 page components
├── plugins/
│   └── index.ts               # 16 plugin definitions (1785 lines)
├── hooks/
│   ├── useWorkflowState.ts    # Central state hook (643 lines)
│   ├── usePlanContext.ts
│   ├── useSoundSettings.ts
│   └── useBrowserSettings.ts
├── engine/
│   └── WorkflowEngine.ts      # Client-side execution engine
├── services/
│   └── dashboardService.ts    # Dashboard data fetching
└── context/
    ├── PlanContext.tsx
    └── ...
```

## Vite Proxy

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3456'
  }
}
```

All `/api/*` requests are forwarded to the backend during development.
