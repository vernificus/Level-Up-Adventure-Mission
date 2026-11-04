import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme, getThemeToggleMeta } from '../context/ThemeContext';

/**
 * Accessible Dark / Light Mode toggle button for Students, Teachers, and Admins.
 *
 * @param {Object} props
 * @param {boolean} [props.showLabel=false] - Whether to render a visible text label next to the icon
 * @param {string} [props.className=''] - Additional Tailwind classes for placement
 */
export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const { isDark, ariaLabel, actionLabel } = getThemeToggleMeta(theme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={ariaLabel}
      aria-pressed={isDark}
      title={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:hover:text-white dark:border-slate-700 shadow-sm ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-yellow-400 flex-shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 flex-shrink-0" aria-hidden="true" />
      )}
      {showLabel && <span>{actionLabel}</span>}
    </button>
  );
}

