/**
 * 执行数据详情 —— 查看、审阅和编辑一次执行中所有步骤的数据
 *
 * 融合两种视图：
 *   View A - 表格概览：所有步骤的输入/输出字段一览
 *   View B - 卡片编辑：选中步骤的深度编辑
 */

import { useState } from 'react';
import type { ExecutionRecord } from '../types';

// ──────── Mock 数据 ────────

const mockExecution: ExecutionRecord = {
  id: 'l1',
  workflowName: '创建新品并上架到Shopify',
  executedAt: '2026-04-28 14:32:18',
  status: 'success',
  duration: '1m 23s',
  trigger: '手动',
  steps: [
    {
      nodeId: 'start',
      nodeLabel: '开始节点',
      stepIndex: 0,
      input: {},
      output: { triggeredAt: '2026-04-28T14:32:18Z', source: 'manual' },
      status: 'success',
      duration: '0.2s',
    },
    {
      nodeId: 'open-amazon',
      nodeLabel: '打开亚马逊商品页面',
      stepIndex: 1,
      input: { triggeredAt: '2026-04-28T14:32:18Z' },
      output: {
        url: 'https://amazon.com/dp/B0ABC12345',
        title: 'Wireless Bluetooth Headphones Pro',
        pageLoaded: true,
      },
      status: 'success',
      duration: '3.2s',
    },
    {
      nodeId: 'extract-info',
      nodeLabel: '提取商品信息',
      stepIndex: 2,
      input: {
        url: 'https://amazon.com/dp/B0ABC12345',
        title: 'Wireless Bluetooth Headphones Pro',
      },
      output: {
        price: '29.99',
        currency: 'USD',
        images: ['https://images.amazon.com/1.jpg', 'https://images.amazon.com/2.jpg'],
        description: 'High-quality wireless Bluetooth headphones with noise cancelling...',
        rating: 4.5,
      },
      status: 'success',
      duration: '5.8s',
    },
    {
      nodeId: 'ai-optimize',
      nodeLabel: 'AI 优化商品文案',
      stepIndex: 3,
      input: {
        title: 'Wireless Bluetooth Headphones Pro',
        description: 'High-quality wireless Bluetooth headphones with noise cancelling...',
        price: '29.99',
      },
      output: {
        optimizedTitle: 'Wireless Bluetooth Headphones Pro - 40H Battery, Deep Bass, Noise Cancelling',
        optimizedDescription: 'Experience premium sound quality with our Wireless Bluetooth Headphones Pro...',
        keywords: ['bluetooth headphones', 'wireless earbuds', 'noise cancelling'],
        targetAudience: 'Music lovers, remote workers, travelers',
      },
      status: 'success',
      duration: '12.5s',
    },
    {
      nodeId: 'open-shopify',
      nodeLabel: '打开 Shopify 后台',
      stepIndex: 4,
      input: {
        optimizedTitle: 'Wireless Bluetooth Headphones Pro - 40H Battery, Deep Bass, Noise Cancelling',
      },
      output: {
        shopifyUrl: 'https://admin.shopify.com/store/my-store/products/new',
        loginStatus: 'already_logged_in',
      },
      status: 'success',
      duration: '2.1s',
    },
    {
      nodeId: 'fill-info',
      nodeLabel: '填写商品信息',
      stepIndex: 5,
      input: {
        optimizedTitle: 'Wireless Bluetooth Headphones Pro - 40H Battery, Deep Bass, Noise Cancelling',
        optimizedDescription: 'Experience premium sound quality...',
        price: '29.99',
        images: ['https://images.amazon.com/1.jpg'],
      },
      output: {
        shopifyProductId: 'gid://shopify/Product/1234567890',
        productUrl: 'https://admin.shopify.com/store/my-store/products/1234567890',
        fieldsFilled: ['title', 'description', 'price', 'images', 'variants'],
      },
      status: 'success',
      duration: '4.5s',
    },
    {
      nodeId: 'upload-images',
      nodeLabel: '上传商品图片',
      stepIndex: 6,
      input: {
        images: ['https://images.amazon.com/1.jpg', 'https://images.amazon.com/2.jpg'],
        shopifyProductId: 'gid://shopify/Product/1234567890',
      },
      output: {
        uploadedImages: ['https://cdn.shopify.com/1.jpg', 'https://cdn.shopify.com/2.jpg'],
        uploadStatus: 'all_success',
        imagesUploaded: 2,
      },
      status: 'success',
      duration: '8.3s',
    },
    {
      nodeId: 'publish',
      nodeLabel: '发布商品',
      stepIndex: 7,
      input: {
        shopifyProductId: 'gid://shopify/Product/1234567890',
        productUrl: 'https://admin.shopify.com/store/my-store/products/1234567890',
      },
      output: {
        publishedUrl: 'https://my-store.shopify.com/products/wireless-bluetooth-headphones-pro',
        publishStatus: 'published',
        publishedAt: '2026-04-28T14:33:41Z',
      },
      status: 'success',
      duration: '2.3s',
    },
    {
      nodeId: 'end',
      nodeLabel: '结束节点',
      stepIndex: 8,
      input: {
        publishedUrl: 'https://my-store.shopify.com/products/wireless-bluetooth-headphones-pro',
      },
      output: { completedAt: '2026-04-28T14:33:41Z', result: 'success' },
      status: 'success',
      duration: '0.1s',
    },
  ],
};

