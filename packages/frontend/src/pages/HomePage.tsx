/**
 * 首页概览 —— 数据概览型仪表盘
 *
 * 显示关键指标、最近执行记录、快速操作入口
 */

import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardState, DashboardExecution, TrendDataPoint } from '../types/dashboard';
import DashboardSkeleton from '../components/DashboardSkeleton';

// ──────── Mock 数据（快捷操作，不需要从API获取）────

const quickActions = [
  { label: '新建工作流', icon: 'plus', color: 'blue' },
  { label: '运行最近', icon: 'play', color: 'green' },
  { label: '模板市场', icon: 'template', color: 'purple' },
  { label: '集成中心', icon: 'integrations', color: 'orange' },
];

// ──────── Helpers ────────

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatTime(isoString: string): string {
  const now = new Date();
  const time = new Date(isoString);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return `昨天 ${time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays}天前`;

  return time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function StatusIcon({ status }: { status: 'success' | 'error' }) {
  if (status === 'success') {
    return (
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    </div>
  );
}

function ActionIcon({ icon }: { icon: string }) {
  const className = "w-5 h-5";
  switch (icon) {
    case 'plus':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    case 'play':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'template':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>;
    case 'integrations':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>;
    default:
      return null;
  }
}

// ──────── Component ────────

export default function HomePage() {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    executions: [],
    trend: [],
    user: null,
    loading: true,
    error: null,
  });

  const loadDashboardData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 并行请求所有数据
      const [stats, executions, trend, user] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getExecutions(5),
        dashboardService.getTrend(),
        dashboardService.getUser(),
      ]);

      setState({
        stats,
        executions,
        trend,
        user,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '加载数据失败，请稍后重试',
      }));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 加载中状态
  if (state.loading) {
    return <DashboardSkeleton />;
  }

  // 错误状态
  if (state.error) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-full mx-auto px-4 py-5">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 font-medium mb-2">{state.error}</div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 空数据状态（所有数据都为空）
  if (!state.stats && !state.user && state.executions.length === 0 && state.trend.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-full mx-auto px-4 py-5">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-4">暂无数据</div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 统计卡片数据（从API获取）
  const statsData = state.stats ? [
    {
      label: '执行总次数',
      value: state.stats.totalExecutions.toLocaleString(),
      change: `${state.stats.changeFromLastMonth.executions > 0 ? '+' : ''}${state.stats.changeFromLastMonth.executions}%`,
      changeType: state.stats.changeFromLastMonth.executions >= 0 ? 'up' : 'down',
    },
    {
      label: '本月成功率',
      value: `${state.stats.successRate.toFixed(1)}%`,
      change: `${state.stats.changeFromLastMonth.successRate > 0 ? '+' : ''}${state.stats.changeFromLastMonth.successRate}%`,
      changeType: state.stats.changeFromLastMonth.successRate >= 0 ? 'up' : 'down',
    },
    {
      label: '发布商品数',
      value: state.stats.publishedProducts.toLocaleString(),
      change: `${state.stats.changeFromLastMonth.products > 0 ? '+' : ''}${state.stats.changeFromLastMonth.products}`,
      changeType: state.stats.changeFromLastMonth.products >= 0 ? 'up' : 'down',
    },
    {
      label: '运行时长',
      value: `${Math.floor(state.stats.totalDuration / 3600)}h`,
      change: `${state.stats.changeFromLastMonth.duration > 0 ? '+' : ''}${Math.floor(state.stats.changeFromLastMonth.duration / 3600)}h`,
      changeType: state.stats.changeFromLastMonth.duration >= 0 ? 'up' : 'down',
    },
  ] : [];

  // 最近执行记录（从API获取）
  const recentExecutions: DashboardExecution[] = state.executions;

  // 本周趋势数据（从API获取）
  const weeklyData: TrendDataPoint[] = state.trend;
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1); // 避免除以0

  // 用户数据（从API获取）
  const userData = state.user;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-full mx-auto px-4 py-5 space-y-5">

        {/* 欢迎横幅 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{greeting()}，{userData?.userName || '跨境小助手'} 👋</h1>
              <p className="text-blue-100 mt-1 text-sm">
                今天是你使用工作流的第 {userData?.daysActive || 0} 天 · 上次登录: {userData?.lastLoginAt ? formatTime(userData.lastLoginAt) : '刚刚'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {userData?.planName && <span className="px-3 py-1 bg-white/20 rounded-full">{userData.planName}</span>}
              <button
                onClick={loadDashboardData}
                className="px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors flex items-center gap-1"
                disabled={state.loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-sm text-blue-100">
            <span>● 已启用工作流: {userData?.activeWorkflows || 0} 个</span>
            <span>● 今日已执行: {userData?.todayExecutions || 0} 次</span>
            <span>● 待处理任务: {userData?.pendingTasks || 0} 个</span>
          </div>
        </div>

        {/* 统计卡片 */}
        {statsData.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className={`text-xs mt-1 ${s.changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {s.changeType === 'up' ? '↑' : '↓'} {s.change} 较上月
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 最近执行 */}
          <div className="col-span-2 lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">最近执行</h2>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">查看全部 →</button>
            </div>
            {recentExecutions.length > 0 ? (
              <div className="space-y-3">
                {recentExecutions.map((exec) => (
                  <div key={exec.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <StatusIcon status={exec.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{exec.workflowName}</div>
                      <div className="text-xs text-gray-400">{formatTime(exec.startedAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{formatDuration(exec.duration)}</div>
                      {exec.status === 'error' && exec.errorMessage && (
                        <div className="text-xs text-red-500">{exec.errorMessage}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">暂无执行记录</div>
            )}
          </div>

          {/* 右侧：本周趋势 + 快捷操作 */}
          <div className="space-y-6">
            {/* 本周趋势 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">本周执行趋势</h2>
              {weeklyData.length > 0 ? (
                <div className="space-y-2.5">
                  {weeklyData.map((d, i) => {
                    const dayLabel = new Date(d.date).toLocaleDateString('zh-CN', { weekday: 'short' });
                    const isMax = d.count === maxCount;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8">{dayLabel}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isMax ? 'bg-blue-500' : 'bg-blue-300'}`}
                            style={{ width: `${(d.count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{d.count}次</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">暂无趋势数据</div>
              )}
            </div>

            {/* 快捷操作 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">快捷操作</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map(action => {
                  const colorMap: Record<string, string> = {
                    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
                    green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
                    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
                    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
                  };
                  return (
                    <button
                      key={action.label}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border ${colorMap[action.color] || colorMap.blue} transition-colors text-sm font-medium`}
                    >
                      <ActionIcon icon={action.icon} />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
