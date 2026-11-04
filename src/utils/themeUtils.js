export const THEME_STORAGE_KEY = 'lvlup_theme';
export const LIGHT_THEME_COLOR = '#F6F7FB';
export const DARK_THEME_COLOR = '#1B2340';

/**
 * Pure helper to resolve the initial theme value.
 * Defaults to 'light' (the current layout/theme) unless 'dark' is explicitly stored.
 *
 * @param {string|null|undefined} storedValue
 * @returns {'light'|'dark'}
 */
export function resolveInitialTheme(storedValue) {
  return storedValue === 'dark' ? 'dark' : 'light';
}

/**
 * Pure helper to compute the next theme when toggling.
 *
 * @param {'light'|'dark'|string} currentTheme
 * @returns {'light'|'dark'}
 */
export function getNextTheme(currentTheme) {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

/**
 * Pure helper returning accessible metadata for the theme toggle button.
 *
 * @param {'light'|'dark'|string} currentTheme
 * @returns {{ isDark: boolean, nextTheme: 'light'|'dark', ariaLabel: string, statusLabel: string, actionLabel: string, metaThemeColor: string }}
 */
export function getThemeToggleMeta(currentTheme) {
  const isDark = currentTheme === 'dark';
  return {
    isDark,
    nextTheme: isDark ? 'light' : 'dark',
    ariaLabel: isDark ? 'Switch to light mode' : 'Switch to dark mode',
    statusLabel: isDark ? 'Dark' : 'Light',
    actionLabel: isDark ? 'Light Mode' : 'Dark Mode',
    metaThemeColor: isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
  };
}

