/**
 * 任务执行记录 —— 查看所有工作流的执行历史和日志
 */

interface TaskLog {
  id: string;
  name: string;
  status: 'success' | 'error' | 'running';
  time: string;
  duration: string;
  trigger: string;
  nodes: number;
  errorMsg?: string;
}

const taskLogs: TaskLog[] = [
  { id: 'l1', name: '创建新品并上架到Shopify', status: 'success', time: '2026-04-28 14:32:18', duration: '1m 23s', trigger: '手动', nodes: 7 },
  { id: 'l2', name: '批量更新商品价格', status: 'error', time: '2026-04-28 13:15:42', duration: '45s', trigger: '定时', nodes: 4, errorMsg: 'Shopify API 限流' },
  { id: 'l3', name: 'AI生成商品描述', status: 'success', time: '2026-04-28 11:00:05', duration: '38s', trigger: '自动化', nodes: 3 },
  { id: 'l4', name: '同步库存到多平台', status: 'running', time: '2026-04-28 10:45:00', duration: '进行中...', trigger: '手动', nodes: 5 },
  { id: 'l5', name: '竞品价格监控', status: 'success', time: '2026-04-28 09:00:00', duration: '12s', trigger: '定时', nodes: 4 },
  { id: 'l6', name: '自动回复买家消息', status: 'error', time: '2026-04-27 22:30:15', duration: '5s', trigger: '自动化', nodes: 3, errorMsg: 'API 认证失败' },
  { id: 'l7', name: '店铺数据日报', status: 'success', time: '2026-04-27 08:00:00', duration: '28s', trigger: '定时', nodes: 4 },
  { id: 'l8', name: '批量图片处理', status: 'success', time: '2026-04-26 18:20:33', duration: '2m 05s', trigger: '手动', nodes: 3 },
  { id: 'l9', name: '商品信息跨平台迁移', status: 'error', time: '2026-04-26 15:10:00', duration: '3m 12s', trigger: '手动', nodes: 6, errorMsg: '数据格式不匹配' },
  { id: 'l10', name: '创建新品并上架到Shopify', status: 'success', time: '2026-04-26 14:00:00', duration: '1m 15s', trigger: '手动', nodes: 7 },
];

const todayCount = taskLogs.filter(l => l.time.startsWith('2026-04-28')).length;
const successCount = taskLogs.filter(l => l.status === 'success').length;
const errorCount = taskLogs.filter(l => l.status === 'error').length;
const successRate = Math.round((successCount / (successCount + errorCount)) * 100);

export default function TasksPage({ onViewData }: { onViewData?: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务执行记录</h1>
            <p className="text-sm text-gray-500 mt-1">查看所有工作流的执行历史和日志</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">导出</button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">筛选</button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '今日执行', value: todayCount, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: '成功', value: successCount, color: 'text-green-600', bg: 'bg-green-50' },
            { label: '失败', value: errorCount, color: 'text-red-600', bg: 'bg-red-50' },
            { label: '成功率', value: `${successRate}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 时间筛选 */}
        <div className="flex gap-2">
          {['今天', '近7天', '近30天', '本月', '自定义'].map(t => (
            <button
              key={t}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                t === '今天' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 任务列表表格 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_160px_100px_80px_100px_70px] min-w-[600px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <span>任务名称</span>
            <span>执行时间</span>
            <span>耗时</span>
            <span>触发方式</span>
            <span className="text-right">状态</span>
            <span className="text-center">数据</span>
          </div>
          {/* 行 */}
          <div className="divide-y divide-gray-50">
            {taskLogs.map(l => (
              <div key={l.id} className="grid grid-cols-[1fr_160px_100px_80px_100px_70px] min-w-[600px] gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors items-center">
                <div>
                  <span className="text-sm font-medium text-gray-900">{l.name}</span>
                  {l.errorMsg && <p className="text-xs text-red-500 mt-0.5">{l.errorMsg}</p>}
                </div>
                <span className="text-sm text-gray-500">{l.time}</span>
                <span className="text-sm text-gray-500">{l.duration}</span>
                <span className="text-sm text-gray-500">{l.trigger}</span>
                <div className="text-right">
                  {l.status === 'success' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      成功
                    </span>
                  )}
                  {l.status === 'error' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      失败
                    </span>
                  )}
                  {l.status === 'running' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      运行中
                    </span>
                  )}
                </div>
                <div className="text-center">
                  {onViewData && (
                    <button onClick={onViewData} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      查看
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">共 {taskLogs.length} 条记录</span>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40" disabled>上一页</button>
            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-sm text-white">1</button>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">2</button>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">3</button>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
