interface ConfigTabsProps {
  activeTab: 'config' | 'data' | 'logs';
  onChange: (tab: 'config' | 'data' | 'logs') => void;
}

const tabs = [
  { id: 'config' as const, label: '节点配置' },
  { id: 'data' as const, label: '步骤数据' },
  { id: 'logs' as const, label: '运行日志' },
];

export default function ConfigTabs({ activeTab, onChange }: ConfigTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === t.id
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
