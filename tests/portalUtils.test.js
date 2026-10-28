/**
 * portalUtils.test.js — Milestone 2 usability enhancements.
 *
 * Every assertion below executes the real production helpers in src/utils/portalUtils.js,
 * which are the functions LoginScreen.jsx, TeacherPortal.jsx and App.jsx call at runtime.
 * A small wiring section at the end checks those components still import and call the helpers
 * (so the UI cannot silently drift back to private inline copies of this logic).
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  filterRosterByName,
  getVisibilityInputType,
  getVisibilityToggleLabel,
  calculateBatchTotalXp,
  getVisibleSelectedSubmissions,
  isAllPendingSelected,
  computeBatchSelectionState,
  toggleSelectAllPending,
  pruneSelectedSubmissionIds,
  DEFAULT_REVISION_FEEDBACK,
  QUICK_REVISION_CHIPS,
  resolveRevisionFeedback,
  calculatePathProgressStats,
  filterLearningPathsByChip,
  toggleLearningPathFilter,
  parseRedemptionTimeMs,
  formatRedemptionDate,
  getRedemptionStatusBadge,
  sortRedemptionsDescending,
  filterAndSortRedemptions,
  formatLiveAnnouncement
} from '../src/utils/portalUtils.js';

console.log('\n==========================================');
console.log('Running Milestone 2 (M2) portalUtils Suite');
console.log('==========================================\n');

// ── FE-1: Roster search ──
console.log('Testing FE-1 roster search (filterRosterByName)...');
{
  const roster = [
    { id: 's1', name: 'Alex Johnson' },
    { id: 's2', name: 'Beatrix Potter' },
    { id: 's3', name: 'Charlie Alexander' },
    { id: 's4', name: 'Dana Scully' },
    { id: 's5', name: 'José Ñúñez' },
    { id: 's6', name: 'Kim (K.) O\'Neil' }
  ];

  assert.strictEqual(filterRosterByName(roster, ''), roster, 'empty query returns the roster unchanged');
  assert.strictEqual(filterRosterByName(roster, '   ').length, roster.length, 'whitespace-only query returns everyone');
  assert.strictEqual(filterRosterByName(roster, undefined).length, roster.length);
  assert.deepStrictEqual(filterRosterByName(roster, 'alex').map(s => s.id), ['s1', 's3'], 'case-insensitive substring match');
  assert.deepStrictEqual(filterRosterByName(roster, '  SCULLY ').map(s => s.id), ['s4'], 'trims and ignores case');
  assert.deepStrictEqual(filterRosterByName(roster, 'ñúñ').map(s => s.id), ['s5'], 'unicode names');
  assert.deepStrictEqual(filterRosterByName(roster, '(k.)').map(s => s.id), ['s6'], 'regex metacharacters are literal');
  for (const ch of ['.*', '[', '\\', '^', '$', '?', '+', '|', '{']) {
    assert.doesNotThrow(() => filterRosterByName(roster, ch), `query "${ch}" must not throw`);
  }
  assert.strictEqual(filterRosterByName(roster, 'Nobody Here').length, 0, 'no match -> empty list for empty state');

  const malformed = [{ id: 'a', name: null }, { id: 'b' }, null, { id: 'c', name: 12345 }, { id: 'd', name: 'Valid Kid' }];
  assert.deepStrictEqual(filterRosterByName(malformed, 'valid').map(s => s.id), ['d'], 'null/missing names are skipped safely');
  assert.deepStrictEqual(filterRosterByName(malformed, '234').map(s => s.id), ['c'], 'numeric names are searchable');
  assert.deepStrictEqual(filterRosterByName(null, 'x'), [], 'non-array roster -> []');

  const big = Array.from({ length: 10000 }, (_, i) => ({ id: `id${i}`, name: `Student Name ${i}` }));
  const t0 = Date.now();
  assert.strictEqual(filterRosterByName(big, 'name 9999').length, 1);
  assert.ok(Date.now() - t0 < 500, '10k roster search stays fast');
  console.log('✓ FE-1 passed');
}

// ── FE-2: Password / PIN visibility ──
console.log('Testing FE-2 visibility toggles...');
{
  assert.strictEqual(getVisibilityInputType(false), 'password');
  assert.strictEqual(getVisibilityInputType(true), 'text');
  assert.strictEqual(getVisibilityInputType(undefined), 'password', 'hidden by default');
  assert.strictEqual(getVisibilityToggleLabel(false), 'Show password');
  assert.strictEqual(getVisibilityToggleLabel(true), 'Hide password');
  assert.strictEqual(getVisibilityToggleLabel(false, true), 'Show PIN');
  assert.strictEqual(getVisibilityToggleLabel(true, true), 'Hide PIN');
  console.log('✓ FE-2 passed');
}

// ── FE-3: Batch review ──
console.log('Testing FE-3 batch review selection & XP...');
{
  const subs = [
    { id: 'p1', studentId: 'alice', xp: 50, status: 'pending' },
    { id: 'p2', studentId: 'alice', xpReward: 100, status: 'pending' },
    { id: 'p3', studentId: 'bob', status: 'pending' },               // default activity XP: 50
    { id: 'p4', studentId: 'bob', isBoss: true, status: 'pending' }, // default boss XP: 300
    { id: 'p5', studentId: 'bob', xp: '25', status: 'pending' },     // numeric string
    { id: 'p6', studentId: 'bob', xp: 'abc', status: 'pending' },    // garbage -> 0
    { id: 'a1', studentId: 'alice', xp: 75, status: 'approved' }
  ];

  assert.strictEqual(calculateBatchTotalXp([]), 0);
  assert.strictEqual(calculateBatchTotalXp(null), 0);
  assert.strictEqual(calculateBatchTotalXp(subs.slice(0, 6)), 50 + 100 + 50 + 300 + 25 + 0);
  assert.strictEqual(calculateBatchTotalXp(subs, new Set(['p1', 'p2'])), 150, 'only selected IDs count');
  assert.strictEqual(calculateBatchTotalXp(subs, ['p4']), 300, 'arrays work as selection too');
  assert.strictEqual(calculateBatchTotalXp(subs, new Set()), 0, 'empty selection -> 0');

  assert.deepStrictEqual(getVisibleSelectedSubmissions(subs, new Set(['p3', 'zzz'])).map(s => s.id), ['p3']);
  assert.deepStrictEqual(getVisibleSelectedSubmissions(subs, null), []);

  const pending = subs.filter(s => s.status === 'pending');
  assert.strictEqual(isAllPendingSelected(pending, new Set()), false);
  assert.strictEqual(isAllPendingSelected([], new Set(['p1'])), false, 'nothing pending -> never "all selected"');
  assert.strictEqual(isAllPendingSelected(pending, new Set(pending.map(s => s.id))), true);

  // Select all, then toggle again to clear.
  let selected = toggleSelectAllPending(pending, new Set());
  assert.strictEqual(selected.size, pending.length);
  selected = toggleSelectAllPending(pending, selected);
  assert.strictEqual(selected.size, 0);
  assert.strictEqual(toggleSelectAllPending([], new Set()).size, 0, 'select-all on empty list is a no-op');

  // Ghost-selection regression: selections made under one student filter must not leak into another view.
  const allSelected = new Set(pending.map(s => s.id));
  const aliceView = pending.filter(s => s.studentId === 'alice');
  const state = computeBatchSelectionState(aliceView, allSelected);
  assert.strictEqual(state.visibleSelectedCount, 2, 'count is scoped to visible submissions');
  assert.deepStrictEqual(state.visibleSelectedSubs.map(s => s.id), ['p1', 'p2']);
  assert.strictEqual(state.isAllSelected, true);
  assert.deepStrictEqual(computeBatchSelectionState([], allSelected), { visibleSelectedSubs: [], visibleSelectedCount: 0, isAllSelected: false });

  // Toggling select-all in a filtered view only touches that view's IDs.
  const afterAliceToggle = toggleSelectAllPending(aliceView, allSelected);
  assert.ok(!afterAliceToggle.has('p1') && !afterAliceToggle.has('p2'));
  assert.ok(afterAliceToggle.has('p3'), 'other students stay selected');

  // Pruning removes reviewed or deleted submissions, in either argument order.
  const reviewedNow = subs.map(s => (s.id === 'p1' ? { ...s, status: 'approved' } : s)).filter(s => s.id !== 'p3');
  const pruned = pruneSelectedSubmissionIds(new Set(['p1', 'p2', 'p3']), reviewedNow);
  assert.deepStrictEqual([...pruned], ['p2']);
  assert.deepStrictEqual([...pruneSelectedSubmissionIds(reviewedNow, ['p1', 'p2'])], ['p2']);
  const untouched = new Set(['p2']);
  assert.strictEqual(pruneSelectedSubmissionIds(untouched, subs), untouched, 'unchanged selection keeps the same Set (no extra re-render)');
  assert.strictEqual(pruneSelectedSubmissionIds(new Set(), subs).size, 0);
  console.log('✓ FE-3 passed');
}

// ── FE-4: Revision feedback guardrail ──
console.log('Testing FE-4 revision feedback...');
{
  assert.strictEqual(resolveRevisionFeedback(''), DEFAULT_REVISION_FEEDBACK, 'empty -> constructive default');
  assert.strictEqual(resolveRevisionFeedback('   \n\t '), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback(null), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback(undefined), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback('  Add a photo.  '), 'Add a photo.', 'teacher text is trimmed, not replaced');
  assert.ok(Array.isArray(QUICK_REVISION_CHIPS) && QUICK_REVISION_CHIPS.length >= 3);
  for (const chip of QUICK_REVISION_CHIPS) {
    assert.strictEqual(resolveRevisionFeedback(chip), chip, 'each chip is valid feedback on its own');
  }
  console.log('✓ FE-4 passed');
}

// ── FE-6: Mobile category chips ──
console.log('Testing FE-6 category chips...');
{
  const paths = [
    { id: 'math', options: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] },
    { id: 'science', options: [{ id: 's1' }, { id: 's2' }] },
    { id: 'empty', options: [] },
    { id: 'noopts' }
  ];
  assert.deepStrictEqual(calculatePathProgressStats(paths[0], ['m1', 'm2'], []), { count: 2, total: 3, isComplete: false });
  assert.deepStrictEqual(calculatePathProgressStats(paths[1], ['s1'], ['s1', 's2']), { count: 2, total: 2, isComplete: true },
    'activities both completed and approved are counted once');
  assert.deepStrictEqual(calculatePathProgressStats(paths[2], ['m1'], []), { count: 0, total: 0, isComplete: false },
    'empty category is never "complete"');
  assert.deepStrictEqual(calculatePathProgressStats(paths[3]), { count: 0, total: 0, isComplete: false });
  assert.deepStrictEqual(calculatePathProgressStats(paths[0], undefined, null), { count: 0, total: 3, isComplete: false });

  assert.strictEqual(filterLearningPathsByChip(paths, 'all'), paths);
  assert.deepStrictEqual(filterLearningPathsByChip(paths, 'math').map(p => p.id), ['math']);
  assert.strictEqual(filterLearningPathsByChip(paths, 'deleted-category'), paths, 'stale filter falls back to all paths');
  assert.strictEqual(filterLearningPathsByChip(paths, undefined), paths);
  assert.deepStrictEqual(filterLearningPathsByChip(null, 'math'), []);

  assert.strictEqual(toggleLearningPathFilter('math', 'math'), 'all', 'tapping the active chip clears it');
  assert.strictEqual(toggleLearningPathFilter('all', 'science'), 'science');
  assert.strictEqual(toggleLearningPathFilter('math', 'science'), 'science');
  console.log('✓ FE-6 passed');
}

// ── FE-7: Redeemed rewards log ──
console.log('Testing FE-7 redemption history...');
{
  const iso = '2026-03-15T12:00:00.000Z';
  assert.strictEqual(parseRedemptionTimeMs({ seconds: 1700000000, nanoseconds: 500000000 }), 1700000000500);
  assert.strictEqual(parseRedemptionTimeMs({ _seconds: 1700000000 }), 1700000000000, 'admin-SDK timestamp shape');
  assert.strictEqual(parseRedemptionTimeMs({ toDate: () => new Date(iso) }), Date.parse(iso), 'Firestore Timestamp instance');
  assert.strictEqual(parseRedemptionTimeMs(iso), Date.parse(iso));
  assert.strictEqual(parseRedemptionTimeMs(new Date(iso)), Date.parse(iso));
  assert.strictEqual(parseRedemptionTimeMs('1700000000000'), 1700000000000, 'numeric string');
  for (const bad of [null, undefined, '', '   ', 'corrupted-timestamp', {}, NaN, Infinity, new Date('nope'), { toDate: () => { throw new Error('x'); } }, true]) {
    const ms = parseRedemptionTimeMs(bad);
    assert.ok(Number.isFinite(ms) && ms === 0, `invalid input ${String(bad)} must parse to 0, got ${ms}`);
  }

  assert.strictEqual(formatRedemptionDate({ redeemedAt: 'corrupted' }), 'Recently', 'never shows "Invalid Date"');
  assert.strictEqual(formatRedemptionDate({ redeemedAt: {} }), 'Recently');
  assert.strictEqual(formatRedemptionDate({ redeemedAt: null }), 'Recently');
  assert.strictEqual(formatRedemptionDate(null), 'Recently');
  assert.strictEqual(formatRedemptionDate({ redeemedAt: null }, 'Unknown'), 'Unknown', 'custom fallback');
  assert.strictEqual(formatRedemptionDate({ redeemedAt: { seconds: 1700000000 } }), new Date(1700000000000).toLocaleDateString());
  assert.strictEqual(formatRedemptionDate(iso), new Date(iso).toLocaleDateString(), 'raw timestamps are accepted too');

  assert.strictEqual(getRedemptionStatusBadge('fulfilled').label, '✓ Fulfilled');
  assert.strictEqual(getRedemptionStatusBadge('cancelled').label, '✕ Cancelled');
  assert.strictEqual(getRedemptionStatusBadge('pending').label, '⏳ Waiting for Teacher');
  assert.strictEqual(getRedemptionStatusBadge(undefined).label, '⏳ Waiting for Teacher', 'unknown status -> waiting');
  assert.ok(getRedemptionStatusBadge('fulfilled').className.includes('green'));

  // Sorting stays correct even with corrupted records mixed in (NaN comparators would break Array#sort).
  const mixed = [
    { id: 'old', redeemedAt: { seconds: 1600000000 } },
    { id: 'bad1', redeemedAt: 'garbage' },
    { id: 'new', redeemedAt: '2026-01-01T00:00:00Z' },
    { id: 'bad2', redeemedAt: {} },
    { id: 'mid', redeemedAt: 1650000000000 }
  ];
  const sorted = sortRedemptionsDescending(mixed).map(r => r.id);
  assert.deepStrictEqual(sorted.slice(0, 3), ['new', 'mid', 'old'], 'valid records newest first');
  assert.deepStrictEqual(sorted.slice(3).sort(), ['bad1', 'bad2'], 'corrupted records sink to the end');
  assert.deepStrictEqual(mixed.map(r => r.id), ['old', 'bad1', 'new', 'bad2', 'mid'], 'input array is not mutated');

  const all = [
    { id: 'r1', studentId: 'A', studentName: 'Alex', redeemedAt: { seconds: 1700000100 } },
    { id: 'r2', studentId: 'B', studentName: 'Bob', redeemedAt: { seconds: 1700000200 } },
    { id: 'r3', studentId: 'A', studentName: 'Alex', redeemedAt: { seconds: 1700000300 } },
    { id: 'r4', studentName: ' alex ', redeemedAt: { seconds: 1700000400 } }, // legacy record without studentId
    null
  ];
  assert.deepStrictEqual(filterAndSortRedemptions(all, 'A', 'Alex').map(r => r.id), ['r4', 'r3', 'r1'],
    'matches by id or (trimmed, case-insensitive) name, newest first');
  assert.deepStrictEqual(filterAndSortRedemptions(all, 'A', '').map(r => r.id), ['r3', 'r1']);
  assert.deepStrictEqual(filterAndSortRedemptions(all, 'Z', 'Zoe'), [], 'other students see nothing');
  assert.deepStrictEqual(filterAndSortRedemptions(all, undefined, undefined), [], 'no identity -> nothing (never everyone)');
  assert.deepStrictEqual(filterAndSortRedemptions(undefined, 'A', 'Alex'), []);
  console.log('✓ FE-7 passed');
}

// ── FE-10: Screen-reader announcements ──
console.log('Testing FE-10 live announcements...');
{
  assert.strictEqual(formatLiveAnnouncement('xp', { diff: 50, totalXp: 200 }), 'Earned 50 XP! Total XP: 200');
  assert.strictEqual(formatLiveAnnouncement('xp_gain', { diff: 5, total: 10 }), 'Earned 5 XP! Total XP: 10');
  assert.strictEqual(formatLiveAnnouncement('xp', { diff: 0, totalXp: 200 }), '', 'no change -> no announcement');
  assert.strictEqual(formatLiveAnnouncement('xp', { diff: -300, totalXp: 0 }), '', 'XP revocations are not announced as gains');
  assert.strictEqual(formatLiveAnnouncement('level_up', { newLevel: { level: 3, title: 'Quest Apprentice' } }),
    'Level Up! You reached Level 3: Quest Apprentice!');
  assert.strictEqual(formatLiveAnnouncement('level_up', { level: 4 }), 'Level Up! You reached Level 4: Adventurer!');
  assert.strictEqual(formatLiveAnnouncement('level_up', {}), '', 'missing level -> silent');
  assert.strictEqual(formatLiveAnnouncement('achievement', { showAchievement: { title: 'Streak Master' } }), 'Achievement Unlocked: Streak Master!');
  assert.strictEqual(formatLiveAnnouncement('achievement', { showAchievement: { name: 'First Steps' } }), 'Achievement Unlocked: First Steps!');
  assert.strictEqual(formatLiveAnnouncement('achievement', {}), 'Achievement Unlocked: New Badge!');
  assert.strictEqual(formatLiveAnnouncement('custom', { message: 'Hello' }), 'Hello');
  assert.strictEqual(formatLiveAnnouncement(undefined, {}), '');
  assert.strictEqual(formatLiveAnnouncement('xp', null), '');
  console.log('✓ FE-10 passed');
}

// ── Wiring: the UI must use these helpers rather than private copies ──
console.log('Testing component wiring...');
{
  const read = (p) => fs.readFileSync(path.resolve(p), 'utf-8');
  const usesAll = (file, src, names) => {
    for (const name of names) {
      const callCount = (src.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      assert.ok(callCount >= 2, `${file} must import AND use ${name} (found ${callCount} reference(s))`);
    }
  };
  const login = read('src/components/LoginScreen.jsx');
  const teacher = read('src/components/TeacherPortal.jsx');
  const app = read('src/App.jsx');
  const css = read('src/index.css');

  usesAll('LoginScreen.jsx', login, ['filterRosterByName', 'getVisibilityInputType', 'getVisibilityToggleLabel']);
  usesAll('TeacherPortal.jsx', teacher, ['calculateBatchTotalXp', 'computeBatchSelectionState', 'toggleSelectAllPending',
    'pruneSelectedSubmissionIds', 'resolveRevisionFeedback', 'QUICK_REVISION_CHIPS']);
  usesAll('App.jsx', app, ['calculatePathProgressStats', 'filterLearningPathsByChip', 'toggleLearningPathFilter',
    'filterAndSortRedemptions', 'formatRedemptionDate', 'getRedemptionStatusBadge', 'formatLiveAnnouncement']);

  // Markup-level requirements that have no pure-logic equivalent.
  assert.ok(/role="status"[\s\S]{0,80}aria-live="polite"/.test(app), 'App.jsx keeps a polite live region');
  assert.ok(app.includes('dataLoaded'), 'XP announcements wait for the saved profile to load');
  assert.ok(css.includes('focus-visible'), 'index.css provides visible keyboard focus styles');
  for (const [file, src] of [['TeacherPortal.jsx', teacher], ['AdminPortal.jsx', read('src/components/AdminPortal.jsx')]]) {
    assert.ok(src.includes('overflow-x-auto') && src.includes('whitespace-nowrap'), `${file} tabs scroll horizontally on small screens`);
  }
  console.log('✓ Component wiring passed');
}

console.log('\n✓ All Milestone 2 portalUtils tests passed!');

