import { useState, useEffect, Fragment } from 'react';
import { NodeDetailRenderer } from './NodeDetailRenderers';

// ─── Types ──────────────────────────────────────────────────────

interface Execution {
  id: number;
  execution_id: string;
  template_id: string | null;
  workflow_name: string;
  status: string;
  total_steps: number;
  success_steps: number;
  error_steps: number;
  duration_ms: number | null;
  trigger: string | null;
  started_at: string;
  completed_at: string | null;
}

interface Step {
  id: number;
  execution_id: string;
  step_index: number | null;
  node_id: string;
  node_label: string;
  node_type: string | null;
  status: string;
  duration_ms: number | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  config_data: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

interface Log {
  id: number;
  execution_id: string;
  node_id: string | null;
  node_label: string | null;
  level: string;
  message: string;
  created_at: string;
}

type SubTab = 'executions' | 'steps' | 'logs';

// ─── Helpers ────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: '成功', cls: 'text-green-700 bg-green-50 border-green-200' },
    completed: { label: '成功', cls: 'text-green-700 bg-green-50 border-green-200' },
    failed: { label: '失败', cls: 'text-red-700 bg-red-50 border-red-200' },
    error: { label: '失败', cls: 'text-red-700 bg-red-50 border-red-200' },
    running: { label: '运行中', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    aborted: { label: '已中止', cls: 'text-gray-700 bg-gray-50 border-gray-200' },
  };
  const e = map[status] ?? { label: status, cls: 'text-gray-600 bg-gray-50 border-gray-200' };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${e.cls}`}>{e.label}</span>;
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    info: 'text-gray-600 bg-gray-50',
    success: 'text-green-600 bg-green-50',
    error: 'text-red-600 bg-red-50',
    warn: 'text-amber-600 bg-amber-50',
  };
  const cls = map[level] ?? 'text-gray-500 bg-gray-50';
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${cls}`}>{level}</span>;
}

function truncate(s: unknown, len: number): string {
  const str = s == null ? '' : typeof s === 'object' ? JSON.stringify(s) : String(s);
  return str.length > len ? str.slice(0, len) + '...' : str || '-';
}

