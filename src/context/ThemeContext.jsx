import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  THEME_STORAGE_KEY,
  LIGHT_THEME_COLOR,
  DARK_THEME_COLOR,
  resolveInitialTheme,
  getNextTheme,
  getThemeToggleMeta,
} from '../utils/themeUtils';

export {
  THEME_STORAGE_KEY,
  LIGHT_THEME_COLOR,
  DARK_THEME_COLOR,
  resolveInitialTheme,
  getNextTheme,
  getThemeToggleMeta,
};

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return resolveInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
    return 'light';
  });

  useEffect(() => {
    const isDark = theme === 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
      }
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      return resolveInitialTheme(resolved);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => getNextTheme(prev));
  }, []);

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
