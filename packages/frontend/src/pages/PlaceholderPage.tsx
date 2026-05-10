const pageConfig: Record<string, { title: string; description: string; gradient: string; emoji: string }> = {
  home: {
    title: '首页概览',
    description: '查看账户概览、使用统计和最近活动',
    gradient: 'from-blue-400 to-indigo-500',
    emoji: '📊',
  },
  templates: {
    title: '模板市场',
    description: '浏览和选择预设的工作流模板',
    gradient: 'from-purple-400 to-pink-500',
    emoji: '🏪',
  },
  browser: {
    title: '浏览器自动化',
    description: '管理和配置浏览器自动化任务',
    gradient: 'from-emerald-400 to-teal-500',
    emoji: '🌐',
  },
  ai: {
    title: 'AI 助手',
    description: '使用 AI 能力辅助跨境电商运营',
    gradient: 'from-violet-400 to-purple-500',
    emoji: '🤖',
  },
  tasks: {
    title: '任务执行记录',
    description: '查看所有工作流的执行历史和日志',
    gradient: 'from-orange-400 to-red-500',
    emoji: '📋',
  },
  dashboard: {
    title: '数据看板',
    description: '可视化数据分析与业务洞察',
    gradient: 'from-cyan-400 to-blue-500',
    emoji: '📈',
  },
  integrations: {
    title: '集成中心',
    description: '连接第三方平台和服务',
    gradient: 'from-rose-400 to-pink-500',
    emoji: '🔌',
  },
  settings: {
    title: '系统设置',
    description: '配置账户、团队和首选项',
    gradient: 'from-gray-400 to-slate-500',
    emoji: '⚙️',
  },
};

interface PlaceholderPageProps {
  pageId: string;
}

export default function PlaceholderPage({ pageId }: PlaceholderPageProps) {
  const config = pageConfig[pageId];

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">页面未找到</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg mb-6`}>
          <span className="text-4xl">{config.emoji}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h2>
        <p className="text-gray-500 mb-8 max-w-sm">{config.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          页面开发中...
        </div>
      </div>
    </div>
  );
}
