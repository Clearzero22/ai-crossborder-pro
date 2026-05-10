import { useState, useCallback, useRef } from 'react';
import type { WorkflowState, LogEntry, WorkflowNode } from '../types';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { pluginRegistry } from '../engine/pluginRegistry';
import type { EngineCallbacks } from '../engine/types';
import { usePlanContext } from '../context/PlanContext';
import { useSoundSettings } from './useSoundSettings';
import { playNodeComplete, playWorkflowComplete, playError } from '../utils/playSound';
import { getTemplateById, workflowTemplates } from '../data/templates';

// ─── 执行数据持久化 ──────────────────────────────────────────

async function persist(url: string, body: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: url.includes('/complete') ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { /* fire-and-forget */ }
}

function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date();
}

function generateSummary(nodeId: string, data: Record<string, unknown>, nodes: WorkflowNode[]): string {
  const node = nodes.find(n => n.id === nodeId);
  const entries = Object.entries(data);
  if (entries.length === 0) return `完成: ${node?.label || nodeId}`;
  const parts = entries.slice(0, 2).map(([k, v]) => {
    const val = Array.isArray(v) ? `[${v.length}项]` : String(v).slice(0, 40);
    return `${k}: ${val}`;
  });
  return parts.join(', ');
}

/** 默认节点顺序（从插件注册表获取，确保 start/end 在首尾） */
function defaultWorkflowNodeIds(): string[] {
  return pluginRegistry.getWorkflowNodes().map(n => n.id);
}

const initialState: WorkflowState = {
  selectedNodeId: 'open-amazon',
  zoomLevel: 100,
  workflowEnabled: true,
  activeTab: 'config',
  navActiveId: 'workflow',
  sidebarCollapsed: false,
  executing: false,
  currentStep: 0,
  totalSteps: 0,
  nodeStatuses: {},
  stepOutputs: {},
  executionLogs: [],
  workflowNodeIds: [],
  activeTemplateId: null,
  executionMode: 'auto',
  waitingForNext: false,
  waitingNodeId: null,
};

