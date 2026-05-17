import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// 主题切换
// 管理亮色/暗色主题 + 主色调(蓝色/靛蓝/紫/绿/橙)
// 主题设置自动保存到 localStorage 里面
// 刷新之后仍然保持不变
// 使用位置 App.tsx -> ThemeProvider -> 包裹整个应用
type ThemeMode = 'light' | 'dark';
export type PrimaryColor = 'blue' | 'indigo' | 'violet' | 'emerald' | 'orange';

interface ThemeContextValue {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
}

const STORAGE_KEY = 'workflow-editor-theme';

function loadTheme(): { mode: ThemeMode; primaryColor: PrimaryColor } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { mode: 'light', primaryColor: 'blue' };
}

function saveTheme(mode: ThemeMode, primaryColor: PrimaryColor) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, primaryColor })); } catch { /* ignore */ }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(loadTheme);

  // 同步 dark class 和 primaryColor 到 html 元素
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme.mode === 'dark');
    root.setAttribute('data-primary', theme.primaryColor);
    saveTheme(theme.mode, theme.primaryColor);
  }, [theme]);

  const toggleMode = useCallback(() => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setTheme(prev => ({ ...prev, mode }));
  }, []);

  const setPrimaryColor = useCallback((primaryColor: PrimaryColor) => {
    setTheme(prev => ({ ...prev, primaryColor }));
  }, []);

  return (
    <ThemeContext.Provider value={{ ...theme, toggleMode, setMode, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
