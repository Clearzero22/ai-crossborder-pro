/**
 * AI API Key 设置管理 Hook
 *
 * 功能：
 * - 获取所有 Provider 的配置状态
 * - 更新/删除 Provider 的 API Key
 * - 测试 Provider 连接
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

type ProviderName = 'qwen' | 'openai' | 'claude' | 'gemini';

interface ProviderConfig {
  name: ProviderName;
  label: string;
  description: string;
  hasKey: boolean;
  baseURL?: string;
  defaultBaseURL: string;
}

interface ProviderFormData {
  apiKey: string;
  baseURL: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface AiKeyContextValue {
  providers: ProviderConfig[];
  loading: boolean;
  error: string | null;
  saving: Record<ProviderName, boolean>;
  testing: Record<ProviderName, boolean>;
  testResults: Record<ProviderName, TestResult | null>;
  refresh: () => Promise<void>;
  updateProvider: (provider: ProviderName, data: ProviderFormData) => Promise<void>;
  deleteProvider: (provider: ProviderName) => Promise<void>;
  testProvider: (provider: ProviderName) => Promise<void>;
  clearTestResult: (provider: ProviderName) => void;
}

const AiKeyContext = createContext<AiKeyContextValue | null>(null);

export function AiKeySettingsProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<ProviderName, boolean>>({
    qwen: false, openai: false, claude: false, gemini: false,
  });
  const [testing, setTesting] = useState<Record<ProviderName, boolean>>({
    qwen: false, openai: false, claude: false, gemini: false,
  });
  const [testResults, setTestResults] = useState<Record<ProviderName, TestResult | null>>({
    qwen: null, openai: null, claude: null, gemini: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/settings/ai-keys`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
      } else {
        throw new Error(data.error || 'Failed to load providers');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProvider = useCallback(async (provider: ProviderName, data: ProviderFormData) => {
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`${API_BASE}/settings/ai-keys/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: data.apiKey,
          baseURL: data.baseURL || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `HTTP ${res.status}`);
      }
      // 刷新列表
      await refresh();
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  }, [refresh]);

  const deleteProvider = useCallback(async (provider: ProviderName) => {
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`${API_BASE}/settings/ai-keys/${provider}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `HTTP ${res.status}`);
      }
      // 刷新列表
      await refresh();
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  }, [refresh]);

  const testProvider = useCallback(async (provider: ProviderName) => {
    setTesting(prev => ({ ...prev, [provider]: true }));
    setTestResults(prev => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(`${API_BASE}/settings/ai-keys/${provider}/test`, {
        method: 'POST',
      });
      const result = await res.json();
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: result.success,
          message: result.message,
          error: result.error,
        },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          error: String(err),
        },
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  }, []);

  const clearTestResult = useCallback((provider: ProviderName) => {
    setTestResults(prev => ({ ...prev, [provider]: null }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AiKeyContext.Provider value={{
      providers,
      loading,
      error,
      saving,
      testing,
      testResults,
      refresh,
      updateProvider,
      deleteProvider,
      testProvider,
      clearTestResult,
    }}>
      {children}
    </AiKeyContext.Provider>
  );
}

export function useAiKeySettings(): AiKeyContextValue {
  const ctx = useContext(AiKeyContext);
  if (!ctx) throw new Error('useAiKeySettings must be used within AiKeySettingsProvider');
  return ctx;
}