export function useWorkflowState() {
  const { checkLimit } = usePlanContext();
  const [state, setState] = useState<WorkflowState>(() => ({
    ...initialState,
    workflowNodeIds: defaultWorkflowNodeIds(),
    activeTemplateId: workflowTemplates[0].id,
  }));
  const [headless, setHeadless] = useState(true);
  const engineRef = useRef<WorkflowEngine | null>(null);
  const cancelledRef = useRef(false);
  const executionIdRef = useRef<string>('');
  const stepIndexRef = useRef<number>(0);
  const stepTimingsRef = useRef<Record<string, number>>({});
  const executionStartTimeRef = useRef<number>(0);

  // Initialize nodeConfigs from plugin configSchema defaults
  function buildDefaultConfigs(): Record<string, Record<string, unknown>> {
    const configs: Record<string, Record<string, unknown>> = {};
    for (const plugin of pluginRegistry.getAll()) {
      const schema = plugin.executor.configSchema;
      const entries = Object.entries(schema);
      if (entries.length === 0) continue;
      configs[plugin.id] = {};
      for (const [key, field] of entries) {
        if (field.default !== undefined) {
          configs[plugin.id][key] = field.default;
        }
      }
    }
    return configs;
  }

  const defaultConfigs = buildDefaultConfigs();
  const nodeConfigsRef = useRef<Record<string, Record<string, unknown>>>(defaultConfigs);
  const [nodeConfigs, setNodeConfigsState] = useState<Record<string, Record<string, unknown>>>(defaultConfigs);
  const { settings: soundSettings } = useSoundSettings();

  // 根据 workflowNodeIds 从插件注册表查找节点定义
  const workflowNodes = state.workflowNodeIds
    .map(id => pluginRegistry.get(id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined)
    .map(plugin => ({
      id: plugin.id,
      label: plugin.label,
      description: plugin.description,
      icon: plugin.icon,
      category: plugin.category,
      type: plugin.nodeType,
      status: 'idle' as const,
    }));
  const stepNodeCount = workflowNodes.filter(n => n.type === 'step').length;

  // Initialize engine once
  if (!engineRef.current) {
    const engine = new WorkflowEngine();
    engine.registerMany(pluginRegistry.getExecutors());
    engineRef.current = engine;
  }

  const addNode = useCallback((pluginId: string) => {
    setState(prev => {
      if (prev.workflowNodeIds.includes(pluginId)) return prev; // 不能重复添加
      // 在选中节点之后插入，或在 end 节点之前插入
      const endIdx = prev.workflowNodeIds.indexOf('end');
      const selIdx = prev.selectedNodeId ? prev.workflowNodeIds.indexOf(prev.selectedNodeId) : -1;
      const insertAt = selIdx >= 0 ? selIdx + 1 : (endIdx >= 0 ? endIdx : prev.workflowNodeIds.length);
      const newIds = [...prev.workflowNodeIds];
      newIds.splice(insertAt, 0, pluginId);
      return {
        ...prev,
        workflowNodeIds: newIds,
        selectedNodeId: pluginId,
      };
    });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setState(prev => {
      if (nodeId === 'start' || nodeId === 'end') return prev; // 保护首尾节点
      const newIds = prev.workflowNodeIds.filter(id => id !== nodeId);
      return {
        ...prev,
        workflowNodeIds: newIds,
        selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
      };
    });
  }, []);

  const moveNode = useCallback((nodeId: string, direction: 'up' | 'down') => {
    setState(prev => {
      const idx = prev.workflowNodeIds.indexOf(nodeId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.workflowNodeIds.length) return prev;
      // 不能越过 start 和 end
      if (prev.workflowNodeIds[targetIdx] === 'start' || prev.workflowNodeIds[targetIdx] === 'end') return prev;
      const newIds = [...prev.workflowNodeIds];
      [newIds[idx], newIds[targetIdx]] = [newIds[targetIdx], newIds[idx]];
      return { ...prev, workflowNodeIds: newIds };
    });
  }, []);

  const setNodeConfig = useCallback((nodeId: string, key: string, value: unknown) => {
    nodeConfigsRef.current = {
      ...nodeConfigsRef.current,
      [nodeId]: { ...nodeConfigsRef.current[nodeId], [key]: value },
    };
    setNodeConfigsState({ ...nodeConfigsRef.current });
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setState(prev => ({
      ...prev,
      executionLogs: [
        { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: now() },
        ...prev.executionLogs,
      ].slice(0, 100),
    }));
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  const setZoom = useCallback((level: number) => {
    setState(prev => ({ ...prev, zoomLevel: Math.max(25, Math.min(200, level)) }));
  }, []);

  const toggleWorkflow = useCallback(() => {
    setState(prev => ({ ...prev, workflowEnabled: !prev.workflowEnabled }));
  }, []);

  const setActiveTab = useCallback((tab: 'config' | 'data' | 'logs') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setNavActive = useCallback((id: string) => {
    setState(prev => ({ ...prev, navActiveId: id }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const switchExecutionMode = useCallback((mode: 'auto' | 'manual') => {
    if (mode === 'manual') {
      engineRef.current?.switchToManualMode();
    } else {
      engineRef.current?.switchToAutoMode();
    }
    setState(prev => ({ ...prev, executionMode: mode, waitingForNext: false, waitingNodeId: null }));
    addLog({
      nodeId: 'system',
      nodeLabel: '系统',
      message: mode === 'manual' ? '切换到手动单步模式' : '切换到自动连续模式',
      level: 'info',
    });
  }, [state.executionMode]);

  const updateStepOutput = useCallback((nodeId: string, data: Record<string, unknown>) => {
    engineRef.current?.updateOutput(nodeId, data);
    setState(prev => ({
      ...prev,
      stepOutputs: {
        ...prev.stepOutputs,
        [nodeId]: {
          ...prev.stepOutputs[nodeId],
          data,
        },
      },
    }));
  }, []);

  const triggerNextStep = useCallback(() => {
    engineRef.current?.triggerNextStep();
    setState(prev => ({ ...prev, waitingForNext: false, waitingNodeId: null }));
  }, []);

  const startExecution = useCallback(() => {
    const limitCheck = checkLimit('workflow-execution');
    if (!limitCheck.allowed) {
      // 显示错误提示
      alert(limitCheck.reason || '执行次数不足');
      return;
    }

    setState(prev => {
      if (prev.executing) return prev;
      return {
        ...prev,
        executing: true,
        currentStep: 0,
        totalSteps: stepNodeCount,
        activeTab: 'logs',
        executionLogs: [],
        nodeStatuses: Object.fromEntries(workflowNodes.map(n => [n.id, 'idle'] as const)),
        stepOutputs: {},
      };
    });
    addLog({ nodeId: 'system', nodeLabel: '系统', message: '工作流开始执行', level: 'info' });

    cancelledRef.current = false;
    executionIdRef.current = generateExecutionId();
    stepIndexRef.current = 0;
    stepTimingsRef.current = {};
    executionStartTimeRef.current = Date.now();
    const activeTemplate = state.activeTemplateId ? getTemplateById(state.activeTemplateId) : null;
    persist('/api/workflow/executions', {
      execution_id: executionIdRef.current,
      template_id: state.activeTemplateId,
      workflow_name: activeTemplate?.name || '自定义工作流',
      trigger: 'manual',
    });
    const engine = engineRef.current!;

    const callbacks: EngineCallbacks = {
      onNodeStatus: (nodeId, status) => {
        if (status === 'running') stepTimingsRef.current[nodeId] = Date.now();
        if (status === 'success' && soundSettings.nodeComplete) playNodeComplete();
        if (status === 'error' && soundSettings.error) playError();
        setState(prev => ({
          ...prev,
          nodeStatuses: { ...prev.nodeStatuses, [nodeId]: status },
        }));
      },
      onNodeOutput: (nodeId, data) => {
        const node = workflowNodes.find(n => n.id === nodeId);
        setState(prev => ({
          ...prev,
          stepOutputs: {
            ...prev.stepOutputs,
            [nodeId]: {
              nodeId,
              nodeLabel: node?.label || nodeId,
              data,
              summary: generateSummary(nodeId, data, workflowNodes),
            },
          },
        }));
        const startedAt = stepTimingsRef.current[nodeId] || Date.now();
        const durationMs = Date.now() - startedAt;
        persist('/api/workflow/steps', {
          execution_id: executionIdRef.current,
          step_index: stepIndexRef.current++,
          node_id: nodeId,
          node_label: node?.label || nodeId,
          node_type: node?.type || 'step',
          status: 'success',
          output_data: data,
          config_data: nodeConfigsRef.current[nodeId] || {},
          duration_ms: durationMs,
        });
      },
      onLog: (level, nodeId, nodeLabel, message) => {
        addLog({ nodeId, nodeLabel, message, level });
      },
      onProgress: (current, total) => {
        setState(prev => ({ ...prev, currentStep: current, totalSteps: total }));
      },
      onComplete: () => {
        if (!cancelledRef.current) {
          if (soundSettings.workflowComplete) playWorkflowComplete();
          addLog({ nodeId: 'system', nodeLabel: '系统', message: '工作流执行完成', level: 'success' });
          const totalDuration = Date.now() - executionStartTimeRef.current;
          persist(`/api/workflow/executions/${executionIdRef.current}/complete`, {
            status: 'completed',
            duration_ms: totalDuration,
          });
          setState(prev => ({
            ...prev,
            executing: false,
            currentStep: stepNodeCount,
            nodeStatuses: { ...prev.nodeStatuses, end: 'success', start: 'success' },
          }));
        }
      },
    };

    setState(prev => ({
      ...prev,
      nodeStatuses: { ...prev.nodeStatuses, start: 'success' },
    }));

    // Set manual-wait callback directly on the engine (bypassing callbacks object)
    engine.onManualWait = (nodeId, nodeLabel) => {
      console.log('[ENGINE] onManualWait called for:', nodeId, nodeLabel);
      setState(prev => ({ ...prev, waitingForNext: true, waitingNodeId: nodeId }));
      addLog({
        nodeId: 'system', nodeLabel: '系统',
        message: `等待执行「${nodeLabel || nodeId}」，请点击「下一步」`,
        level: 'info',
      });
    };

    engine.execute(workflowNodes, callbacks, 0, nodeConfigsRef.current, { headless }, state.executionMode);
  }, [addLog, headless, state.executionMode, workflowNodes]);

  const stopExecution = useCallback(() => {
    cancelledRef.current = true;
    engineRef.current?.abort();
    setState(prev => ({ ...prev, executing: false }));
    addLog({ nodeId: 'system', nodeLabel: '系统', message: '工作流已停止', level: 'error' });
  }, [addLog]);

  const testNode = useCallback((nodeId: string) => {
    const stepNodes = workflowNodes.filter(n => n.type === 'step');
    const startIndex = stepNodes.findIndex(n => n.id === nodeId);
    if (startIndex === -1) return;

    setState(prev => ({
      ...prev,
      executing: true,
      currentStep: startIndex,
      totalSteps: stepNodes.length,
      activeTab: 'logs',
    }));
    addLog({
      nodeId: 'system', nodeLabel: '系统',
      message: `从「${stepNodes[startIndex].label}」开始测试`, level: 'info',
    });

    cancelledRef.current = false;
    const engine = engineRef.current!;

    const callbacks: EngineCallbacks = {
      onNodeStatus: (nid, status) => {
        if (status === 'success' && soundSettings.nodeComplete) playNodeComplete();
        if (status === 'error' && soundSettings.error) playError();
        setState(prev => ({
          ...prev,
          nodeStatuses: { ...prev.nodeStatuses, [nid]: status },
        }));
      },
      onNodeOutput: (nid, data) => {
        const node = workflowNodes.find(n => n.id === nid);
        setState(prev => ({
          ...prev,
          stepOutputs: {
            ...prev.stepOutputs,
            [nid]: {
              nodeId: nid,
              nodeLabel: node?.label || nid,
              data,
              summary: generateSummary(nid, data, workflowNodes),
            },
          },
        }));
      },
      onLog: (level, nid, nodeLabel, message) => {
        addLog({ nodeId: nid, nodeLabel, message, level });
      },
      onProgress: (current, total) => {
        setState(prev => ({ ...prev, currentStep: current, totalSteps: total }));
      },
      onComplete: () => {
        if (!cancelledRef.current) {
          if (soundSettings.workflowComplete) playWorkflowComplete();
          addLog({ nodeId: 'system', nodeLabel: '系统', message: '测试执行完成', level: 'success' });
          setState(prev => ({
            ...prev,
            executing: false,
            currentStep: stepNodes.length,
            nodeStatuses: { ...prev.nodeStatuses, end: 'success' },
          }));
        }
      },
    };

    engine.onManualWait = (nodeId, nodeLabel) => {
      setState(prev => ({ ...prev, waitingForNext: true, waitingNodeId: nodeId }));
      addLog({ nodeId: 'system', nodeLabel: '系统', message: `等待执行「${nodeLabel || nodeId}」，请点击「下一步」`, level: 'info' });
    };
    engine.execute(workflowNodes, callbacks, startIndex, nodeConfigsRef.current, { headless }, state.executionMode);
  }, [addLog, headless, state.executionMode, workflowNodes]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    const validIds = template.nodeIds.filter(id => pluginRegistry.get(id));
    if (validIds[0] !== 'start') validIds.unshift('start');
    if (validIds[validIds.length - 1] !== 'end') validIds.push('end');

    const configs = buildDefaultConfigs();
    if (template.defaultConfigs) {
      for (const [nodeId, overrides] of Object.entries(template.defaultConfigs)) {
        configs[nodeId] = { ...(configs[nodeId] || {}), ...overrides };
      }
    }
    nodeConfigsRef.current = configs;
    setNodeConfigsState({ ...configs });

    setState(prev => ({
      ...prev,
      workflowNodeIds: validIds,
      activeTemplateId: templateId,
      selectedNodeId: null,
      executing: false,
      currentStep: 0,
      totalSteps: 0,
      nodeStatuses: {},
      stepOutputs: {},
      executionLogs: [],
    }));
  }, []);

  return {
    state, selectNode, setZoom, toggleWorkflow, setActiveTab, setNavActive, toggleSidebar,
    startExecution, stopExecution, testNode,
    addNode, removeNode, moveNode,
    workflowNodes, stepNodeCount,
    nodeConfigs, setNodeConfig,
    headless, setHeadless,
    loadTemplate,
    executionMode: state.executionMode,
    waitingForNext: state.waitingForNext,
    waitingNodeId: state.waitingNodeId,
    switchExecutionMode,
    triggerNextStep,
    updateStepOutput,
  };
}
