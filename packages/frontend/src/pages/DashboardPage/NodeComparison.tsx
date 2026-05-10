import { useState, useEffect, useCallback, Fragment } from 'react';
import { NodeDetailRenderer } from './NodeDetailRenderers';

// ─── Types ──────────────────────────────────────────────────────

interface HistoryRecord {
  id: number;
  execution_id: string;
  node_id: string;
  node_label: string;
  status: string;
  duration_ms: number | null;
  output_data: Record<string, unknown>;
  input_data: Record<string, unknown> | null;
  config_data: Record<string, unknown> | null;
  error: string | null;
  node_type: string | null;
  workflow_name: string | null;
  exec_started_at: string | null;
  started_at: string;
}

// ─── 节点选项 ────────────────────────────────────────────────────

const NODE_OPTIONS = [
  { value: 'gigab2b-crawl', label: 'GigaB2B 爬取' },
  { value: 'ai-vision', label: 'AI 视觉识别' },
  { value: 'amazon-search', label: '亚马逊搜索' },
  { value: 'amazon-product', label: '亚马逊商品' },
  { value: 'xiyouzhaoci-keywords', label: '西游造词关键词' },
  { value: 'extract-info', label: '提取商品信息' },
  { value: 'ai-optimize', label: 'AI 优化标题' },
] as const;

// ─── 辅助函数 ────────────────────────────────────────────────────

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

function summarizeOutput(
  nodeId: string,
  outputData: Record<string, unknown>,
): string {
  if (!outputData || Object.keys(outputData).length === 0) return '-';

  switch (nodeId) {
    case 'ai-optimize': {
      const title = outputData.optimizedTitle as string | undefined;
      return title ? truncate(title, 60) : '-';
    }
    case 'amazon-search': {
      const keyword = outputData.keyword as string | undefined;
      const total = outputData.total as number | undefined;
      return keyword ? `关键词: ${truncate(keyword, 40)} (${total ?? 0}条)` : '-';
    }
    case 'ai-vision': {
      const firstResult = outputData.firstResult as string | undefined;
      return firstResult ? truncate(firstResult, 50) : '-';
    }
    case 'gigab2b-crawl': {
      const title = outputData.title as string | undefined;
      const images = outputData.images as string[] | undefined;
      const specs = outputData.specifications as Record<string, string> | undefined;
      if (!title) return '-';
      const parts = [truncate(title, 50)];
      if (images?.length) parts.push(`${images.length}张图片`);
      if (specs && Object.keys(specs).length) parts.push(`${Object.keys(specs).length}项规格`);
      return parts.join(' · ');
    }
    case 'amazon-product': {
      const title = outputData.title as string | undefined;
      const brand = outputData.brand as string | undefined;
      const price = outputData.price as string | undefined;
      if (!title) return '-';
      return `${brand ? brand + ' - ' : ''}${truncate(title, 40)} ${price ?? ''}`;
    }
    case 'xiyouzhaoci-keywords': {
      const keywords = outputData.keywords as string[] | undefined;
      const asin = outputData.asin as string | undefined;
      if (!keywords?.length) return asin ? `ASIN: ${asin}` : '-';
      return `${asin ? asin + ' · ' : ''}${keywords.length}个关键词`;
    }
    default: {
      const title = outputData.title as string | undefined;
      if (title) return truncate(title, 60);
      const firstValue = Object.values(outputData).find(
        (v) => typeof v === 'string',
      ) as string | undefined;
      return firstValue ? truncate(firstValue, 60) : '-';
    }
  }
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: '已完成',
    success: '成功',
    failed: '失败',
    error: '失败',
    running: '运行中',
    partial: '部分完成',
  };
  return map[status] ?? status;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'text-green-700 bg-green-50 border-green-200',
    success: 'text-green-700 bg-green-50 border-green-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    error: 'text-red-700 bg-red-50 border-red-200',
    running: 'text-blue-700 bg-blue-50 border-blue-200',
    partial: 'text-orange-700 bg-orange-50 border-orange-200',
  };
  return map[status] ?? 'text-gray-600 bg-gray-50 border-gray-200';
}

// ─── 主组件 ──────────────────────────────────────────────────────

export default function NodeComparison() {
  const [selectedNode, setSelectedNode] = useState<string>(
    NODE_OPTIONS[0].value,
  );
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (nodeId: string) => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    try {
      const res = await fetch(
        `/api/workflow/steps/${nodeId}/history?limit=20`,
      );
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      const data = json.history ?? json.data ?? json;
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(selectedNode);
  }, [selectedNode, fetchHistory]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            节点执行对比
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            查看单个节点在多次工作流运行中的执行历史，对比输出结果
          </p>
        </div>
      </div>

      {/* 节点选择器 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <label
          htmlFor="node-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          选择节点
        </label>
        <select
          id="node-select"
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {NODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">加载中...</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          加载失败: {error}
        </div>
      )}

      {/* 数据表格 */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    工作流
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    耗时
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    输出摘要
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-sm text-gray-400"
                    >
                      暂无执行记录
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const isExpanded = expandedId === record.id;
                    return (
                    <Fragment key={record.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : record.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {formatTime(record.started_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                          {record.workflow_name ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(record.status)}`}
                          >
                            {statusLabel(record.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {formatDuration(record.duration_ms ?? 0)}
                        </td>
                        <td
                          className="max-w-sm px-4 py-3 text-sm text-gray-700"
                          title={summarizeOutput(selectedNode, record.output_data)}
                        >
                          {summarizeOutput(selectedNode, record.output_data)}
                        </td>
                      </tr>
                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50/50">
                            {record.error && (
                              <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 text-sm font-bold shrink-0">!</span>
                                  <div>
                                    <div className="text-xs font-semibold text-red-700 mb-0.5">执行错误</div>
                                    <div className="text-sm text-red-600 font-mono break-all">{record.error}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <NodeDetailRenderer nodeId={selectedNode} record={record} />
                            <div className="mt-3 pt-2 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-400">
                              {record.exec_started_at && (
                                <span>工作流开始: {formatTime(record.exec_started_at)}</span>
                              )}
                              {record.execution_id && (
                                <span>执行 ID: <span className="font-mono">{truncate(record.execution_id, 30)}</span></span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
