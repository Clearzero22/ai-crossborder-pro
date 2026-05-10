/**
 * 浏览器自动化 —— 管理和配置浏览器自动化任务
 */

interface BrowserTask {
  id: string;
  name: string;
  description: string;
  platform: string;
  platformLabel: string;
  status: 'running' | 'paused' | 'stopped';
  lastRun: string;
  schedule: string;
}

const tasks: BrowserTask[] = [
  { id: 'b1', name: '亚马逊商品信息采集', description: '定时抓取指定ASIN的商品标题、价格、图片、描述', platform: 'amazon', platformLabel: '亚马逊', status: 'running', lastRun: '2分钟前', schedule: '每30分钟' },
  { id: 'b2', name: 'Shopify订单同步', description: '自动同步新订单到本地数据库', platform: 'shopify', platformLabel: 'Shopify', status: 'running', lastRun: '刚刚', schedule: '实时' },
  { id: 'b3', name: '竞品价格监控', description: '每日监控指定竞品的价格变动', platform: 'amazon', platformLabel: '亚马逊', status: 'paused', lastRun: '2小时前', schedule: '每日 09:00' },
  { id: 'b4', name: 'eBay店铺数据导出', description: '按月导出eBay店铺销售和流量数据', platform: 'ebay', platformLabel: 'eBay', status: 'stopped', lastRun: '3天前', schedule: '每月1日' },
  { id: 'b5', name: '速卖通商品上架', description: '批量创建和上架商品到速卖通店铺', platform: 'aliexpress', platformLabel: '速卖通', status: 'stopped', lastRun: '从未', schedule: '手动触发' },
];

const platforms = ['全部', '亚马逊', 'Shopify', 'eBay', '速卖通'];

function StatusBadge({ status }: { status: BrowserTask['status'] }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    running: { bg: 'bg-green-50 text-green-700', dot: 'bg-green-500', label: '运行中' },
    paused: { bg: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500', label: '已暂停' },
    stopped: { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: '已停止' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    amazon: 'bg-orange-100 text-orange-600',
    shopify: 'bg-green-100 text-green-600',
    ebay: 'bg-blue-100 text-blue-600',
    aliexpress: 'bg-red-100 text-red-600',
  };
  const initials: Record<string, string> = {
    amazon: '亚',
    shopify: 'S',
    ebay: 'e',
    aliexpress: '速',
  };
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${colors[platform] || 'bg-gray-100 text-gray-600'}`}>
      {initials[platform] || '?'}
    </div>
  );
}

export default function BrowserPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">浏览器自动化</h1>
            <p className="text-sm text-gray-500 mt-1">管理和配置浏览器自动化任务</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
        </div>

        {/* 快捷统计 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '运行中', value: 2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: '已暂停', value: 1, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: '已停止', value: 2, color: 'text-gray-600', bg: 'bg-gray-100' },
            { label: '今日执行', value: 47, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 平台筛选 */}
        <div className="flex gap-2">
          {platforms.map(p => (
            <button
              key={p}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                p === '全部'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">自动化任务列表</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <PlatformIcon platform={t.platform} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{t.description}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>上次: {t.lastRun}</div>
                  <div>频率: {t.schedule}</div>
                </div>
                <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  {t.status === 'stopped' ? '启动' : t.status === 'paused' ? '恢复' : '暂停'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">浏览器自动化是什么？</h3>
              <p className="text-sm text-gray-600 mt-0.5">通过模拟浏览器操作，自动执行商品采集、价格监控、批量上架等重复性任务。任务在云端运行，无需保持电脑开机。</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0">
              查看文档
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
