/**
 * PluginRegistry —— 插件注册中心
 *
 * 所有插件注册到这里后，自动生成：
 * - Canvas 使用的 workflowNodes
 * - 左侧面板的 NodeGroup
 * - Engine 使用的 executor 列表
 */
import type { WorkflowNode, NodeGroup } from '../types';
import type { NodeExecutor } from './types';
import type { NodePlugin } from './pluginTypes';

export class PluginRegistry {
  private plugins = new Map<string, NodePlugin>();

  /** 注册单个插件 */
  register(plugin: NodePlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /** 批量注册 */
  registerAll(plugins: NodePlugin[]): void {
    for (const p of plugins) this.register(p);
  }

  /** 按 id 获取 */
  get(id: string): NodePlugin | undefined {
    return this.plugins.get(id);
  }

  /** 获取全部 */
  getAll(): NodePlugin[] {
    return [...this.plugins.values()];
  }

  // ──────── 以下为现有 UI 组件提供数据 ────────

  /** 生成 Canvas 用的 WorkflowNode[] */
  getWorkflowNodes(): WorkflowNode[] {
    return this.getAll().map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      icon: p.icon,
      category: p.category,
      type: p.nodeType,
      status: 'idle' as const,
    }));
  }

  /** 生成 NodePanel 用的 NodeGroup[] */
  getPanelGroups(): NodeGroup[] {
    const groupMap = new Map<string, NodeGroup>();

    for (const p of this.getAll()) {
      if (!p.panelGroup) continue;

      if (!groupMap.has(p.panelGroup)) {
        groupMap.set(p.panelGroup, {
          id: p.panelGroup,
          label: this.groupLabel(p.panelGroup),
          color: p.panelColor || 'gray',
          items: [],
        });
      }

      groupMap.get(p.panelGroup)!.items.push({
        id: p.id,
        label: p.label,
        icon: p.icon,
        color: p.panelColor || 'gray',
      });
    }

    return [...groupMap.values()];
  }

  /** 生成 Engine 用的 NodeExecutor[] */
  getExecutors(): NodeExecutor[] {
    return this.getAll().map(p => p.executor);
  }

  /** 按节点 id 获取执行器 */
  getExecutor(id: string): NodeExecutor | undefined {
    return this.plugins.get(id)?.executor;
  }

  private groupLabel(group: string): string {
    const labels: Record<string, string> = {
      browser: '浏览器自动化',
      ai: 'AI 处理',
      data: '数据处理',
      flow: '流程控制',
    };
    return labels[group] || group;
  }
}

/** 全局单例 */
export const pluginRegistry = new PluginRegistry();