// ──────── Helper: 渲染单个数据值 ────────

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return `[${value.length} 项] ${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''}`;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60);
  return String(value);
}

function renderFullValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// ──────── View A: 表格组件 ────────

function TableView({
  steps,
  selectedStep,
  onSelectStep,
}: {
  steps: ExecutionRecord['steps'];
  selectedStep: number | null;
  onSelectStep: (idx: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      {/* 表头 */}
      <div className="grid grid-cols-[32px_140px_1fr_1fr_70px_60px] min-w-[600px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
        <span>#</span>
        <span>步骤</span>
        <span>输入数据</span>
        <span>输出数据</span>
        <span className="text-center">状态</span>
        <span className="text-right">操作</span>
      </div>
      {/* 行 */}
      <div className="divide-y divide-gray-50">
        {steps.map(s => {
          const isSelected = selectedStep === s.stepIndex;
          const inputKeys = Object.keys(s.input);
          const outputKeys = Object.keys(s.output);
          return (
            <div
              key={s.nodeId}
              className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="grid grid-cols-[32px_140px_1fr_1fr_70px_60px] min-w-[600px] gap-3 px-4 py-3 items-start">
                <span className="text-xs text-gray-400 mt-0.5">{s.stepIndex}</span>
                <div>
                  <span className="text-sm font-medium text-gray-900">{s.nodeLabel}</span>
                  <span className="text-[10px] text-gray-400 block">{s.duration}</span>
                </div>
                <div className="text-xs text-gray-600 space-y-0.5 min-w-0">
                  {inputKeys.length === 0 ? (
                    <span className="text-gray-300">-</span>
                  ) : (
                    inputKeys.slice(0, 3).map(k => (
                      <div key={k} className="truncate">
                        <span className="font-medium text-gray-500">{k}:</span> {renderValue(s.input[k])}
                      </div>
                    ))
                  )}
                  {inputKeys.length > 3 && <span className="text-gray-300 text-[10px]">+{inputKeys.length - 3} 个字段</span>}
                </div>
                <div className="text-xs text-gray-600 space-y-0.5 min-w-0">
                  {outputKeys.slice(0, 3).map(k => (
                    <div key={k} className="truncate">
                      <span className="font-medium text-gray-500">{k}:</span> {renderValue(s.output[k])}
                    </div>
                  ))}
                  {outputKeys.length > 3 && <span className="text-gray-300 text-[10px]">+{outputKeys.length - 3} 个字段</span>}
                </div>
                <div className="flex justify-center">
                  {s.status === 'success' ? (
                    <span className="text-xs font-medium text-green-600">成功</span>
                  ) : (
                    <span className="text-xs font-medium text-red-600">失败</span>
                  )}
                </div>
                <div className="text-right">
                  <button
                    onClick={() => onSelectStep(s.stepIndex)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {isSelected ? '编辑中' : '编辑'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────── View B: 卡片编辑组件 ────────

function CardView({
  step,
  totalSteps,
  onPrev,
  onNext,
  onSave,
}: {
  step: ExecutionRecord['steps'][0];
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSave: (stepIndex: number, fieldType: 'input' | 'output', key: string, value: string) => void;
}) {
  const [editingInput, setEditingInput] = useState<Record<string, string>>({});
  const [editingOutput, setEditingOutput] = useState<Record<string, string>>({});

  const handleEdit = (fieldType: 'input' | 'output', key: string, value: string) => {
    if (fieldType === 'input') {
      setEditingInput(prev => ({ ...prev, [key]: value }));
    } else {
      setEditingOutput(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = () => {
    Object.entries(editingInput).forEach(([k, v]) => onSave(step.stepIndex, 'input', k, v));
    Object.entries(editingOutput).forEach(([k, v]) => onSave(step.stepIndex, 'output', k, v));
    setEditingInput({});
    setEditingOutput({});
  };

  const hasEdits = Object.keys(editingInput).length > 0 || Object.keys(editingOutput).length > 0;
  const inputKeys = Object.keys(step.input);
  const outputKeys = Object.keys(step.output);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 卡片头部 */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
            {step.stepIndex}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">{step.nodeLabel}</h3>
            <span className="text-xs text-gray-400">{step.duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">第 {step.stepIndex} / {totalSteps - 1} 步</span>
          <div className="flex gap-1">
            <button
              onClick={onPrev}
              disabled={step.stepIndex === 0}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              disabled={step.stepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 输入数据 */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">输入数据</h4>
        {inputKeys.length === 0 ? (
          <p className="text-sm text-gray-300 italic">无输入</p>
        ) : (
          <div className="space-y-2.5">
            {inputKeys.map(k => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{k}</label>
                <textarea
                  rows={2}
                  defaultValue={renderFullValue(step.input[k])}
                  onChange={e => handleEdit('input', k, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 输出数据 */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">输出数据</h4>
        <div className="space-y-2.5">
          {outputKeys.map(k => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{k}</label>
              <textarea
                rows={2}
                defaultValue={renderFullValue(step.output[k])}
                onChange={e => handleEdit('output', k, e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {hasEdits ? '有未保存的修改' : '数据未修改'}
        </span>
        <div className="flex gap-2">
          {hasEdits && (
            <button
              onClick={() => { setEditingInput({}); setEditingOutput({}); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              撤销
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasEdits}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              hasEdits ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────── 主页面 ────────

export default function ExecutionDataPage({ onBack }: { onBack?: () => void }) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const exec = mockExecution;
  const stepNodes = exec.steps.filter(s => s.nodeId !== 'start' && s.nodeId !== 'end');

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-full px-4 py-5 space-y-5">

        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                </svg>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">执行数据详情</h1>
                {exec.status === 'success' && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">成功</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{exec.workflowName} · {exec.executedAt} · 耗时 {exec.duration}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              导出 JSON
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              全部收起
            </button>
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              表格概览
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              卡片编辑
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {viewMode === 'table' ? '所有步骤输入/输出一览，点击「编辑」进入详细编辑' : '逐步骤深度编辑，可修改任意字段'}
          </span>
        </div>

        {/* View A: 表格概览（始终展示） */}
        <div className={viewMode === 'card' ? 'hidden' : ''}>
          <TableView
            steps={exec.steps}
            selectedStep={selectedStep}
            onSelectStep={setSelectedStep}
          />
        </div>

        {/* View B: 卡片编辑 */}
        {viewMode === 'card' && selectedStep !== null && (
          <CardView
            step={exec.steps[selectedStep]}
            totalSteps={exec.steps.length}
            onPrev={() => setSelectedStep(Math.max(0, selectedStep - 1))}
            onNext={() => setSelectedStep(Math.min(exec.steps.length - 1, selectedStep + 1))}
            onSave={(stepIndex, fieldType, key, value) => {
              /* mock: 只打印日志，实际应更新状态 */
              console.log(`保存: 步骤${stepIndex} ${fieldType}.${key} = ${value}`);
            }}
          />
        )}

        {viewMode === 'card' && selectedStep === null && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">请先在表格视图中点击「编辑」选择要编辑的步骤</p>
            <button
              onClick={() => setViewMode('table')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              前往表格视图
            </button>
          </div>
        )}

        {/* 数据流概览（始终显示） */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">数据流转链路</h2>
          <div className="space-y-2">
            {stepNodes.map((s, i) => {
              const outputKeys = Object.keys(s.output);
              const nextStep = stepNodes[i + 1];
              const passedKeys = nextStep ? Object.keys(nextStep.input) : [];
              const sharedKeys = passedKeys.filter(k => outputKeys.includes(k));
              return (
                <div key={s.nodeId}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      {i < stepNodes.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <span className="text-sm font-medium text-gray-900">{s.nodeLabel}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        产出: {outputKeys.join(', ')}
                      </div>
                      {sharedKeys.length > 0 && (
                        <div className="text-xs text-blue-500 mt-0.5">
                          → 传递给下一步: {sharedKeys.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
