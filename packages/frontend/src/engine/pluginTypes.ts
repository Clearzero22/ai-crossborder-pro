/**
 * NodePlugin —— 节点的完整定义
 *
 * 【开发者接入新节点只需要创建这个文件】
 */
import type { NodeExecutor } from '../engine/types';

export interface NodePlugin {
  /** 全局唯一 ID，同时也是 Canvas 上 node.id */
  id: string;
  label: string;
  description: string;

  /** 图标名称 —— 在 src/components/Icons.tsx 中注册 */
  icon: string;
  category: 'browser' | 'ai' | 'data' | 'flow';
  nodeType: 'start' | 'end' | 'step';

  /** 左侧面板展示信息（step 节点才有） */
  panelGroup?: 'browser' | 'ai' | 'data' | 'flow';
  panelColor?: string;

  /** 执行器 —— 核心业务逻辑 */
  executor: NodeExecutor;
}
