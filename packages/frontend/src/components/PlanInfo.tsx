import { usePlanContext } from '../context/PlanContext';

interface PlanInfoProps {
  collapsed?: boolean;
  onUpgrade?: () => void;
}

export default function PlanInfo({ collapsed = false, onUpgrade }: PlanInfoProps) {
  const { state, refresh } = usePlanContext();
  const { plan, loading, error, usagePercent, isNearLimit, isExpired, daysUntilExpiry } = state;

  // Loading skeleton (only when no plan data exists yet)
  if (loading && !plan) {
    if (collapsed) {
      return (
        <div className="p-3 border-t border-gray-200 flex flex-col items-center gap-2 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-gray-200" />
          <div className="w-full bg-gray-200 rounded-full h-1" />
        </div>
      );
    }

    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3" />
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-8 bg-gray-200 rounded-lg w-full" />
      </div>
    );
  }

  // Error state with retry
  if (error && !plan) {
    if (collapsed) {
      return (
        <div className="p-3 border-t border-gray-200 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="w-full bg-red-200 rounded-full h-1" />
        </div>
      );
    }

    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700 font-medium mb-1">加载失败</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="mt-2 w-full py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '重试中...' : '重试'}
          </button>
        </div>
      </div>
    );
  }

  // No plan data
  if (!plan) {
    return null;
  }

  const percent = Math.round(usagePercent);
  const progressColor = isNearLimit ? 'bg-red-500' : 'bg-blue-500';

  if (collapsed) {
    return (
      <div className="p-3 border-t border-gray-200 flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div className={`${progressColor} h-1 rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50">
      {/* Error banner for expired plans */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-700 font-medium">套餐已过期，请立即升级</p>
          </div>
        </div>
      )}

      {/* Warning banner for near limit */}
      {isNearLimit && !isExpired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-yellow-700">执行次数即将用完</p>
          </div>
        </div>
      )}

      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">当前计划：</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900">{plan.plan.name}</span>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="刷新"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Usage information */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">执行次数</span>
        <span className="text-xs text-gray-700">
          {plan.usage.current.toLocaleString()} / {plan.usage.total.toLocaleString()}
        </span>
      </div>

      {/* Progress bar with color based on limit */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className={`${progressColor} h-1.5 rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Expiry date and days remaining */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">到期时间</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-700">{plan.subscription.endDate}</span>
          {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
            <span className="text-xs text-orange-600 font-medium">（还剩 {daysUntilExpiry} 天）</span>
          )}
        </div>
      </div>

      {/* Upgrade button */}
      <button
        onClick={onUpgrade}
        className="w-full py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        升级计划
      </button>
    </div>
  );
}
