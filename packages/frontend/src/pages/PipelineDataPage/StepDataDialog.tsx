/**
 * Step Data Dialog — 步骤数据查看对话框
 * 支持 Input / Output 切换，根据步骤类型渲染不同字段
 */

import { useState, useEffect, useCallback } from 'react';
import { classifyStepFields, FieldRenderer } from './FieldRenderers';

interface StepDataDialogProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  stepNum: number;
  stepName: string;
  stepStatus: 'success' | 'failed' | 'skipped';
}

export default function StepDataDialog({ open, onClose, runId, stepNum, stepName, stepStatus }: StepDataDialogProps) {
  const [tab, setTab] = useState<'input' | 'output'>('output');
  const [inputData, setInputData] = useState<Record<string, unknown> | null>(null);
  const [outputData, setOutputData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [inputRes, outputRes] = await Promise.all([
        fetch(`/api/pipeline/runs/${runId}/steps/${stepNum}/input`),
        fetch(`/api/pipeline/runs/${runId}/steps/${stepNum}/output`),
      ]);

      const input = inputRes.ok ? await inputRes.json() : null;
      const output = outputRes.ok ? await outputRes.json() : null;

      setInputData(input);
      setOutputData(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [runId, stepNum]);

  useEffect(() => {
    if (open) {
      setTab('output');
      fetchData();
    }
  }, [open, fetchData]);

  if (!open) return null;

  const statusConfig = {
    success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: '✓' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: '✗' },
    skipped: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: '○' },
  };
  const status = statusConfig[stepStatus];
  const currentData = tab === 'input' ? inputData : outputData;
  const fields = currentData ? classifyStepFields(currentData, stepNum, tab) : [];
  const hasInput = inputData && Object.keys(inputData).length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400">Step {stepNum}</span>
            <h3 className="text-base font-semibold text-gray-900">{stepName}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}>
              {status.icon} {stepStatus}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('output')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'output' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Output
            </button>
            {hasInput && (
              <button
                onClick={() => setTab('input')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === 'input' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Input
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-400 ml-auto">
            {currentData ? `${Object.keys(currentData).length} 字段` : ''}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <span className="text-sm text-red-500">{error}</span>
              <button
                onClick={fetchData}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && currentData && (
            <div className="space-y-5">
              {fields.map(field => (
                <FieldRenderer key={field.key} field={field} />
              ))}
            </div>
          )}

          {!loading && !error && !currentData && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              该步骤无 {tab} 数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
