/**
 * Pipeline Data Page — 流水线运行数据查看器
 * 支持：运行列表 → 运行详情 → 步骤数据对话框
 */

import { useState, useEffect, useCallback } from 'react';
import type { PipelineRunSummary, PipelineStepMeta } from '../types/pipeline';
import StepDataDialog from './PipelineDataPage/StepDataDialog';
import { formatDuration, formatTime } from './PipelineDataPage/FieldRenderers';

// ─── 运行列表视图 ──────────────────────────────────────────────

function RunListView({ onSelectRun }: { onSelectRun: (runId: string) => void }) {
  const [runs, setRuns] = useState<PipelineRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await fetch('/api/pipeline/runs');
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        const json = await res.json();
        setRuns(json.runs ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, []);

  const totalRuns = runs.length;
  const successRate = totalRuns > 0
    ? Math.round(runs.filter(r => r.failed === 0).length / totalRuns * 100)
    : 0;
  const avgDuration = totalRuns > 0
    ? Math.round(runs.reduce((sum, r) => sum + r.totalDurationMs, 0) / totalRuns)
    : 0;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 mb-1">总运行次数</div>
          <div className="text-2xl font-bold text-gray-900">{totalRuns}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 mb-1">成功率</div>
          <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 mb-1">平均耗时</div>
          <div className="text-2xl font-bold text-gray-900">{formatDuration(avgDuration)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            暂无运行记录。运行 `npx tsx packages/backend/integration-test/run-pipeline.ts` 生成数据。
          </div>
        )}

        {!loading && !error && runs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Run ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Product Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map(run => (
                  <tr
                    key={run.runId}
                    onClick={() => onSelectRun(run.runId)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{run.runId}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-[300px] truncate" title={run.productTitle}>
                      {run.productTitle || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {run.steps.map(s => (
                          <span
                            key={s.stepNum}
                            className={`w-2 h-2 rounded-full ${
                              s.status === 'success' ? 'bg-green-500' :
                              s.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                            title={`${s.stepName} (${s.status})`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDuration(run.totalDurationMs)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(run.startTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 运行详情视图 ──────────────────────────────────────────────

function RunDetailView({
  runId,
  onBack,
  onOpenStep,
}: {
  runId: string;
  onBack: () => void;
  onOpenStep: (step: PipelineStepMeta) => void;
}) {
  const [run, setRun] = useState<PipelineRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRun() {
      try {
        const res = await fetch(`/api/pipeline/runs/${runId}`);
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        const json = await res.json();
        setRun(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    fetchRun();
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800">← 返回列表</button>
        <div className="text-red-500 text-sm">{error || 'Run not found'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back + Run header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-sm text-gray-600">{run.runId}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">运行详情</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
            run.failed === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {run.failed === 0 ? '全部通过' : `${run.failed} 失败`}
          </span>
          {run.options.mock && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Mock</span>
          )}
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <span>耗时: <strong className="text-gray-700">{formatDuration(run.totalDurationMs)}</strong></span>
          <span>开始: <strong className="text-gray-700">{formatTime(run.startTime)}</strong></span>
          <span>结束: <strong className="text-gray-700">{formatTime(run.endTime)}</strong></span>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Pipeline 流程</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {run.steps.map((step, idx) => (
            <div key={step.stepNum} className="flex items-center gap-2">
              <button
                onClick={() => onOpenStep(step)}
                className="group flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all min-w-[100px] cursor-pointer"
              >
                <span className="text-[10px] text-gray-400 font-mono">#{step.stepNum}</span>
                <span className={`text-lg ${
                  step.status === 'success' ? 'text-green-500' :
                  step.status === 'failed' ? 'text-red-500' : 'text-gray-300'
                }`}>
                  {step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : '○'}
                </span>
                <span className="text-xs font-medium text-gray-700 max-w-[110px] truncate group-hover:text-blue-700">{step.stepName}</span>
                <span className="text-[10px] text-gray-400">{formatDuration(step.durationMs)}</span>
              </button>
              {idx < run.steps.length - 1 && (
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Product Title */}
      {run.productTitle && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product Title</div>
          <p className="text-sm text-gray-900">{run.productTitle}</p>
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────

export default function PipelineDataPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState<PipelineStepMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectRun = useCallback((runId: string) => {
    setSelectedRunId(runId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRunId(null);
  }, []);

  const handleOpenStep = useCallback((step: PipelineStepMeta) => {
    setDialogStep(step);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    // 延迟清除 step 引用，让对话框关闭动画完成
    setTimeout(() => setDialogStep(null), 200);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Pipeline 数据查看器</h1>
          <p className="text-xs text-gray-500 mt-1">浏览集成测试流水线的运行记录和步骤数据</p>
        </div>

        {selectedRunId ? (
          <RunDetailView
            runId={selectedRunId}
            onBack={handleBack}
            onOpenStep={handleOpenStep}
          />
        ) : (
          <RunListView onSelectRun={handleSelectRun} />
        )}
      </div>

      {dialogStep && selectedRunId && (
        <StepDataDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          runId={selectedRunId}
          stepNum={dialogStep.stepNum}
          stepName={dialogStep.stepName}
          stepStatus={dialogStep.status}
        />
      )}
    </div>
  );
}
