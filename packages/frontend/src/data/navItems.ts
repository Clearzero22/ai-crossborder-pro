import type { NavItem } from '../types';

// 侧边导航菜单
// 用途 Siderbar 组件渲染左侧导航菜单
// 增加页面直接在这里面增加


export const navItems: NavItem[] = [
  { id: 'home', label: '首页概览', icon: 'home' },
  { id: 'workflow', label: '工作流', icon: 'workflow', active: true },
  { id: 'templates', label: '模板市场', icon: 'template' },
  { id: 'browser', label: '浏览器自动化', icon: 'browser' },
  { id: 'ai', label: 'AI 助手', icon: 'ai' },
  { id: 'tasks', label: '任务执行记录', icon: 'tasks' },
  { id: 'pipeline-data', label: 'Pipeline 数据', icon: 'pipeline' },
  { id: 'dashboard', label: '数据看板', icon: 'dashboard' },
  { id: 'integrations', label: '集成中心', icon: 'integrations' },
  { id: 'settings', label: '系统设置', icon: 'settings' },
];
