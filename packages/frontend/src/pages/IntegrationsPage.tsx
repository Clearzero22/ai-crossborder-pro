/**
 * 集成中心 —— 连接第三方平台和服务
 */

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  iconBg: string;
  iconColor: string;
  category: string;
  lastSync?: string;
}

const integrations: Integration[] = [
  { id: 'i1', name: '亚马逊', description: '商品管理、订单同步、库存更新', status: 'connected', icon: '亚', iconBg: 'bg-orange-100', iconColor: 'text-orange-700', category: '电商平台', lastSync: '刚刚' },
  { id: 'i2', name: 'Shopify', description: '商品上架、订单管理、数据导出', status: 'connected', icon: 'S', iconBg: 'bg-green-100', iconColor: 'text-green-700', category: '电商平台', lastSync: '2分钟前' },
  { id: 'i3', name: 'eBay', description: '商品发布、库存同步、销售分析', status: 'error', icon: 'e', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', category: '电商平台', lastSync: '1小时前' },
  { id: 'i4', name: '速卖通', description: '商品管理、订单处理、物流追踪', status: 'disconnected', icon: '速', iconBg: 'bg-red-100', iconColor: 'text-red-700', category: '电商平台' },
  { id: 'i5', name: 'Claude AI', description: 'AI 文案优化、智能回复、数据分析', status: 'connected', icon: 'C', iconBg: 'bg-violet-100', iconColor: 'text-violet-700', category: 'AI 服务', lastSync: '5分钟前' },
  { id: 'i6', name: 'OpenAI', description: 'GPT 模型调用、图片生成、翻译服务', status: 'connected', icon: 'O', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', category: 'AI 服务', lastSync: '10分钟前' },
  { id: 'i7', name: '微信', description: '消息通知、客服接入、群发管理', status: 'error', icon: '微', iconBg: 'bg-green-100', iconColor: 'text-green-700', category: '通讯', lastSync: '30分钟前' },
  { id: 'i8', name: '钉钉', description: '工作提醒、审批通知、日报推送', status: 'connected', icon: '钉', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', category: '通讯', lastSync: '1天前' },
  { id: 'i9', name: '企业微信', description: '消息推送、数据报表、告警通知', status: 'disconnected', icon: '企', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', category: '通讯' },
  { id: 'i10', name: 'Google Drive', description: '文件存储、报表导出、数据备份', status: 'connected', icon: 'G', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-700', category: '存储', lastSync: '1小时前' },
  { id: 'i11', name: 'Dropbox', description: '文件同步、图片存储、数据归档', status: 'disconnected', icon: 'D', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', category: '存储' },
  { id: 'i12', name: 'Slack', description: '团队协作、通知推送、告警集成', status: 'connected', icon: 'S', iconBg: 'bg-purple-100', iconColor: 'text-purple-700', category: '通讯', lastSync: '2小时前' },
];

const categories = ['全部', '电商平台', 'AI 服务', '通讯', '存储'];

function StatusBadge({ status }: { status: Integration['status'] }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    connected: { bg: 'bg-green-50 text-green-700', dot: 'bg-green-500', label: '已连接' },
    disconnected: { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: '未连接' },
    error: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500', label: '连接异常' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function IntegrationsPage() {
  const connected = integrations.filter(i => i.status === 'connected').length;
  const error = integrations.filter(i => i.status === 'error').length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">集成中心</h1>
            <p className="text-sm text-gray-500 mt-1">连接第三方平台和服务，扩展工作流能力</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            添加集成
          </button>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '已连接', value: connected, color: 'text-green-600', bg: 'bg-green-50' },
            { label: '未连接', value: integrations.filter(i => i.status === 'disconnected').length, color: 'text-gray-600', bg: 'bg-gray-100' },
            { label: '连接异常', value: error, color: 'text-red-600', bg: 'bg-red-50' },
            { label: '可用集成', value: integrations.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2">
          {categories.map(c => (
            <button
              key={c}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                c === '全部' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 集成卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${i.iconBg} ${i.iconColor} flex-shrink-0`}>
                  {i.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{i.name}</h3>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{i.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">{i.lastSync ? `上次同步: ${i.lastSync}` : '未同步'}</span>
                    <button className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      i.status === 'disconnected'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                      {i.status === 'disconnected' ? '连接' : i.status === 'error' ? '重连' : '配置'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
