import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../utils/storage';
import { ThemeContext, type Theme } from './theme-context';

const STORAGE_KEY = 'helios.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (readStorage(STORAGE_KEY) === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1311' : '#f3f5f3');
    writeStorage(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
