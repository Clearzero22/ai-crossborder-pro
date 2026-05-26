/**
 * AI Provider API Key 配置组件
 *
 * 功能：
 * - 配置各个 AI Provider 的 API Key
 * - 测试连接
 * - 删除配置
 */

import { useState, useCallback } from 'react';
import { useAiKeySettings } from '../hooks/useAiKeySettings';

type ProviderName = 'qwen' | 'openai' | 'claude' | 'gemini';

interface ProviderFormData {
  apiKey: string;
  baseURL: string;
}

// Provider 图标组件
function ProviderIcon({ provider }: { provider: ProviderName }) {
  const icons: Record<ProviderName, { color: string; icon: string }> = {
    qwen: {
      color: '#1677FF',
      icon: 'Q',
    },
    openai: {
      color: '#10A37F',
      icon: 'O',
    },
    claude: {
      color: '#CC785C',
      icon: 'C',
    },
    gemini: {
      color: '#8E75B3',
      icon: 'G',
    },
  };

  const { color, icon } = icons[provider];

  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
  );
}

// 单个 Provider 配置卡片
function ProviderCard({
  provider,
  config,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onTest,
  saving,
  testing,
  testResult,
}: {
  provider: ProviderName;
  config: {
    name: ProviderName;
    label: string;
    description: string;
    hasKey: boolean;
    baseURL?: string;
    defaultBaseURL: string;
  };
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: ProviderFormData) => void;
  onDelete: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
  testResult: { success: boolean; message?: string; error?: string } | null;
}) {
  const [showKey, setShowKey] = useState(false);
  const [formData, setFormData] = useState<ProviderFormData>({
    apiKey: '',
    baseURL: config.baseURL || config.defaultBaseURL,
  });

  const handleSave = useCallback(() => {
    if (!formData.apiKey.trim()) return;
    onSave(formData);
  }, [formData, onSave]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-4 p-5 border-b border-gray-100">
        <ProviderIcon provider={provider} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{config.label}</h3>
            {config.hasKey && (
              <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                已配置
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && config.hasKey && (
            <>
              <button
                onClick={onTest}
                disabled={testing}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {testing ? '测试中...' : '测试'}
              </button>
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                修改
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                删除
              </button>
            </>
          )}
          {!isEditing && !config.hasKey && (
            <button
              onClick={onEdit}
              className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              配置
            </button>
          )}
        </div>
      </div>

      {/* 测试结果 */}
      {testResult && !isEditing && (
        <div className={`px-5 py-3 border-b ${testResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{testResult.message || '连接成功'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{testResult.error || '连接失败'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 编辑表单 */}
      {isEditing && (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={config.hasKey ? '留空保持现有配置' : '请输入 API Key'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              API Key 将被加密存储在本地数据库中
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Base URL <span className="text-gray-400">(可选)</span>
            </label>
            <input
              type="text"
              value={formData.baseURL}
              onChange={(e) => setFormData(prev => ({ ...prev, baseURL: e.target.value }))}
              placeholder={config.defaultBaseURL}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              留空使用默认值：{config.defaultBaseURL}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.apiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 主组件
export default function ApiKeyConfigSection() {
  const {
    providers,
    loading,
    error,
    saving,
    testing,
    testResults,
    updateProvider,
    deleteProvider,
    testProvider,
    clearTestResult,
  } = useAiKeySettings();

  const [editingProvider, setEditingProvider] = useState<ProviderName | null>(null);

  const handleEdit = useCallback((provider: ProviderName) => {
    clearTestResult(provider);
    setEditingProvider(provider);
  }, [clearTestResult]);

  const handleCancel = useCallback(() => {
    setEditingProvider(null);
  }, []);

  const handleSave = useCallback(async (provider: ProviderName, data: ProviderFormData) => {
    await updateProvider(provider, data);
    setEditingProvider(null);
  }, [updateProvider]);

  const handleDelete = useCallback(async (provider: ProviderName) => {
    if (confirm('确定要删除此 Provider 的配置吗？')) {
      await deleteProvider(provider);
    }
  }, [deleteProvider]);

  const handleTest = useCallback(async (provider: ProviderName) => {
    await testProvider(provider);
  }, [testProvider]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error && providers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center text-red-600">
          <p>加载失败: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <h2 className="font-semibold text-gray-900">AI Provider 配置</h2>
        {error && (
          <span className="ml-auto text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p>
            <strong>提示：</strong>配置 AI Provider 后，您可以在工作流中使用 AI 节点。
            API Key 将被加密存储在本地数据库中。
          </p>
        </div>

        <div className="space-y-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.name}
              provider={provider.name}
              config={provider}
              isEditing={editingProvider === provider.name}
              onEdit={() => handleEdit(provider.name)}
              onCancel={handleCancel}
              onSave={(data) => handleSave(provider.name, data)}
              onDelete={() => handleDelete(provider.name)}
              onTest={() => handleTest(provider.name)}
              saving={saving[provider.name]}
              testing={testing[provider.name]}
              testResult={testResults[provider.name]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
