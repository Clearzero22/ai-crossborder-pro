/**
 * 系统设置 —— 配置账户、团队、首选项和主题
 */

import { useTheme } from '../hooks/useTheme';
import type { PrimaryColor } from '../hooks/useTheme';
import { useSoundSettings } from '../hooks/useSoundSettings';
import SoftwareUpdateSection from '../components/SoftwareUpdateSection';

interface SettingSection {
  id: string;
  label: string;
  icon: string;
  items: { label: string; description: string; type: 'toggle' | 'select' | 'text' | 'button'; value?: string; enabled?: boolean; onClick?: () => void }[];
}

function StaticSection({ section }: { section: SettingSection }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <SectionIcon icon={section.icon} />
        <h2 className="font-semibold text-gray-900">{section.label}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {section.items.map(item => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div>
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
            </div>
            <SettingInput item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

const staticSections: SettingSection[] = [
  {
    id: 'account', label: '账户设置', icon: 'user',
    items: [
      { label: '账户名称', description: '跨境电商工作室', type: 'text', value: '跨境电商工作室' },
      { label: '邮箱地址', description: 'admin@example.com', type: 'text', value: 'admin@example.com' },
      { label: '修改密码', description: '建议定期更换密码', type: 'button' },
    ],
  },
  {
    id: 'workflow', label: '工作流默认设置', icon: 'settings',
    items: [
      { label: '超时时间', description: '单个节点最大执行时间', type: 'select', value: '60 秒' },
      { label: '失败重试次数', description: '节点失败后自动重试', type: 'select', value: '3 次' },
      { label: '日志保留天数', description: '执行日志自动清理周期', type: 'select', value: '30 天' },
      { label: '并发执行数', description: '同时运行的最大工作流数', type: 'select', value: '5 个' },
    ],
  },
  {
    id: 'api', label: 'API 密钥', icon: 'key',
    items: [
      { label: 'Claude API Key', description: '用于 AI 文案优化等功能', type: 'text', value: 'sk-••••••••••••••••' },
      { label: 'OpenAI API Key', description: '用于 GPT 模型调用', type: 'text', value: 'sk-••••••••••••••••' },
      { label: 'Webhook Secret', description: '回调签名验证密钥', type: 'button' },
    ],
  },
  {
    id: 'team', label: '团队管理', icon: 'team',
    items: [
      { label: '团队成员', description: '当前成员 3 人', type: 'select', value: '3 人' },
      { label: '角色权限', description: '管理员/编辑者/查看者', type: 'button' },
      { label: '操作日志', description: '记录团队所有操作行为', type: 'button' },
    ],
  },
];

const colorSchemes: { id: PrimaryColor; label: string; bg: string; activeBg: string }[] = [
  { id: 'blue', label: '蓝色', bg: 'bg-blue-500', activeBg: 'ring-blue-500' },
  { id: 'indigo', label: '靛蓝', bg: 'bg-indigo-500', activeBg: 'ring-indigo-500' },
  { id: 'violet', label: '紫色', bg: 'bg-violet-500', activeBg: 'ring-violet-500' },
  { id: 'emerald', label: '翠绿', bg: 'bg-emerald-500', activeBg: 'ring-emerald-500' },
  { id: 'orange', label: '橙色', bg: 'bg-orange-500', activeBg: 'ring-orange-500' },
];

function SectionIcon({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    team: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    appearance: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    sound: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
  };
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon] || paths.settings} />
    </svg>
  );
}

function SettingInput({ item }: { item: SettingSection['items'][0] }) {
  if (item.type === 'toggle') {
    return (
      <div
        onClick={item.onClick}
        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${item.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    );
  }
  if (item.type === 'select') {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
        <span>{item.value}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }
  if (item.type === 'text') {
    return <span className="text-sm text-gray-600">{item.value}</span>;
  }
  return (
    <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
      管理
    </button>
  );
}

/** 外观设置区块（使用真实主题状态） */
function AppearanceSection() {
  const { mode, primaryColor, toggleMode, setPrimaryColor } = useTheme();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <SectionIcon icon="appearance" />
        <h2 className="font-semibold text-gray-900">外观设置</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {/* 主题切换 */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <div className="text-sm font-medium text-gray-900">主题模式</div>
            <div className="text-xs text-gray-500 mt-0.5">切换深色/浅色主题</div>
          </div>
          <button
            onClick={toggleMode}
            className={`relative w-14 h-7 rounded-full transition-colors flex items-center px-1 ${
              mode === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div className={`flex items-center gap-1.5 w-full justify-between transition-opacity ${mode === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
              <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
              mode === 'dark' ? 'translate-x-7' : 'translate-x-0'
            }`}>
              <svg className={`w-3 h-3 ${mode === 'dark' ? 'text-blue-600' : 'text-yellow-500'}`} fill="currentColor" viewBox="0 0 20 20">
                {mode === 'dark' ? (
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                ) : (
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                )}
              </svg>
            </div>
          </button>
        </div>

        {/* 配色方案 */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <div className="text-sm font-medium text-gray-900">配色方案</div>
            <div className="text-xs text-gray-500 mt-0.5">选择主题主色调</div>
          </div>
          <div className="flex gap-2">
            {colorSchemes.map(c => (
              <button
                key={c.id}
                onClick={() => setPrimaryColor(c.id)}
                className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                  primaryColor === c.id ? 'ring-2 ring-offset-2 scale-110' : 'ring-0 opacity-60 hover:opacity-100'
                } ${c.activeBg}`}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 声音设置区块（使用真实状态） */
function SoundSection() {
  const { settings, updateSettings } = useSoundSettings();

  const items: SettingSection['items'] = [
    {
      label: '节点完成提示音',
      description: '每个节点执行完成时播放提示音',
      type: 'toggle',
      enabled: settings.nodeComplete,
      onClick: () => updateSettings({ nodeComplete: !settings.nodeComplete }),
    },
    {
      label: '工作流完成提示音',
      description: '整个工作流执行完成时播放提示音',
      type: 'toggle',
      enabled: settings.workflowComplete,
      onClick: () => updateSettings({ workflowComplete: !settings.workflowComplete }),
    },
    {
      label: '错误提示音',
      description: '节点执行失败时播放告警音',
      type: 'toggle',
      enabled: settings.error,
      onClick: () => updateSettings({ error: !settings.error }),
    },
  ];

  return <StaticSection section={{ id: 'sound', label: '声音设置', icon: 'sound', items }} />;
}

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-500 mt-1">配置账户、团队和首选项</p>
        </div>

        {/* 设置分区 */}
        <div className="space-y-4">
          {staticSections.map(s => (
            <StaticSection key={s.id} section={s} />
          ))}

          {/* 声音设置 */}
          <SoundSection />

          {/* 外观设置 */}
          <AppearanceSection />

          {/* 软件更新 */}
          <SoftwareUpdateSection />
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">保存设置</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">重置</button>
          </div>
          <button className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">删除账户</button>
        </div>
      </div>
    </div>
  );
}
