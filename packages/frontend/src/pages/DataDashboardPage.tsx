import { useState } from 'react';
import OverviewTab from './DashboardPage/OverviewTab';
import ExecutionDetail from './DashboardPage/ExecutionDetail';
import NodeComparison from './DashboardPage/NodeComparison';
import AllDataTable from './DashboardPage/AllDataTable';

type Tab = 'overview' | 'execution' | 'comparison' | 'all-data';

export default function DataDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '总览' },
    { key: 'execution', label: '执行详情' },
    { key: 'comparison', label: '节点对比' },
    { key: 'all-data', label: '全量数据' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 bg-white">
        {tabs.map(t => (
          <button key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm rounded-t-lg border-b-2 transition-colors ${
                    tab === t.key ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/80">
        {tab === 'overview' && (
          <OverviewTab onSelectExecution={(id) => { setSelectedExecutionId(id); setTab('execution'); }} />
        )}
        {tab === 'execution' && selectedExecutionId && (
          <ExecutionDetail executionId={selectedExecutionId} onBack={() => setTab('overview')} />
        )}
        {tab === 'execution' && !selectedExecutionId && (
          <div className="p-6 text-sm text-gray-400">请从总览中选择一次执行记录</div>
        )}
        {tab === 'comparison' && (
          <NodeComparison />
        )}
        {tab === 'all-data' && (
          <AllDataTable />
        )}
      </div>
    </div>
  );
}
