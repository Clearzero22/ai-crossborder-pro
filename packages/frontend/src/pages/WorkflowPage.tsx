import { useState } from 'react';
import NodePanel from '../components/NodePanel';
import Canvas from '../components/Canvas';
import ConfigPanel from '../components/ConfigPanel';
import { stepGuideItems } from '../data/stepGuide';
import { pluginRegistry } from '../engine/pluginRegistry';
import type { WorkflowState, WorkflowNode } from '../types';

interface WorkflowPageProps {
  state: WorkflowState;
  onSelectNode: (id: string) => void;
  onTabChange: (tab: 'config' | 'data' | 'logs') => void;
  onTestNode: (nodeId: string) => void;
  onAddNode: (pluginId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, direction: 'up' | 'down') => void;
  workflowNodes: WorkflowNode[];
  nodeConfigs: Record<string, Record<string, unknown>>;
  setNodeConfig: (nodeId: string, key: string, value: unknown) => void;
  executionMode?: 'auto' | 'manual';
  waitingNodeId?: string | null;
  onSaveStepOutput: (nodeId: string, data: Record<string, unknown>) => void;
}

/** 面板分组数据从 pluginRegistry 生成 */
const nodeGroups = pluginRegistry.getPanelGroups();

export default function WorkflowPage({ state, onSelectNode, onTabChange, onTestNode, onAddNode, onRemoveNode, onMoveNode, workflowNodes, nodeConfigs, setNodeConfig, executionMode, waitingNodeId, onSaveStepOutput }: WorkflowPageProps) {
  const [mobilePanel, setMobilePanel] = useState<'canvas' | 'nodes' | 'config'>('canvas');

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* ── Desktop: original 3-column layout ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <NodePanel
          groups={nodeGroups}
          onAddNode={onAddNode}
          workflowNodeIds={state.workflowNodeIds}
        />
        <Canvas
          nodes={workflowNodes}
          selectedNodeId={state.selectedNodeId}
          onNodeSelect={onSelectNode}
          stepGuideItems={stepGuideItems}
          nodeStatuses={state.nodeStatuses}
          disabled={!state.workflowEnabled}
          onRemoveNode={onRemoveNode}
          onMoveNode={onMoveNode}
          zoomLevel={state.zoomLevel}
          executionMode={executionMode}
          waitingNodeId={waitingNodeId}
        />
        <ConfigPanel
          selectedNodeId={state.selectedNodeId}
          activeTab={state.activeTab}
          onTabChange={onTabChange}
          nodes={workflowNodes}
          executionLogs={state.executionLogs}
          executing={state.executing}
          stepOutputs={state.stepOutputs}
          onTestNode={onTestNode}
          nodeConfigs={nodeConfigs}
          setNodeConfig={setNodeConfig}
          onSaveStepOutput={onSaveStepOutput}
        />
      </div>

      {/* ── Mobile: Canvas (always rendered, full width) ── */}
      <div className="flex-1 flex lg:hidden overflow-hidden">
        <Canvas
          nodes={workflowNodes}
          selectedNodeId={state.selectedNodeId}
          onNodeSelect={onSelectNode}
          stepGuideItems={stepGuideItems}
          nodeStatuses={state.nodeStatuses}
          disabled={!state.workflowEnabled}
          onRemoveNode={onRemoveNode}
          onMoveNode={onMoveNode}
          zoomLevel={state.zoomLevel}
          executionMode={executionMode}
          waitingNodeId={waitingNodeId}
        />
      </div>

      {/* ── Mobile: NodePanel overlay ── */}
      {mobilePanel === 'nodes' && (
        <div className="lg:hidden absolute inset-0 z-30 bg-white dark:bg-black">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">节点面板</h2>
            <button
              onClick={() => setMobilePanel('canvas')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <NodePanel
            groups={nodeGroups}
            onAddNode={(pluginId) => {
              onAddNode(pluginId);
              setMobilePanel('canvas');
            }}
            workflowNodeIds={state.workflowNodeIds}
          />
        </div>
      )}

      {/* ── Mobile: ConfigPanel overlay ── */}
      {mobilePanel === 'config' && (
        <div className="lg:hidden absolute inset-0 z-30 bg-white dark:bg-black">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">配置面板</h2>
            <button
              onClick={() => setMobilePanel('canvas')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ConfigPanel
            selectedNodeId={state.selectedNodeId}
            activeTab={state.activeTab}
            onTabChange={onTabChange}
            nodes={workflowNodes}
            executionLogs={state.executionLogs}
            executing={state.executing}
            stepOutputs={state.stepOutputs}
            onTestNode={onTestNode}
            nodeConfigs={nodeConfigs}
            setNodeConfig={setNodeConfig}
            onSaveStepOutput={onSaveStepOutput}
          />
        </div>
      )}

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 z-40 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => setMobilePanel('nodes')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              mobilePanel === 'nodes'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
            </svg>
            <span className="text-[10px] font-medium">节点</span>
          </button>

          <button
            onClick={() => setMobilePanel('canvas')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              mobilePanel === 'canvas'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
            <span className="text-[10px] font-medium">画布</span>
          </button>

          <button
            onClick={() => setMobilePanel('config')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              mobilePanel === 'config'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[10px] font-medium">配置</span>
          </button>
        </div>
      </div>
    </div>
  );
}
