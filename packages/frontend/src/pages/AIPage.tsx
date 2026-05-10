/**
 * AI 助手 —— AI 能力辅助跨境电商运营
 */

interface AICapability {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  popular?: boolean;
}

const capabilities: AICapability[] = [
  { id: 'c1', name: '商品文案优化', description: 'AI 自动优化商品标题、卖点和描述，提升搜索排名和转化率', icon: 'zap', color: 'violet', popular: true },
  { id: 'c2', name: '多语言翻译', description: '将商品信息翻译成英语、日语、德语等多国语言', icon: 'globe', color: 'blue', popular: true },
  { id: 'c3', name: '智能客服回复', description: '根据买家消息自动生成专业、得体的回复内容', icon: 'message', color: 'green' },
  { id: 'c4', name: '关键词研究', description: '分析热门搜索词，推荐高转化率的关键词', icon: 'search', color: 'orange' },
  { id: 'c5', name: '图片背景生成', description: '使用 AI 生成商品展示图背景，提升视觉质量', icon: 'image', color: 'purple' },
  { id: 'c6', name: '评论分析报告', description: '分析商品评论情感趋势，提炼用户核心关注点', icon: 'data', color: 'cyan' },
  { id: 'c7', name: '定价策略建议', description: '基于竞品数据和市场趋势提供定价建议', icon: 'edit', color: 'rose' },
  { id: 'c8', name: 'Listing 健康检查', description: '自动检测商品 Listing 的完整性和优化空间', icon: 'check', color: 'emerald' },
];

interface Conversation {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const conversations: Conversation[] = [
  { role: 'assistant', content: '你好！我是跨境 AI 助手，可以帮你优化商品文案、翻译、分析评论等。有什么可以帮你的？', time: '刚刚' },
  { role: 'user', content: '帮我优化一下这个蓝牙耳机的标题：Wireless Bluetooth Headphones', time: '刚刚' },
];

function CapabilityIcon({ icon, color }: { icon: string; color: string }) {
  const paths: Record<string, string> = {
    zap: 'M13 10V3L4 14h7v7l9-11h-7z',
    globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    message: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    data: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    rose: 'bg-rose-100 text-rose-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || 'bg-gray-100 text-gray-600'}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon] || paths.zap} />
      </svg>
    </div>
  );
}

export default function AIPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* 页面头部 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 助手</h1>
          <p className="text-sm text-gray-500 mt-1">使用 AI 能力辅助跨境电商运营</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：AI 能力列表 */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-900">AI 能力</h2>
            <div className="space-y-2">
              {capabilities.map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all text-left relative"
                >
                  <CapabilityIcon icon={c.icon} color={c.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      {c.popular && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-600 rounded">热门</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：对话区域 */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 flex flex-col">
            {/* 对话头部 */}
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">对话</h2>
              <p className="text-xs text-gray-400 mt-0.5">选择左侧 AI 能力开始对话，或在下方输入问题</p>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 px-5 py-4 space-y-4 min-h-[400px]">
              {conversations.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-700">AI 助手</span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-md'
                        : 'bg-gray-100 text-gray-800 rounded-tl-md'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`text-[10px] text-gray-400 mt-0.5 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 输入区域 */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="输入您的问题..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
