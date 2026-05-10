import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface SoundSettings {
  nodeComplete: boolean;
  workflowComplete: boolean;
  error: boolean;
}

interface SoundContextValue {
  settings: SoundSettings;
  updateSettings: (patch: Partial<SoundSettings>) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'workflow-editor-sound';

const DEFAULT_SETTINGS: SoundSettings = {
  nodeComplete: true,
  workflowComplete: true,
  error: true,
};

function loadSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: SoundSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return (
    <SoundContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSoundSettings must be used within SoundProvider');
  return ctx;
}
