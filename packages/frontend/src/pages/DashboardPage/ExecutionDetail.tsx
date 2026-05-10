/**
 * 执行详情 —— 展示单次工作流执行的完整信息
 *
 * 包含：
 *   - 顶部头部区域：返回按钮、工作流名称、状态徽章、耗时、时间戳
 *   - 水平时间线：所有节点以可点击徽章展示，带有状态图标和持续时间
 *   - 可展开的节点详情：点击节点显示输入/输出键值对及日志
 */

import { useEffect, useState } from 'react';

// ──────── 类型定义 ────────

interface StepLog {
  id: string;
  node_id: string;
  message: string;
  created_at: string;
  level: string;
}

interface ExecutionStep {
  node_id: string;
  node_label: string;
  status: string;
  duration_ms: number | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  logs: StepLog[];
  step_index: number | null;
  node_type: string | null;
  config_data: Record<string, unknown> | null;
  error: string | null;
}

interface ExecutionInfo {
  execution_id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  trigger: string;
  total_steps: number | null;
  success_steps: number | null;
  error_steps: number | null;
  completed_at: string | null;
  template_id: string | null;
}

interface ExecutionDetailResponse {
  execution: ExecutionInfo;
  steps: ExecutionStep[];
  logs: StepLog[];
}

interface ExecutionDetailProps {
  executionId: string;
  onBack: () => void;
}

// ──────── 辅助组件：键值对数据展示 ────────

function DataSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {title}
        </h4>
        <p className="text-sm text-gray-400 italic">暂无数据</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-start gap-2 text-sm"
          >
            <span className="font-medium text-gray-600 shrink-0 min-w-[120px]">
              {key}
            </span>
            <span className="text-gray-900 font-mono text-xs break-all">
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────── 辅助函数 ────────

