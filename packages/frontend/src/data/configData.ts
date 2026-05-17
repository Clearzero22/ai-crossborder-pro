import type { ConfigSection } from '../types';

// 系统配置数据内容
// 给配置面板提供默认字段
// 测试时使用的模拟用户数据

export const defaultConfigSections: ConfigSection[] = [
  { id: 'browser-config', title: '浏览器配置', fields: [
    { type: 'select', label: '选择浏览器配置', value: '默认浏览器配置', options: [
      { label: '默认浏览器配置', value: '默认浏览器配置' },
      { label: '自定义配置 1', value: '自定义配置 1' },
      { label: '自定义配置 2', value: '自定义配置 2' },
    ]},
  ]},
  { id: 'operation', title: '操作设置', fields: [
    { type: 'text', label: 'URL 地址', value: 'https://www.amazon.com/dp/B08N5WRWNW' },
    { type: 'checkbox', label: '等待页面完全加载', value: true },
    { type: 'checkbox', label: '模拟人类浏览行为（防检测）', value: true },
  ]},
];

export const userInfo = {
  name: '跨境小助手',
  role: '超级管理员',
  notificationCount: 12,
};
