/** Schema definition for a single configuration or data field */
export interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret' | 'object';
  label: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
}

/** Runtime context passed to each node executor */
export interface NodeContext {
  nodeId: string;
  config: Record<string, unknown>;
  input: Record<string, unknown>;
  /** All upstream node outputs keyed by node ID */
  allOutputs: Record<string, Record<string, unknown>>;
  logger: (level: 'info' | 'success' | 'error', message: string) => void;
  abortSignal: AbortSignal;
}

/** A registered node executor — the core unit of work */
export interface NodeExecutor {
  type: string;
  label: string;
  icon: string;
  category: 'browser' | 'ai' | 'data' | 'flow';

  inputSchema: Record<string, FieldDef>;
  outputSchema: Record<string, FieldDef>;
  configSchema: Record<string, FieldDef>;

  execute(ctx: NodeContext): Promise<Record<string, unknown>>;
}

/** Execution mode for workflow */
export type ExecutionMode = 'auto' | 'manual';

/** Events emitted by WorkflowEngine during execution */
export interface EngineCallbacks {
  onNodeStatus: (nodeId: string, status: 'idle' | 'running' | 'success' | 'error') => void;
  onNodeOutput: (nodeId: string, output: Record<string, unknown>) => void;
  onLog: (level: 'info' | 'success' | 'error', nodeId: string, nodeLabel: string, message: string) => void;
  onProgress: (current: number, total: number) => void;
  onComplete: () => void;
  /** Called when waiting for user to trigger next step (manual mode) */
  onWaitForNext?: (nodeId: string) => void;
  /** Called when execution mode changes */
  onModeChange?: (mode: ExecutionMode) => void;
}

/** A node definition as the engine sees it */
export interface EngineNode {
  id: string;
  label: string;
  type: 'start' | 'end' | 'step';
}
