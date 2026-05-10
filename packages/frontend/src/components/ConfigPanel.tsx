import { useState } from 'react';
import type { WorkflowNode, LogEntry, StepOutput } from '../types';
import ConfigTabs from './ConfigTabs';
import NodeInfoHeader from './NodeInfoHeader';
import ConfigSectionComponent from './ConfigSection';
import TestButton from './TestButton';
import { defaultConfigSections } from '../data/configData';
import { pluginRegistry } from '../engine/pluginRegistry';
import type { FieldDef } from '../engine/types';

interface ConfigPanelProps {
  selectedNodeId: string | null;
  activeTab: 'config' | 'data' | 'logs';
  onTabChange: (tab: 'config' | 'data' | 'logs') => void;
  nodes: WorkflowNode[];
  executionLogs: LogEntry[];
  executing: boolean;
  stepOutputs: Record<string, StepOutput>;
  onTestNode: (nodeId: string) => void;
  nodeConfigs: Record<string, Record<string, unknown>>;
  setNodeConfig: (nodeId: string, key: string, value: unknown) => void;
  onSaveStepOutput: (nodeId: string, data: Record<string, unknown>) => void;
}

const logColors: Record<string, string> = {
  info: 'text-blue-600',
  success: 'text-green-600',
  error: 'text-red-600',
};

const logBg: Record<string, string> = {
  info: 'bg-blue-50',
  success: 'bg-green-50',
  error: 'bg-red-50',
};

