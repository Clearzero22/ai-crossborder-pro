# Adding a Workflow Plugin

This guide walks through creating a new workflow node plugin from scratch.

## Overview

A plugin defines a workflow node that users can add to their workflow canvas. Each plugin has:
- **Metadata:** ID, label, description, category, colors
- **Schema:** Inputs (data from previous node), outputs (data for next node), config (user settings)
- **Executor:** Function that runs when the workflow executes

## Step 1: Create the Plugin Definition

Edit `packages/frontend/src/plugins/index.ts` and add your plugin:

```typescript
import type { WorkflowNode, PluginDefinition } from './types';

// ─── My New Plugin ─────────────────────────────────────────

const myPlugin: PluginDefinition = {
  id: 'my-new-plugin',
  label: 'My Plugin Name',
  description: 'What this plugin does',
  category: 'data',
  nodeType: 'step',
  panelGroup: 'data',
  panelColor: 'orange',

  inputs: [
    { key: 'previousData', label: 'Previous Data', type: 'string', required: false },
  ],

  outputs: [
    { key: 'result', label: 'Result', type: 'string' },
    { key: 'items', label: 'Items', type: 'array' },
  ],

  config: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      placeholder: 'Enter your API key',
    },
    {
      key: 'maxResults',
      label: 'Max Results',
      type: 'number',
      defaultValue: 10,
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'fast', label: 'Fast' },
        { value: 'thorough', label: 'Thorough' },
      ],
      defaultValue: 'fast',
    },
  ],
};
```

## Step 2: Create the Executor

```typescript
const myPluginExecutor = {
  type: 'my-new-plugin',
  execute: async (
    config: Record<string, unknown>,
    inputData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const { apiKey, maxResults, enabled, mode } = config;
    const { previousData } = inputData;

    if (!enabled) {
      return { result: 'Skipped (disabled)', items: [] };
    }

    // Call your API or service
    const response = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      result: JSON.stringify(data),
      items: data.items?.slice(0, Number(maxResults) || 10) || [],
    };
  },
};
```

## Step 3: Register the Plugin

Add to the plugin registry at the bottom of `plugins/index.ts`:

```typescript
pluginRegistry.register(myPlugin, myPluginExecutor);
```

## Step 4: (Optional) Add a Backend API

If your plugin needs a backend service, add a route in `packages/backend/src/api-server.ts`:

```typescript
app.post('/api/my-service', async (c) => {
  const { apiKey, param1 } = await c.req.json();
  // ... your logic ...
  return c.json({ success: true, data: result });
});
```

Then update the executor to call `/api/my-service`:

```typescript
const response = await fetch('/api/my-service', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey, param1 }),
});
```

## Step 5: (Optional) Add a Database Table

If your plugin needs persistent storage:

### SQLite Schema

Add to `packages/backend/src/core/drivers/sqlite-driver.ts` in the schema:

```sql
CREATE TABLE IF NOT EXISTS my_plugin_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Bump `user_version` from 2 to 3.

### Database Service Methods

Add to `packages/backend/src/core/database-service.ts`:

```typescript
async insertMyPluginData(runId: string, data: unknown): Promise<number> {
  const result = await this.driver.query(
    'INSERT INTO my_plugin_data (run_id, data) VALUES ($1, $2) RETURNING id',
    [runId, JSON.stringify(data)]
  );
  return Number(result.rows[0].id);
}
```

## Schema Field Types

| Type | UI Control | Notes |
|------|-----------|-------|
| `string` | Text input | `placeholder` supported |
| `number` | Number input | `defaultValue` should be a number |
| `boolean` | Toggle switch | `defaultValue` should be boolean |
| `select` | Dropdown | Requires `options` array with `{value, label}` |

## Category and Color Guide

| Category | panelGroup | panelColor | Use For |
|----------|-----------|------------|---------|
| `flow` | — | — | Control nodes (start, end) |
| `browser` | `browser` | `blue` | Browser automation, web scraping |
| `ai` | `ai` | `purple` | AI/ML operations |
| `data` | `data` | `orange` | Data processing, HTTP requests |

## Plugin Registration Order

The order of `pluginRegistry.register()` calls determines the display order in the NodePanel. Standard order:

```
start → browser nodes → ai nodes → data nodes → end
```

## Testing Your Plugin

1. Start development: `npm run dev`
2. Open the workflow editor
3. Find your plugin in the left NodePanel
4. Drag or click to add to the workflow canvas
5. Configure settings in the right ConfigPanel
6. Click "Test this node" to run it standalone
7. Or run the full workflow with "Start"

## Tips

- Keep executor functions pure (no side effects outside of the return value)
- Always handle errors with descriptive messages
- Use `headless` config option for browser plugins (default: `true`)
- Pass `inputData` through to `outputData` for data chaining
- Log important events via the workflow engine callbacks
