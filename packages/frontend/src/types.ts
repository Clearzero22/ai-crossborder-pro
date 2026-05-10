export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'browser' | 'ai' | 'data' | 'flow';
  type: 'start' | 'end' | 'step';
  status: NodeStatus;
  url?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

export interface NodeGroup {
  id: string;
  label: string;
  icon?: string;
  color: string;
  items: NodePanelItem[];
}

export interface NodePanelItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface StepGuideItem {
  step: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface PlanInfo {
  plan: string;
  usage: { current: number; total: number };
  expiry: string;
}

export interface ConfigSection {
  id: string;
  title: string;
  fields: ConfigField[];
}

export interface ConfigField {
  type: 'select' | 'text' | 'checkbox' | 'text-area';
  label: string;
  value: string | boolean;
  options?: { label: string; value: string }[];
}

export interface LogEntry {
  id: string;
  nodeId: string;
  nodeLabel: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'success' | 'error';
}

export interface StepOutput {
  nodeId: string;
  nodeLabel: string;
  data: Record<string, unknown>;
  summary: string;
}

/** 一次执行中单个步骤的完整数据记录 */
export interface StepRecord {
  nodeId: string;
  nodeLabel: string;
  stepIndex: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'success' | 'error';
  duration: string;
}

/** 一次执行的完整数据记录 */
export interface ExecutionRecord {
  id: string;
  workflowName: string;
  executedAt: string;
  status: 'success' | 'error' | 'running';
  duration: string;
  trigger: string;
  steps: StepRecord[];
  modifiedAt?: string;
  errorMsg?: string;
}

export interface WorkflowState {
  selectedNodeId: string | null;
  zoomLevel: number;
  workflowEnabled: boolean;
  activeTab: 'config' | 'data' | 'logs';
  navActiveId: string;
  sidebarCollapsed: boolean;
  executing: boolean;
  currentStep: number;
  totalSteps: number;
  nodeStatuses: Record<string, NodeStatus>;
  stepOutputs: Record<string, StepOutput>;
  executionLogs: LogEntry[];
  /** 工作流中节点的有序 ID 列表（用户可添加/删除/排序） */
  workflowNodeIds: string[];
  /** 当前加载的模板 ID */
  activeTemplateId: string | null;
  /** 执行模式：auto = 自动连续执行，manual = 手动单步执行 */
  executionMode: 'auto' | 'manual';
  /** 是否在等待用户触发下一步（仅手动模式） */
  waitingForNext: boolean;
  /** 当前等待执行的节点 ID（仅手动模式） */
  waitingNodeId: string | null;
}
