/**
 * 图标注册表
 *
 * 【添加新图标】
 * 在 iconMap 中注册即可，不需要改 WorkflowNode.tsx
 *
 * 【插件使用自定义图标】
 * plugins/index.ts 中 NodePlugin.icon 指向这里的 key
 */

function Svg({ children, className, viewBox = '0 0 24 24', strokeWidth = '2' }: {
  children: string;
  className?: string;
  viewBox?: string;
  strokeWidth?: string;
}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox={viewBox} strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d={children} />
    </svg>
  );
}

export const iconMap: Record<string, React.FC<{ className?: string }>> = {
  play: ({ className }) => (
    <Svg className={className} strokeWidth="2.5">M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z</Svg>
  ),
  check: ({ className }) => (
    <Svg className={className} strokeWidth="2.5">M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z</Svg>
  ),
  globe: ({ className }) => (
    <Svg className={className}>M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9</Svg>
  ),
  data: ({ className }) => (
    <Svg className={className}>M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z</Svg>
  ),
  zap: ({ className }) => (
    <Svg className={className}>M13 10V3L4 14h7v7l9-11h-7z</Svg>
  ),
  edit: ({ className }) => (
    <Svg className={className}>M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z</Svg>
  ),
  image: ({ className }) => (
    <Svg className={className}>M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z</Svg>
  ),
  upload: ({ className }) => (
    <Svg className={className}>M12 19l9 2-9-18-9 18 9-2zm0 0v-8</Svg>
  ),
  plus: ({ className }) => (
    <Svg className={className}>M12 6v6m0 0v6m0-6h6m-6 0H6</Svg>
  ),
  search: ({ className }) => (
    <Svg className={className}>M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z</Svg>
  ),
  /** 新节点识别占位符 */
  webhook: ({ className }) => (
    <Svg className={className}>M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1</Svg>
  ),
};

/** 根据图标名称获取组件 */
export function getIcon(name: string): React.FC<{ className?: string }> {
  return iconMap[name] || iconMap.plus;
}
