// backend/api/dashboard.ts
import { Hono } from 'hono';
import * as dashboardService from '../services/dashboardStats';

const dashboard = new Hono();

// GET /api/dashboard/stats
dashboard.get('/stats', async (c) => {
  const stats = await dashboardService.getDashboardStats();
  return c.json({ data: stats });
});

// GET /api/dashboard/executions
dashboard.get('/executions', async (c) => {
  const limit = parseInt(c.req.query('limit') || '5');
  const executions = await dashboardService.getRecentExecutions(limit);
  return c.json({ executions, total: executions.length });
});

// GET /api/dashboard/trend
dashboard.get('/trend', async (c) => {
  const trend = await dashboardService.getWeeklyTrend();
  return c.json({ weekly: trend });
});

// GET /api/dashboard/user
dashboard.get('/user', async (c) => {
  const user = await dashboardService.getUserDashboardInfo();
  return c.json({ data: user });
});

export default dashboard;