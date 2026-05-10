import { useRef, useEffect } from 'react';
import type { WorkflowNode, StepGuideItem, NodeStatus } from '../types';
import WorkflowNodeComponent from './WorkflowNode';
import StepGuide from './StepGuide';

interface CanvasProps {
  nodes: WorkflowNode[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  stepGuideItems: StepGuideItem[];
  nodeStatuses: Record<string, NodeStatus>;
  disabled?: boolean;
  onRemoveNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, direction: 'up' | 'down') => void;
  zoomLevel: number;
  executionMode?: 'auto' | 'manual';
  waitingNodeId?: string | null;
}

export default function Canvas({ nodes, selectedNodeId, onNodeSelect, stepGuideItems, nodeStatuses, disabled, onRemoveNode, onMoveNode, zoomLevel, executionMode, waitingNodeId }: CanvasProps) {
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runningNodeId = nodes.find(n => nodeStatuses[n.id] === 'running')?.id;
    if (runningNodeId) {
      const el = nodeRefs.current.get(runningNodeId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [nodeStatuses, nodes]);

  return (
    <div ref={scrollContainerRef} className="flex-1 bg-gray-50 relative overflow-auto flex flex-col">
      {disabled && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
          <div className="text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-sm font-medium text-gray-400">工作流已停用</p>
            <p className="text-xs text-gray-400 mt-1">请在右上角开启工作流后编辑</p>
          </div>
        </div>
      )}

      {/* Manual mode waiting indicator */}
      {executionMode === 'manual' && waitingNodeId && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">等待下一步操作</span>
        </div>
      )}

      <div className="flex-1 flex items-start justify-center pt-8 pb-12 px-4 lg:pt-48 lg:px-8 min-h-min">
        <div className="flex flex-col items-center gap-0 w-64 lg:w-80" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
          {nodes.map((node, index) => (
            <div
              key={node.id}
              ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
              className={`relative ${index > 0 ? 'mt-8' : ''} group`}
            >
              {/* 删除/移动按钮（hover 显示，start/end 不显示删除） */}
              {onRemoveNode && node.id !== 'start' && node.id !== 'end' && (
                <div className="absolute -right-8 top-0 flex flex-col gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                  {onMoveNode && index > 1 && (
                    <button
                      onClick={() => onMoveNode(node.id, 'up')}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm"
                      title="上移"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  {onMoveNode && index < nodes.length - 2 && (
                    <button
                      onClick={() => onMoveNode(node.id, 'down')}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm"
                      title="下移"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveNode(node.id)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-300 shadow-sm"
                    title="删除节点"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <WorkflowNodeComponent
                node={node}
                isSelected={selectedNodeId === node.id}
                isLast={index === nodes.length - 1}
                execStatus={nodeStatuses[node.id]}
                onSelect={onNodeSelect}
              />
            </div>
          ))}
        </div>
      </div>
      <StepGuide items={stepGuideItems} />
    </div>
  );
}
