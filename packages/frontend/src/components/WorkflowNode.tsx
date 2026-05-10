import type { WorkflowNode as WorkflowNodeType, NodeStatus } from '../types';
import NodeConnector from './NodeConnector';
import { getIcon } from './Icons';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  isLast: boolean;
  execStatus?: NodeStatus;
  onSelect: (id: string) => void;
}

function NodeIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = getIcon(icon);
  return <Icon className={className} />;
}

function NodeIconWrapper({ node, execStatus }: { node: WorkflowNodeType; execStatus?: NodeStatus }) {
  if (node.type === 'start') {
    return (
      <div className="w-10 h-10 rounded-full gradient-green flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-green-200">
        <NodeIcon icon={node.icon} className="w-5 h-5" />
      </div>
    );
  }
  if (node.type === 'end') {
    return (
      <div className="w-10 h-10 rounded-full gradient-red flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-red-200">
        <NodeIcon icon={node.icon} className="w-5 h-5" />
      </div>
    );
  }
  if (!execStatus || execStatus === 'idle') {
    if (node.category === 'ai') {
      return (
        <div className="w-10 h-10 rounded-lg gradient-purple flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-purple-200">
          <NodeIcon icon={node.icon} className="w-5 h-5" />
        </div>
      );
    }
    if (node.id === 'open-amazon') {
      return (
        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <NodeIcon icon={node.icon} className="w-5 h-5" />
        </div>
      );
    }
    if (node.id === 'open-shopify') {
      return (
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
          <NodeIcon icon={node.icon} className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        <NodeIcon icon={node.icon} className="w-5 h-5" />
      </div>
    );
  }
  const statusBg: Record<string, string> = {
    running: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };
  return (
    <div className={`w-10 h-10 rounded-lg ${statusBg[execStatus] || 'bg-blue-500'} flex items-center justify-center text-white flex-shrink-0`}>
      <NodeIcon icon={node.icon} className="w-5 h-5" />
    </div>
  );
}

function StatusBadge({ status }: { status: NodeStatus }) {
  switch (status) {
    case 'running':
      return <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><div className="spinner" /></div>;
    case 'success':
      return (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
      );
    case 'error':
      return (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
      );
    default:
      return null;
  }
}

export default function WorkflowNode({ node, isSelected, isLast, execStatus, onSelect }: WorkflowNodeProps) {
  const status = execStatus || node.status;

  const borderClass = (() => {
    if (isSelected && status !== 'running') return 'border-2 border-blue-500 shadow-sm shadow-blue-100';
    if (status === 'running') return 'node-card--running';
    if (status === 'success') return 'border-2 border-green-500';
    if (status === 'error') return 'node-card--error';
    return 'border border-gray-200 hover:border-blue-300';
  })();

  return (
    <div className="relative w-full">
      <div
        className={`node-card w-full bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer ${borderClass}`}
        onClick={() => onSelect(node.id)}
      >
        <NodeIconWrapper node={node} execStatus={status === 'idle' ? undefined : status} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900">{node.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{node.description}</div>
        </div>
        {node.type === 'step' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
            </button>
            {status !== 'idle' && <StatusBadge status={status} />}
          </div>
        )}
      </div>
      {!isLast && <NodeConnector status={status} />}
    </div>
  );
}
