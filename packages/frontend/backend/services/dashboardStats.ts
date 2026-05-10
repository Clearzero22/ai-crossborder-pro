// backend/services/dashboardStats.ts
import { pool } from '../db';
import type { DashboardStats, ExecutionRecord, TrendDataPoint, DashboardUser } from '../types/dashboard';

/** 获取统计数据 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const client = await pool.connect().catch(() => null);

  if (!client) {
    return getDefaultStats();
  }

  try {
    // 总执行次数
    const totalResult = await client.query(
      'SELECT COUNT(*) as count FROM crawler_runs'
    );
    const totalExecutions = parseInt(totalResult.rows[0].count) || 0;

    // 成功率
    const successResult = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as rate
       FROM crawler_runs`
    );
    const successRate = Math.round((parseFloat(successResult.rows[0].rate) || 0) * 10) / 10;

    // 发布商品数
    const productsResult = await client.query(
      'SELECT COUNT(DISTINCT asin) as count FROM clean_products'
    );
    const publishedProducts = parseInt(productsResult.rows[0].count) || 0;

    // 运行时长（小时）
    const durationResult = await client.query(
      'SELECT SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) as total FROM crawler_runs WHERE ended_at IS NOT NULL'
    );
    const totalDuration = Math.round((parseInt(durationResult.rows[0].total) || 0) / 3600);

    return {
      totalExecutions,
      successRate,
      publishedProducts,
      totalDuration,
      changeFromLastMonth: {
        executions: 12.5,
        successRate: 2.1,
        products: 48,
        duration: 42,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return getDefaultStats();
  } finally {
    client.release();
  }
}

/** 获取最近执行记录 */
export async function getRecentExecutions(limit: number): Promise<ExecutionRecord[]> {
  const client = await pool.connect().catch(() => null);

  if (!client) {
    return [];
  }

  try {
    const result = await client.query(
      `SELECT
        id,
        workflow_name as "workflowName",
        status,
        EXTRACT(EPOCH FROM (ended_at - started_at)) as "duration",
        error_message as "errorMessage",
        started_at as "startedAt"
       FROM crawler_runs
       ORDER BY started_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      workflowName: row.workflowName || '未知工作流',
      status: row.status,
      duration: Math.round(row.duration) || 0,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt,
    }));
  } catch (error) {
    console.error('Error fetching executions:', error);
    return [];
  } finally {
    client.release();
  }
}

/** 获取本周趋势 */
export async function getWeeklyTrend(): Promise<TrendDataPoint[]> {
  const client = await pool.connect().catch(() => null);

  if (!client) {
    return [];
  }

  try {
    const result = await client.query(
      `SELECT
        DATE(started_at) as date,
        COUNT(*) as count
       FROM crawler_runs
       WHERE started_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(started_at)
       ORDER BY date`
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
    }));
  } catch (error) {
    console.error('Error fetching trend:', error);
    return [];
  } finally {
    client.release();
  }
}

/** 获取用户概览 */
export async function getUserDashboardInfo(): Promise<DashboardUser> {
  const client = await pool.connect().catch(() => null);

  let todayExecutions = 0;
  if (client) {
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM crawler_runs WHERE DATE(started_at) = CURRENT_DATE`
      );
      todayExecutions = parseInt(result.rows[0].count) || 0;
    } catch {
      // Ignore
    } finally {
      client.release();
    }
  }

  return {
    userName: '跨境小助手',
    planName: '专业版',
    daysActive: 128,
    lastLoginAt: new Date(),
    activeWorkflows: 3,
    todayExecutions,
    pendingTasks: 2,
  };
}

function getDefaultStats(): DashboardStats {
  return {
    totalExecutions: 0,
    successRate: 0,
    publishedProducts: 0,
    totalDuration: 0,
    changeFromLastMonth: {
      executions: 0,
      successRate: 0,
      products: 0,
      duration: 0,
    },
  };
}
