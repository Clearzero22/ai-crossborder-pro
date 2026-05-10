import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────

interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  activeNodes: number;
}

interface TrendPoint {
  date: string;
  total: string;
  success: string;
  failed: string;
}

interface NodeStatEntry {
  node_id: string;
  node_label: string;
  total: string;
  success: string;
  avg_ms: string;
}

interface Execution {
  execution_id: string;
  workflow_name: string;
  status: string;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  trigger: string | null;
  total_steps: number | null;
  success_steps: number | null;
  error_steps: number | null;
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${accent}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">{label}</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    success: {
      label: '成功',
      cls: 'text-green-700 bg-green-50 border border-green-200',
    },
    completed: {
      label: '成功',
      cls: 'text-green-700 bg-green-50 border border-green-200',
    },
    failed: {
      label: '失败',
      cls: 'text-red-700 bg-red-50 border border-red-200',
    },
    aborted: {
      label: '已中止',
      cls: 'text-gray-700 bg-gray-50 border border-gray-200',
    },
    running: {
      label: '运行中',
      cls: 'text-blue-700 bg-blue-50 border border-blue-200',
    },
  };
  const entry = map[status] ?? {
    label: status,
    cls: 'text-gray-600 bg-gray-50 border border-gray-200',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function OverviewTab({
  onSelectExecution,
}: {
  onSelectExecution: (id: string) => void;
}) {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [nodeStats, setNodeStats] = useState<NodeStatEntry[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, execRes] = await Promise.all([
          fetch('/api/workflow/stats'),
          fetch('/api/workflow/executions?limit=10'),
        ]);

        if (!statsRes.ok || !execRes.ok) {
          throw new Error('请求数据失败');
        }

        const statsJson = await statsRes.json();
        const execJson = await execRes.json();

        if (!cancelled) {
          setStats(statsJson.stats ?? null);
          setTrend(statsJson.trend ?? []);
          setNodeStats(statsJson.nodeStats ?? []);
          setExecutions(execJson.executions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '未知错误');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">加载中...</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-1">
            加载失败
          </div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────

  if (!stats || (stats.totalExecutions === 0 && executions.length === 0)) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-gray-300 text-5xl mb-3">📊</div>
          <div className="text-gray-500 text-sm">暂无工作流执行数据</div>
          <div className="text-gray-400 text-xs mt-1">
            运行第一个工作流后，统计数据将显示在此处
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────

  const trendData = trend.map(t => ({
    date: t.date.slice(0, 10),
    total: Number(t.total),
    success: Number(t.success),
    failed: Number(t.failed),
  }));
  const nodeData = nodeStats.map(n => ({
    name: n.node_label,
    successRate: Number(n.total) > 0 ? Math.round(Number(n.success) / Number(n.total) * 100) : 0,
    avgMs: Number(n.avg_ms) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="总执行次数"
          value={String(stats?.totalExecutions ?? 0)}
          icon="🔄"
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="成功率"
          value={`${(stats?.successRate ?? 0).toFixed(1)}%`}
          icon="✅"
          accent="bg-green-50 text-green-600"
        />
        <StatCard
          label="平均耗时"
          value={formatDuration(stats?.avgDurationMs ?? 0)}
          icon="⏱️"
          accent="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="活跃节点"
          value={String(stats?.activeNodes ?? 0)}
          icon="📦"
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Charts ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Execution Trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            执行趋势
          </h3>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              暂无趋势数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                  name="总执行"
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                  name="成功"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 5 }}
                  name="失败"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Node Success Rate */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            节点成功率
          </h3>
          {nodeData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              暂无节点数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nodeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  yAxisId={0}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  yAxisId={1}
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v: number) => v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(0)}s`}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    const v = Number(value) || 0;
                    if (name === '成功率') return [`${v}%`, '成功率'];
                    if (name === '平均耗时') return [v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(1)}s`, '平均耗时'];
                    return [v, name];
                  }}
                />
                <Bar
                  dataKey="successRate"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="成功率"
                  yAxisId={0}
                />
                <Bar
                  dataKey="avgMs"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  name="平均耗时"
                  yAxisId={1}
                  opacity={0.6}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Executions ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">最近执行</h3>
        </div>

        {executions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            暂无执行记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">工作流</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">步骤</th>
                  <th className="px-5 py-3 font-medium">耗时</th>
                  <th className="px-5 py-3 font-medium">触发</th>
                  <th className="px-5 py-3 font-medium">开始时间</th>
                  <th className="px-5 py-3 font-medium">完成时间</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => {
                  const totalSteps = exec.total_steps ?? 0;
                  const successSteps = exec.success_steps ?? 0;
                  const errorSteps = exec.error_steps ?? 0;
                  const progressPct = totalSteps > 0 ? Math.round(successSteps / totalSteps * 100) : 0;
                  const triggerLabel = exec.trigger === 'manual' ? '手动' : exec.trigger === 'scheduled' ? '定时' : exec.trigger ?? '-';
                  return (
                  <tr
                    key={exec.execution_id}
                    onClick={() => onSelectExecution(exec.execution_id)}
                    className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {exec.workflow_name}
                    </td>
                    <td className="px-5 py-3">{statusBadge(exec.status)}</td>
                    <td className="px-5 py-3">
                      {totalSteps > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${errorSteps > 0 ? 'bg-amber-400' : 'bg-green-400'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{successSteps}/{totalSteps}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatDuration(exec.duration_ms ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{triggerLabel}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(exec.started_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {exec.completed_at
                        ? new Date(exec.completed_at).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Convert milliseconds to a human-readable duration string.
 * - < 1000 ms  → "Xms"
 * - < 60 000 ms → "Xs"          (whole seconds)
 * - >= 60 000 ms → "Xm Xs"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