function summarizeOutput(nodeId: string, data: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) return '-';
  const title = data.title as string | undefined;
  const keyword = data.keyword as string | undefined;
  const asin = data.asin as string | undefined;
  const images = data.images as string[] | undefined;
  const optTitle = data.optimizedTitle as string | undefined;
  const keys = data.keywords as string[] | undefined;
  const total = data.total as number | undefined;

  switch (nodeId) {
    case 'gigab2b-crawl':
      return title ? `${truncate(title, 35)} | ${images?.length ?? 0}图` : '-';
    case 'amazon-search':
      return keyword ? `${truncate(keyword, 30)} (${total ?? 0}条)` : '-';
    case 'amazon-product':
      return title ? `${data.brand ? data.brand + ' ' : ''}${truncate(title, 30)} ${data.price ?? ''}` : '-';
    case 'xiyouzhaoci-keywords':
      return asin ? `${asin} · ${keys?.length ?? 0}个关键词` : '-';
    case 'ai-optimize':
      return optTitle ? truncate(optTitle, 40) : '-';
    case 'ai-vision':
      return (data.firstResult as string) ? truncate(data.firstResult, 40) : '-';
    case 'extract-info':
      return title ? truncate(title, 40) : '-';
    default:
      return title ? truncate(title, 40) : truncate(Object.values(data).find(v => typeof v === 'string') ?? '', 40);
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function AllDataTable() {
  const [subTab, setSubTab] = useState<SubTab>('executions');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [execPage, setExecPage] = useState(1);
  const [stepPage, setStepPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [logRunId, setLogRunId] = useState('');
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const pageSize = 20;

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [execRes] = await Promise.all([
          fetch('/api/workflow/executions?limit=100'),
        ]);
        if (!execRes.ok) throw new Error('请求失败');
        const execJson = await execRes.json();
        const execList = execJson.executions ?? [];

        const allSteps: Step[] = [];
        const allLogs: Log[] = [];
        await Promise.all(execList.map(async (exec: { execution_id: string }) => {
          try {
            const [detailRes] = await Promise.all([
              fetch(`/api/workflow/executions/${exec.execution_id}`),
            ]);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              if (detail.steps) allSteps.push(...detail.steps);
              if (detail.logs) allLogs.push(...detail.logs);
            }
          } catch { /* skip */ }
        }));

        setExecutions(execList);
        setSteps(allSteps);
        setLogs(allLogs);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const subTabs: { key: SubTab; label: string; count: number }[] = [
    { key: 'executions', label: '执行记录', count: executions.length },
    { key: 'steps', label: '节点步骤', count: steps.length },
    { key: 'logs', label: '执行日志', count: logs.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">加载全量数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-1">加载失败</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  const execPaged = executions.slice((execPage - 1) * pageSize, execPage * pageSize);
  const execTotalPages = Math.ceil(executions.length / pageSize);

  const stepPaged = steps.slice((stepPage - 1) * pageSize, stepPage * pageSize);
  const stepTotalPages = Math.ceil(steps.length / pageSize);

  const filteredLogs = logRunId ? logs.filter(l => l.execution_id === logRunId) : logs;
  const logPaged = filteredLogs.slice((logPage - 1) * pageSize, logPage * pageSize);
  const logTotalPages = Math.ceil(filteredLogs.length / pageSize);

  return (
    <div className="p-6 space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {subTabs.map(t => (
          <button key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              subTab === t.key
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ── Executions Table ── */}
      {subTab === 'executions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['工作流', '模板', '状态', '步骤', '耗时', '触发', '开始时间', '完成时间', '执行ID'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {execPaged.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{e.workflow_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{e.template_id ?? '-'}</td>
                    <td className="px-4 py-2.5">{statusBadge(e.status)}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {e.total_steps > 0 ? (
                        <span className={e.error_steps > 0 ? 'text-amber-600' : 'text-green-600'}>
                          {e.success_steps}/{e.total_steps}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDuration(e.duration_ms)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {e.trigger === 'manual' ? '手动' : e.trigger === 'scheduled' ? '定时' : e.trigger ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatTime(e.started_at)}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatTime(e.completed_at)}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs max-w-[160px] truncate" title={e.execution_id}>{e.execution_id}</td>
                  </tr>
                ))}
                {execPaged.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {execTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>共 {executions.length} 条</span>
              <div className="flex gap-2">
                <button onClick={() => setExecPage(p => Math.max(1, p - 1))} disabled={execPage <= 1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">上一页</button>
                <span>{execPage}/{execTotalPages}</span>
                <button onClick={() => setExecPage(p => Math.min(execTotalPages, p + 1))} disabled={execPage >= execTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Steps Table (with expandable detail) ── */}
      {subTab === 'steps' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['步骤#', '节点', '类型', '状态', '耗时', '执行ID', '工作流', '输出摘要', '开始时间'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stepPaged.map(s => {
                  const isExpanded = expandedStepId === s.id;
                  // Find workflow name from executions
                  const exec = executions.find(e => e.execution_id === s.execution_id);
                  return (
                  <Fragment key={s.id}>
                    <tr
                      onClick={() => setExpandedStepId(isExpanded ? null : s.id)}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{s.step_index != null ? s.step_index + 1 : '-'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s.node_label}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{s.node_type ?? '-'}</td>
                      <td className="px-4 py-2.5">{statusBadge(s.status)}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDuration(s.duration_ms)}</td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs max-w-[140px] truncate" title={s.execution_id}>{s.execution_id}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[140px] truncate">{exec?.workflow_name ?? '-'}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-xs max-w-[240px] truncate" title={summarizeOutput(s.node_id, s.output_data)}>
                        {summarizeOutput(s.node_id, s.output_data)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatTime(s.started_at)}</td>
                    </tr>
                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50/50">
                          {s.error && (
                            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-red-500 text-sm font-bold shrink-0">!</span>
                                <div>
                                  <div className="text-xs font-semibold text-red-700 mb-0.5">执行错误</div>
                                  <div className="text-sm text-red-600 font-mono break-all">{s.error}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          <NodeDetailRenderer nodeId={s.node_id} record={s} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}
                {stepPaged.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {stepTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>共 {steps.length} 条 (点击行展开详情)</span>
              <div className="flex gap-2">
                <button onClick={() => setStepPage(p => Math.max(1, p - 1))} disabled={stepPage <= 1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">上一页</button>
                <span>{stepPage}/{stepTotalPages}</span>
                <button onClick={() => setStepPage(p => Math.min(stepTotalPages, p + 1))} disabled={stepPage >= stepTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Logs Table ── */}
      {subTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">筛选执行ID:</label>
            <select
              value={logRunId}
              onChange={(e) => { setLogRunId(e.target.value); setLogPage(1); }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white max-w-[300px]"
            >
              <option value="">全部</option>
              {executions.map(e => (
                <option key={e.execution_id} value={e.execution_id}>
                  {e.workflow_name} ({truncate(e.execution_id, 25)})
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{filteredLogs.length} 条日志</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['时间', '级别', '节点', '消息'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logPaged.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs font-mono">{formatTime(l.created_at)}</td>
                      <td className="px-4 py-2">{levelBadge(l.level)}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{l.node_label ?? l.node_id ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-800 text-xs font-mono break-all max-w-[600px]">{l.message}</td>
                    </tr>
                  ))}
                  {logPaged.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">暂无日志</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {logTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                <span>共 {filteredLogs.length} 条</span>
                <div className="flex gap-2">
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage <= 1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">上一页</button>
                  <span>{logPage}/{logTotalPages}</span>
                  <button onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))} disabled={logPage >= logTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">下一页</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