/** 格式化数据值用于展示 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/** 格式化持续时间（毫秒 → 可读字符串） */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${remainMinutes}m`;
}

/** 格式化时间戳 */
function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

/** 获取状态标签文本和样式 */
function getStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'success':
    case 'completed':
      return {
        label: '成功',
        className: 'bg-green-50 text-green-700 border-green-200',
      };
    case 'error':
    case 'failed':
      return {
        label: '失败',
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    case 'running':
      return {
        label: '运行中',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'aborted':
      return {
        label: '已中止',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      };
    default:
      return {
        label: status,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      };
  }
}

/** 获取节点状态图标 */
function getNodeStatusIcon(status: string): {
  icon: string;
  className: string;
} {
  switch (status) {
    case 'success':
      return { icon: '✓', className: 'text-green-600' };
    case 'error':
      return { icon: '✗', className: 'text-red-600' };
    case 'running':
      return { icon: '○', className: 'text-blue-500 animate-pulse' };
    default:
      return { icon: '○', className: 'text-gray-400' };
  }
}

// ──────── 主组件 ────────

export default function ExecutionDetail({
  executionId,
  onBack,
}: ExecutionDetailProps) {
  const [data, setData] = useState<ExecutionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchExecution() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/workflow/executions/${executionId}`
        );
        if (!res.ok) {
          throw new Error(`请求失败: ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            execution: json.execution,
            steps: json.steps ?? [],
            logs: json.logs ?? [],
          } as ExecutionDetailResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchExecution();
    return () => {
      cancelled = true;
    };
  }, [executionId]);

  // 加载中状态
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">加载执行详情...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-red-600 text-xl">!</span>
          </div>
          <p className="text-sm text-red-600">
            {error ?? '无法加载执行详情'}
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const { execution, steps } = data;
  const badge = getStatusBadge(execution.status);

  // Build node_id -> node_label map for log display
  const nodeLabelMap = new Map<string, string>();
  steps.forEach(s => {
    if (s.node_id) nodeLabelMap.set(s.node_id, s.node_label);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-5 space-y-6">
        {/* ── 头部区域 ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 12H5m7-7l-7 7 7 7"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {execution.workflow_name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              耗时 {formatDuration(execution.duration_ms ?? 0)} ·{' '}
              {formatTimestamp(execution.started_at)}
              {execution.completed_at && ` → ${formatTimestamp(execution.completed_at)}`}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">
                触发: {execution.trigger === 'manual' ? '手动' : execution.trigger === 'scheduled' ? '定时' : execution.trigger ?? '-'}
              </span>
              {execution.total_steps != null && execution.total_steps > 0 && (
                <span className="text-xs text-gray-400">
                  步骤: {execution.success_steps ?? 0} 成功 / {execution.total_steps} 总计
                  {execution.error_steps != null && execution.error_steps > 0 && (
                    <span className="text-red-500 ml-1">{execution.error_steps} 失败</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 水平时间线 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            执行步骤
          </h2>
          <div className="flex items-center overflow-x-auto pb-2">
            {steps.map((step, idx) => {
              const { icon, className: iconCls } = getNodeStatusIcon(
                step.status
              );
              const isExpanded = expandedNodeId === step.node_id;

              // 确定节点徽章的背景颜色
              let badgeBg = 'bg-gray-50 border-gray-300';
              if (step.status === 'success')
                badgeBg = 'bg-green-50 border-green-400';
              else if (step.status === 'error')
                badgeBg = 'bg-red-50 border-red-400';
              else if (step.status === 'running')
                badgeBg = 'bg-blue-50 border-blue-400';

              return (
                <div key={step.node_id} className="flex items-center shrink-0">
                  {/* 节点徽章 */}
                  <button
                    onClick={() =>
                      setExpandedNodeId(
                        isExpanded ? null : step.node_id
                      )
                    }
                    className={`group flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
                      isExpanded
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : `${badgeBg} hover:shadow-md`
                    }`}
                    title={step.error ?? undefined}
                  >
                    {/* 步骤编号 */}
                    <span className="text-[9px] text-gray-400 font-mono">
                      #{(step.step_index ?? idx) + 1}
                    </span>
                    {/* 状态图标 */}
                    <span
                      className={`text-base font-bold ${iconCls}`}
                    >
                      {icon}
                    </span>
                    {/* 节点标签 */}
                    <span
                      className={`text-xs font-medium max-w-[100px] truncate ${
                        isExpanded
                          ? 'text-blue-700'
                          : 'text-gray-700'
                      }`}
                      title={step.node_label}
                    >
                      {step.node_label}
                    </span>
                    {/* 节点类型 */}
                    {step.node_type && (
                      <span className="text-[9px] text-gray-400">
                        {step.node_type}
                      </span>
                    )}
                    {/* 持续时间 */}
                    <span className="text-[10px] text-gray-400">
                      {formatDuration(step.duration_ms ?? 0)}
                    </span>
                  </button>

                  {/* 连接箭头 */}
                  {idx < steps.length - 1 && (
                    <span className="mx-2 text-gray-300 text-lg select-none">
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 展开的节点详情 ── */}
        {expandedNodeId && (() => {
          const step = steps.find(
            (s) => s.node_id === expandedNodeId
          );
          if (!step) return null;

          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 节点详情头部 */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg font-bold ${getNodeStatusIcon(step.status).className}`}
                  >
                    {getNodeStatusIcon(step.status).icon}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {step.node_label}
                    </h3>
                    <p className="text-xs text-gray-400">
                      节点 ID: {step.node_id} · 步骤 #{(step.step_index ?? steps.indexOf(step)) + 1}
                      {step.node_type && ` · 类型: ${step.node_type}`}
                      {' '}· 耗时 {formatDuration(step.duration_ms ?? 0)}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(step.status).className}`}
                >
                  {getStatusBadge(step.status).label}
                </span>
              </div>

              {/* 错误信息横幅 */}
              {step.error && (
                <div className="mx-5 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-sm font-bold shrink-0">!</span>
                    <div>
                      <div className="text-xs font-semibold text-red-700 mb-0.5">执行错误</div>
                      <div className="text-sm text-red-600 font-mono break-all">{step.error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 输入 / 输出 / 配置数据 */}
              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <DataSection
                  title="输入数据"
                  data={step.input_data}
                />
                <DataSection
                  title="输出数据"
                  data={step.output_data}
                />
                <DataSection
                  title="配置数据"
                  data={step.config_data ?? {}}
                />
              </div>

              {/* 节点日志 */}
              {step.logs.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    执行日志
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {step.logs.map((log) => {
                      let logColor = 'text-gray-600';
                      if (log.level === 'error')
                        logColor = 'text-red-600';
                      else if (log.level === 'success')
                        logColor = 'text-green-600';
                      else if (log.level === 'warn')
                        logColor = 'text-yellow-600';

                      return (
                        <div
                          key={log.id ?? `${log.created_at}-${log.message}`}
                          className="flex items-start gap-2 text-xs font-mono"
                        >
                          <span className="text-gray-400 shrink-0">
                            {formatTimestamp(log.created_at ?? '')}
                          </span>
                          {log.node_id && (
                            <span className="text-gray-400 shrink-0">
                              [{nodeLabelMap.get(log.node_id) ?? log.node_id}]
                            </span>
                          )}
                          <span className={logColor}>
                            {log.message}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
