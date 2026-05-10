import { DataBus } from './DataBus';
import type { NodeExecutor, EngineCallbacks, EngineNode, ExecutionMode } from './types';

export class WorkflowEngine {
  private executors = new Map<string, NodeExecutor>();
  private abortController: AbortController | null = null;
  private dataBus = new DataBus();
  private executionMode: ExecutionMode = 'auto';
  private nextStepResolve: (() => void) | null = null;
  private waitingNodeId: string | null = null;
  /** Called in manual mode when waiting for user to click "next step" */
  onManualWait: ((nodeId: string, nodeLabel: string) => void) | null = null;

  register(executor: NodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  registerMany(executors: NodeExecutor[]): void {
    for (const ex of executors) {
      this.register(ex);
    }
  }

  getExecutor(type: string): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  getRegisteredTypes(): string[] {
    return [...this.executors.keys()];
  }

  /** Set execution mode */
  setExecutionMode(mode: ExecutionMode): void {
    this.executionMode = mode;
  }

  /** Get current execution mode */
  getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  /** Switch to manual mode */
  switchToManualMode(): void {
    this.executionMode = 'manual';
  }

  /** Switch to auto mode and continue execution */
  switchToAutoMode(): void {
    this.executionMode = 'auto';
    if (this.nextStepResolve) {
      this.nextStepResolve();
      this.nextStepResolve = null;
      this.waitingNodeId = null;
    }
  }

  /** Manually trigger next step (manual mode) */
  triggerNextStep(): void {
    if (this.nextStepResolve && this.waitingNodeId) {
      this.nextStepResolve();
      this.nextStepResolve = null;
      this.waitingNodeId = null;
    }
  }

  /** Check if waiting for next step */
  isWaitingForNext(): boolean {
    return this.nextStepResolve !== null;
  }

  /** Get waiting node ID */
  getWaitingNodeId(): string | null {
    return this.waitingNodeId;
  }

  /** Wait for next step (manual mode) */
  private waitForNext(nodeId: string): Promise<void> {
    return new Promise((resolve) => {
      this.nextStepResolve = resolve;
      this.waitingNodeId = nodeId;
    });
  }

  /** Execute step nodes sequentially with data chaining */
  async execute(
    nodes: EngineNode[],
    callbacks: EngineCallbacks,
    startIndex = 0,
    nodeConfigs: Record<string, Record<string, unknown>> = {},
    globalConfig?: Record<string, unknown>,
    executionMode?: ExecutionMode,
  ): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const stepNodes = nodes.filter(n => n.type === 'step').slice(startIndex);
    this.dataBus.clear();

    callbacks.onProgress(0, nodes.filter(n => n.type === 'step').length);

    // Set execution mode from parameter or keep current
    if (executionMode !== undefined) {
      this.executionMode = executionMode;
    }

    // Reset waiting state
    this.nextStepResolve = null;
    this.waitingNodeId = null;

    for (let i = 0; i < stepNodes.length; i++) {
      if (signal.aborted) break;

      const node = stepNodes[i];
      const executor = this.executors.get(node.id);

      callbacks.onNodeStatus(node.id, 'running');
      callbacks.onProgress(startIndex + i + 1, nodes.filter(n => n.type === 'step').length);
      callbacks.onLog('info', node.id, node.label, `执行中: ${node.label}...`);

      // Log data reception if previous output exists
      const previousStep = stepNodes[i - 1];
      if (previousStep) {
        const prevOutput = this.dataBus.getOutput(previousStep.id);
        if (prevOutput) {
          const summary = Object.entries(prevOutput)
            .slice(0, 2)
            .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
            .join(', ');
          callbacks.onLog('info', 'system', '系统', `← 接收数据: ${summary}`);
        }
      }

      if (!executor) {
        callbacks.onNodeStatus(node.id, 'error');
        callbacks.onLog('error', node.id, node.label, `失败: 未找到节点执行器 "${node.id}"`);
        continue;
      }

      try {
        const previousOutput = i > 0 ? this.dataBus.getOutput(stepNodes[i - 1].id) : undefined;

        const output = await executor.execute({
          nodeId: node.id,
          config: { ...(nodeConfigs[node.id] ?? {}), ...globalConfig },
          input: previousOutput ?? {},
          allOutputs: this.dataBus.getAllOutputs(),
          logger: (level, msg) => callbacks.onLog(level, node.id, node.label, msg),
          abortSignal: signal,
        });

        if (signal.aborted) break;

        this.dataBus.setOutput(node.id, output);
        callbacks.onNodeStatus(node.id, 'success');
        callbacks.onNodeOutput(node.id, output);

        const outputSummary = Object.entries(output)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
          .join(', ');
        callbacks.onLog('success', node.id, node.label, `完成: ${outputSummary}`);

        // Manual mode: wait for user to click "next step" before continuing
        if (this.executionMode === 'manual' && i < stepNodes.length - 1) {
          const nextNode = stepNodes[i + 1];
          this.onManualWait?.(nextNode.id, nextNode.label);
          await this.waitForNext(nextNode.id);

          if (signal.aborted) break;
        }

      } catch (err) {
        if (signal.aborted) break;
        callbacks.onNodeStatus(node.id, 'error');
        callbacks.onLog('error', node.id, node.label, `失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }

    if (!signal.aborted) {
      callbacks.onComplete();
    }

    this.abortController = null;
  }

  /** Update a node's output in DataBus (for post-execution data enrichment) */
  updateOutput(nodeId: string, data: Record<string, unknown>): void {
    this.dataBus.setOutput(nodeId, data);
  }

  /** Cancel current execution */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  get running(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}
