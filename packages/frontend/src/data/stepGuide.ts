import type { StepGuideItem } from '../types';

// stepGuide.ts 新手指引步骤
// Canvas 组件显示在画布上的新手指导
export const stepGuideItems: StepGuideItem[] = [
  { step: 1, title: '选择模板', description: '或从空白创建新的工作流', completed: false },
  { step: 2, title: '添加节点', description: '从左侧选择节点拖拽到画布', completed: false },
  { step: 3, title: '配置节点', description: '设置每个节点的具体参数', completed: false },
  { step: 4, title: '测试运行', description: '逐个测试节点确保正常工作', completed: false },
  { step: 5, title: '发布启用', description: '发布工作流并开启自动化', completed: false },
];
