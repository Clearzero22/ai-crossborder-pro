// backend/server.ts
/**
 * Backend API Server for Workflow Editor
 * Serves the frontend and provides API endpoints for workflow execution
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import dashboard from './api/dashboard';
import keywords from './api/keywords';

const app = new Hono();

// Enable CORS for frontend
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.route('/api/dashboard', dashboard);
app.route('/api/keywords', keywords);

// Serve frontend files (in production)
// In development, Vite dev server handles this

const PORT = parseInt(process.env.PORT || '3001');

console.log(`🚀 Backend server starting on port ${PORT}`);
console.log(`📡 API endpoints:`);
console.log(`   - GET  /api/health`);
console.log(`   - GET  /api/dashboard/stats`);
console.log(`   - GET  /api/dashboard/executions`);
console.log(`   - GET  /api/dashboard/trend`);
console.log(`   - GET  /api/dashboard/user`);
console.log(`   - POST /api/keywords/xiyouzhaoci`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✅ Server ready at http://localhost:${PORT}`);
