import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

type BrowserMode = 'system-chrome' | 'playwright-chromium';

interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
}

interface ChromeStatus {
  exists: boolean;
  path: string;
}

interface PlaywrightStatus {
  installed: boolean;
  executablePath: string | null;
}

interface TestResult {
  success: boolean;
  version?: string;
  browserName?: string;
  error?: string;
}

interface DownloadProgress {
  percent: number;
  stage: string;
}

interface BrowserContextValue {
  settings: BrowserSettings;
  chromeStatus: ChromeStatus;
  playwrightStatus: PlaywrightStatus;
  chromiumVersion: string;
  loading: boolean;
  error: string | null;
  testResult: TestResult | null;
  testing: boolean;
  downloading: boolean;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<BrowserSettings>) => Promise<void>;
  testBrowser: () => Promise<void>;
  downloadPlaywright: (targetPath: string) => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BrowserSettings>({ mode: 'system-chrome', playwrightPath: '' });
  const [chromeStatus, setChromeStatus] = useState<ChromeStatus>({ exists: false, path: '' });
  const [playwrightStatus, setPlaywrightStatus] = useState<PlaywrightStatus>({ installed: false, executablePath: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [chromiumVersion, setChromiumVersion] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/settings/browser`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data.settings);
      setChromeStatus(data.status.chrome);
      setPlaywrightStatus(data.status.playwright);
    } catch (err) {
      // Silently fail settings load
    }

    try {
      const vres = await fetch(`${API_BASE}/settings/browser/versions`);
      if (vres.ok) {
        const vdata = await vres.json();
        setChromiumVersion(vdata.chromium.version);
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (patch: Partial<BrowserSettings>) => {
    try {
      const res = await fetch(`${API_BASE}/settings/browser`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data.settings);
      await refresh();
    } catch (err) {
      setError(String(err));
    }
  }, [refresh]);

  const testBrowser = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/browser/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: String(err) });
    } finally {
      setTesting(false);
    }
  }, []);

  const downloadPlaywright = useCallback(async (targetPath: string) => {
    if (downloading) return;

    setDownloading(true);
    setDownloadProgress({ percent: 0, stage: '开始下载...' });
    setDownloadError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/settings/browser/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'progress') {
            setDownloadProgress({ percent: data.percent, stage: data.stage });
          } else if (data.type === 'complete') {
            setDownloadProgress({ percent: 100, stage: '安装完成' });
          } else if (data.type === 'error') {
            setDownloadError(data.error);
          }
        }
      }

      await refresh();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setDownloadError(String(err));
      }
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  }, [downloading, refresh]);

  useEffect(() => {
    refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  return (
    <BrowserContext.Provider value={{
      settings, chromeStatus, playwrightStatus, chromiumVersion, loading, error,
      testResult, testing, downloading, downloadProgress, downloadError,
      refresh, updateSettings, testBrowser, downloadPlaywright,
    }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserSettings(): BrowserContextValue {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error('useBrowserSettings must be used within BrowserSettingsProvider');
  return ctx;
}