const nodeColorMap: Record<string, { border: string; dot: string }> = {
  blue:    { border: 'border-l-blue-500', dot: 'bg-blue-500' },
  purple:  { border: 'border-l-purple-500', dot: 'bg-purple-500' },
  orange:  { border: 'border-l-orange-500', dot: 'bg-orange-500' },
  green:   { border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  red:     { border: 'border-l-red-500', dot: 'bg-red-500' },
  gray:    { border: 'border-l-gray-400', dot: 'bg-gray-400' },
};

/** 根据 nodeId 查找节点的 panelColor */
function getNodeColor(_nodes: WorkflowNode[], nodeId: string): string {
  const plugin = pluginRegistry.get(nodeId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (plugin as any)?.panelColor || 'gray';
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** 查找当前节点的上游节点 ID */
function findPrevNodeId(nodes: WorkflowNode[], selectedNodeId: string): string | null {
  const idx = nodes.findIndex(n => n.id === selectedNodeId);
  if (idx <= 0) return null;
  return nodes[idx - 1].id;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/** AI 识别结果卡片列表 */
function AiResultsCards({ results }: { results: string[] }) {
  return (
    <div className="space-y-2">
      {results.map((text, i) => {
        const isError = text.startsWith('[错误]');
        return (
          <div key={i} className={`p-2.5 rounded-lg border ${isError ? 'border-red-200 bg-red-50' : 'border-purple-100 bg-purple-50'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-semibold ${isError ? 'text-red-500' : 'text-purple-500'}`}>
                图片 {i + 1}
              </span>
              {isError && <span className="text-[10px] text-red-400">失败</span>}
            </div>
            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isError ? 'text-red-600' : 'text-gray-700'}`}>
              {text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Render node-specific config fields from plugin configSchema */
function NodeConfigFields({
  nodeId,
  configSchema,
  nodeConfigs,
  setNodeConfig,
}: {
  nodeId: string;
  configSchema: Record<string, FieldDef>;
  nodeConfigs: Record<string, Record<string, unknown>>;
  setNodeConfig: (nodeId: string, key: string, value: unknown) => void;
}) {
  const fields = Object.entries(configSchema);
  if (fields.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-purple-500 rounded-full" />
        <h4 className="text-sm font-semibold text-gray-900">节点配置</h4>
      </div>
      <div className="space-y-3">
        {fields.map(([key, field]) => {
          const currentValue = nodeConfigs[nodeId]?.[key] ?? field.default ?? '';
          const isRequired = field.required;

          if (field.type === 'boolean') {
            return (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentValue)}
                  onChange={e => setNodeConfig(nodeId, key, e.target.checked)}
                  className="custom-checkbox"
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </label>
            );
          }

          if (field.type === 'select' && field.options) {
            return (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1.5">
                  {field.label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <select
                  value={String(currentValue)}
                  onChange={e => setNodeConfig(nodeId, key, e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === 'number') {
            return (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1.5">
                  {field.label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type="number"
                  value={String(currentValue)}
                  onChange={e => setNodeConfig(nodeId, key, Number(e.target.value))}
                  className="w-full pl-3 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            );
          }

          // Default: string / text / secret
          return (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1.5">
                {field.label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={field.type === 'secret' ? 'password' : 'text'}
                value={String(currentValue)}
                onChange={e => setNodeConfig(nodeId, key, e.target.value)}
                className="w-full pl-3 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CustomField {
  key: string;
  value: string;
}

/** 步骤数据标签页内容 */
function DataTabContent({
  selectedNode,
  prevNodeId,
  stepOutputs,
  nodes,
  onSaveStepOutput,
}: {
  selectedNode: WorkflowNode | undefined;
  prevNodeId: string | null;
  stepOutputs: Record<string, StepOutput>;
  nodes: WorkflowNode[];
  onSaveStepOutput: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  if (!selectedNode) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        请选择一个节点查看步骤数据
      </div>
    );
  }

  // 当前节点的输出
  const output = selectedNode.id ? stepOutputs[selectedNode.id] : undefined;
  // 上游节点的输出 = 当前节点的输入
  const prevOutput = prevNodeId ? stepOutputs[prevNodeId] : undefined;
  const inputData = prevOutput?.data || {};
  const outputData = output?.data || {};
  const hasData = Object.keys(inputData).length > 0 || Object.keys(outputData).length > 0;

  if (!hasData) {
    return (
      <div className="py-8 text-center space-y-2">
        <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-400">暂无可用的步骤数据</p>
        <p className="text-xs text-gray-300">执行工作流后将自动记录每个步骤的输入输出数据</p>
      </div>
    );
  }

  const handleEdit = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    setCustomFields(prev => prev.map((cf, i) =>
      i === index ? { ...cf, [field]: val } : cf
    ));
  };

  const handleSave = () => {
    const merged: Record<string, unknown> = { ...outputData };

    // Apply textarea edits to output fields
    for (const [editKey, editValue] of Object.entries(edits)) {
      if (editKey.startsWith('output_')) {
        const fieldName = editKey.slice(7);
        merged[fieldName] = editValue;
      }
    }

    // Merge custom fields
    for (const cf of customFields) {
      if (cf.key.trim()) {
        merged[cf.key.trim()] = cf.value;
      }
    }

    onSaveStepOutput(selectedNode.id, merged);
    setEdits({});
    setCustomFields([]);
  };

  const hasChanges = Object.keys(edits).length > 0 || customFields.length > 0;

  return (
    <div className="space-y-4">
      {/* 节点信息 */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="text-xs text-gray-400">#{nodes.findIndex(n => n.id === selectedNode.id)}</span>
        <span className="text-sm font-medium text-gray-900">{selectedNode.label}</span>
      </div>

      {/* 输入数据 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">输入数据</h4>
          {prevNodeId && <span className="text-[10px] text-gray-400">来自 {nodes.find(n => n.id === prevNodeId)?.label || prevNodeId}</span>}
        </div>
        {Object.keys(inputData).length === 0 ? (
          <p className="text-xs text-gray-300 italic pl-5">无输入（起始节点）</p>
        ) : (
          <div className="space-y-1.5 pl-5">
            {Object.entries(inputData).map(([k, v]) => (
              <div key={k}>
                <label className="block text-[10px] font-mono text-gray-500 mb-0.5">{k}</label>
                <textarea
                  rows={1}
                  defaultValue={renderValue(v)}
                  onChange={e => handleEdit(`input_${k}`, e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 输出数据 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">输出数据</h4>
        </div>
        {Object.keys(outputData).length === 0 ? (
          <p className="text-xs text-gray-300 italic pl-5">暂无输出</p>
        ) : Array.isArray(outputData.results) ? (
          <div className="pl-5">
            <AiResultsCards results={outputData.results as string[]} />
            {Object.entries(outputData)
              .filter(([k]) => k !== 'results')
              .map(([k, v]) => (
                <div key={k} className="mt-2">
                  <label className="block text-[10px] font-mono text-gray-500 mb-0.5">{k}</label>
                  <textarea
                    rows={1}
                    defaultValue={renderValue(v)}
                    onChange={e => handleEdit(`output_${k}`, e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                  />
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-1.5 pl-5">
            {Object.entries(outputData).map(([k, v]) => (
              <div key={k}>
                <label className="block text-[10px] font-mono text-gray-500 mb-0.5">{k}</label>
                <textarea
                  rows={1}
                  defaultValue={renderValue(v)}
                  onChange={e => handleEdit(`output_${k}`, e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 自定义字段 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">自定义字段</h4>
          <button
            onClick={handleAddCustomField}
            className="ml-auto text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            添加
          </button>
        </div>
        {customFields.length === 0 && (
          <p className="text-xs text-gray-300 italic pl-5">点击"添加"以补充自定义数据字段</p>
        )}
        <div className="space-y-2 pl-5">
          {customFields.map((cf, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <input
                type="text"
                placeholder="字段名"
                value={cf.key}
                onChange={e => handleCustomFieldChange(i, 'key', e.target.value)}
                className="w-24 px-2 py-1 text-xs font-mono text-gray-700 bg-amber-50 border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <textarea
                rows={1}
                placeholder="值"
                value={cf.value}
                onChange={e => handleCustomFieldChange(i, 'value', e.target.value)}
                className="flex-1 px-2 py-1 text-xs font-mono text-gray-700 bg-amber-50 border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <button
                onClick={() => handleRemoveCustomField(i)}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 mt-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { setEdits({}); setCustomFields([]); }}
            className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            撤销
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            保存修改
          </button>
        </div>
      )}
    </div>
  );
}

export default function ConfigPanel({ selectedNodeId, activeTab, onTabChange, nodes, executionLogs, executing, stepOutputs, onTestNode, nodeConfigs, setNodeConfig, onSaveStepOutput }: ConfigPanelProps) {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const prevNodeId = findPrevNodeId(nodes, selectedNodeId || '');
  const selectedOutput = selectedNodeId ? stepOutputs[selectedNodeId] : undefined;
  const selectedPlugin = selectedNodeId ? pluginRegistry.get(selectedNodeId) : undefined;
  const configSchema = selectedPlugin?.executor.configSchema ?? {};

  return (
    <div className="w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
      <ConfigTabs activeTab={activeTab} onChange={onTabChange} />

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {activeTab === 'config' && (
          <>
            <NodeInfoHeader node={selectedNode} output={selectedOutput} />
            {selectedNodeId && Object.keys(configSchema).length > 0 && (
              <NodeConfigFields
                nodeId={selectedNodeId}
                configSchema={configSchema}
                nodeConfigs={nodeConfigs}
                setNodeConfig={setNodeConfig}
              />
            )}
            <ConfigSectionComponent section={defaultConfigSections[0]} />
            <ConfigSectionComponent section={defaultConfigSections[1]} />

            <div className="mb-6">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-4 h-4 transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium">高级设置</span>
              </button>
            </div>

            <TestButton
              disabled={executing || !selectedNodeId}
              onTest={() => selectedNodeId && onTestNode(selectedNodeId)}
            />
          </>
        )}

        {activeTab === 'data' && (
          <DataTabContent
            selectedNode={selectedNode}
            prevNodeId={prevNodeId}
            stepOutputs={stepOutputs}
            nodes={nodes}
            onSaveStepOutput={onSaveStepOutput}
          />
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1.5">
            {executionLogs.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                暂无运行日志
              </div>
            ) : (
              executionLogs.map(log => {
                const color = getNodeColor(nodes, log.nodeId);
                const colorStyle = nodeColorMap[color] || nodeColorMap.gray;
                return (
                  <div key={log.id} className={`text-xs p-2.5 rounded-lg border-l-[3px] ${logBg[log.level] || 'bg-gray-50'} ${colorStyle.border}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot}`} />
                      <span className={`font-medium ${logColors[log.level]}`}>{log.nodeLabel}</span>
                      <span className="text-gray-400 ml-auto">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-gray-600 pl-3.5">{log.message}</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
