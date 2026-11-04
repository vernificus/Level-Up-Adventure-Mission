import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import tailwindConfig from '../tailwind.config.js';
import {
  THEME_STORAGE_KEY,
  LIGHT_THEME_COLOR,
  DARK_THEME_COLOR,
  resolveInitialTheme,
  getNextTheme,
  getThemeToggleMeta,
} from '../src/utils/themeUtils.js';
import { getRedemptionStatusBadge } from '../src/utils/portalUtils.js';
import { renderFormattedText } from '../src/utils/textUtils.js';
import { LEVELS, AVATAR_ITEMS, MYSTERY_REWARDS } from '../src/data/gameData.js';

console.log('\n==========================================');
console.log('Testing Dark / Light Mode Theme System...');
console.log('==========================================\n');

// 1. Pure theme state & metadata resolution
{
  assert.strictEqual(THEME_STORAGE_KEY, 'lvlup_theme');
  assert.strictEqual(resolveInitialTheme(null), 'light', 'defaults to light mode when nothing stored');
  assert.strictEqual(resolveInitialTheme(undefined), 'light');
  assert.strictEqual(resolveInitialTheme(''), 'light');
  assert.strictEqual(resolveInitialTheme('invalid'), 'light', 'invalid storage values fall back to light');
  assert.strictEqual(resolveInitialTheme('light'), 'light');
  assert.strictEqual(resolveInitialTheme('dark'), 'dark', 'explicit dark mode stored preference is respected');

  assert.strictEqual(getNextTheme('light'), 'dark');
  assert.strictEqual(getNextTheme('dark'), 'light');
  assert.strictEqual(getNextTheme(undefined), 'dark');

  const lightMeta = getThemeToggleMeta('light');
  assert.strictEqual(lightMeta.isDark, false);
  assert.strictEqual(lightMeta.nextTheme, 'dark');
  assert.strictEqual(lightMeta.ariaLabel, 'Switch to dark mode');
  assert.strictEqual(lightMeta.actionLabel, 'Dark Mode');
  assert.strictEqual(lightMeta.metaThemeColor, LIGHT_THEME_COLOR);

  const darkMeta = getThemeToggleMeta('dark');
  assert.strictEqual(darkMeta.isDark, true);
  assert.strictEqual(darkMeta.nextTheme, 'light');
  assert.strictEqual(darkMeta.ariaLabel, 'Switch to light mode');
  assert.strictEqual(darkMeta.actionLabel, 'Light Mode');
  assert.strictEqual(darkMeta.metaThemeColor, DARK_THEME_COLOR);
  console.log('✓ Test 1: Pure theme resolution, toggling, and ARIA metadata verified');
}

// 2. Tailwind configuration & base CSS rules
{
  assert.strictEqual(tailwindConfig.darkMode, 'class', 'tailwind.config.js must enable class-based darkMode');
  const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
  assert.ok(indexCss.includes('html.dark') && indexCss.includes('color-scheme: dark'), 'index.css sets color-scheme: dark on html.dark');
  assert.ok(indexCss.includes('dark:bg-slate-900') && indexCss.includes('dark:text-slate-100'), 'body has dark surface and text classes');
  assert.ok(indexCss.includes('dark:ring-yellow-400') && indexCss.includes('dark:ring-offset-slate-900'), 'focus-visible ring adapts in dark mode');
  console.log('✓ Test 2: Tailwind darkMode: "class" and base CSS dark rules verified');
}

// 3. Shared data & utility dark class pairings
{
  for (const lvl of LEVELS) {
    assert.ok(lvl.color.includes('dark:text-'), `Level ${lvl.level} (${lvl.title}) color "${lvl.color}" must include a dark:text-* variant`);
  }
  for (const item of Object.values(AVATAR_ITEMS).flat()) {
    if (item.color) {
      assert.ok(item.color.includes('dark:text-'), `Avatar item ${item.id} color "${item.color}" must include dark:text-*`);
    }
  }
  for (const reward of MYSTERY_REWARDS) {
    if (reward.color) {
      assert.ok(reward.color.includes('dark:text-'), `Mystery reward ${reward.id} color "${reward.color}" must include dark:text-*`);
    }
  }

  for (const status of ['fulfilled', 'cancelled', 'pending']) {
    const badge = getRedemptionStatusBadge(status);
    assert.ok(badge.className.includes('dark:bg-') && badge.className.includes('dark:text-'), `Redemption badge (${status}) must include dark classes`);
  }

  const formatted = renderFormattedText('**Bold** and *italic*');
  const strongEl = formatted.find((el) => el.type === 'strong');
  const emEl = formatted.find((el) => el.type === 'em');
  assert.ok(strongEl.props.className.includes('dark:text-white'), 'strong formatted text has dark:text-white');
  assert.ok(emEl.props.className.includes('dark:text-slate-200'), 'em formatted text has dark:text-slate-200');
  console.log('✓ Test 3: Game data levels, rewards, badges, and text formatters include dark variants');
}

// 4. Component wiring & dark variant coverage across all views
{
  const read = (p) => fs.readFileSync(path.resolve(p), 'utf-8');

  const appSrc = read('src/App.jsx');
  const loginSrc = read('src/components/LoginScreen.jsx');
  const teacherSrc = read('src/components/TeacherPortal.jsx');
  const adminSrc = read('src/components/AdminPortal.jsx');

  assert.ok(appSrc.includes('<ThemeProvider>') && appSrc.includes('<ThemeToggle'), 'App.jsx mounts ThemeProvider and ThemeToggle');
  assert.ok(loginSrc.includes('<ThemeToggle'), 'LoginScreen.jsx renders ThemeToggle');
  assert.ok(teacherSrc.includes('<ThemeToggle'), 'TeacherPortal.jsx renders ThemeToggle');
  assert.ok(adminSrc.includes('<ThemeToggle'), 'AdminPortal.jsx renders ThemeToggle');

  const themedComponents = [
    'src/App.jsx',
    'src/components/ActivityDirectionsCard.jsx',
    'src/components/ActivityEditor.jsx',
    'src/components/AdminPortal.jsx',
    'src/components/ChoiceBoardExport.jsx',
    'src/components/ClubArenaModal.jsx',
    'src/components/DocumentImporterModal.jsx',
    'src/components/FileViewer.jsx',
    'src/components/GuildPanel.jsx',
    'src/components/Leaderboard.jsx',
    'src/components/LegalModal.jsx',
    'src/components/LevelEconomyGuideModal.jsx',
    'src/components/LoginScreen.jsx',
    'src/components/RosterManager.jsx',
    'src/components/StudentSubmissionsModal.jsx',
    'src/components/TeacherPortal.jsx',
  ];

  for (const file of themedComponents) {
    const src = read(file);
    assert.ok(src.includes('dark:'), `${file} must include dark:* utility classes`);
  }
  console.log('✓ Test 4: ThemeToggle placement and dark:* coverage verified across all 16 UI components');
}

console.log('\n✔ All Dark / Light Mode Theme tests passed successfully!\n');
