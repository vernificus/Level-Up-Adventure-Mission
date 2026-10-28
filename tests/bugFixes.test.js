import assert from 'node:assert';
import {
  normalizeStep,
  normalizeSteps,
  parseRosterLines
} from '../src/utils/textUtils.js';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  calculateStreak,
  reconcileRevocationState,
  calculateRewardState,
  calculatePathMastersProgress,
  resolveClassLearningPaths,
  getMostRecentMonday7am
} from '../src/utils/gameUtils.js';
import { isDocxFile } from '../src/utils/documentParser.js';
import { isAdminUser } from '../src/utils/authUtils.js';
import { DEFAULT_PATHS, LEVELS } from '../src/data/gameData.js';

console.log('Testing Core Bug Fixes with Real Production Imports...');

// ============================================================================
// Bug 2: Boss Level-Up Progression & Multi-Level Bonus Coins
// ============================================================================
{
  const oldXp = 0;
  const newXp = 500; // Crosses Level 1 (0 XP) -> Level 2 (200 XP, 25 coins) -> Level 3 (500 XP, 50 coins)
  const { oldLevel, newLevel, bonusCoins } = calculateLevelAndBonusCoins(oldXp, newXp, LEVELS);

  assert.strictEqual(oldLevel.level, 1, 'Starting level must be 1');
  assert.strictEqual(newLevel.level, 3, 'Must reach Level 3 (Challenger)');
  assert.strictEqual(bonusCoins, 75, 'Must accumulate coin rewards from Level 2 (25) and Level 3 (50)');
}

// ============================================================================
// Bug 3: Double XP Token Consumption
// ============================================================================
{
  const prevState = {
    xp: 500,
    doubleXpActive: true,
    completedActivities: [],
    totalActivitiesCompleted: 0
  };
  const submission = { activityId: 'act-1', xp: 100, pathId: 'path1' };

  const updatedState = calculateRewardState(prevState, submission, { today: '2026-10-28' });

  assert.strictEqual(updatedState.xp, 700, 'Double XP active must double 100 XP to 200 XP (500 + 200 = 700)');
  assert.strictEqual(updatedState.doubleXpActive, false, 'doubleXpActive must be consumed and set to false');
}

// ============================================================================
// Bug 4: Streak Shield Consumption & Club Window Protection
// ============================================================================
{
  // Test 4A: Within 8-day window, streak increments and shield remains active
  const stateInWindow = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-21' };
  const resInWindow = calculateStreak(stateInWindow, '2026-10-28'); // 7 days diff
  assert.strictEqual(resInWindow.newStreak, 6, 'Streak must increment within 8 days');
  assert.strictEqual(resInWindow.streakShieldActive, true, 'Shield must not be consumed when diff <= 8');

  // Test 4B: Beyond 8 days with shield active, streak is preserved and shield is consumed
  const stateBeyondWindow = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-01' };
  const resBeyondWindow = calculateStreak(stateBeyondWindow, '2026-10-28'); // 27 days diff
  assert.strictEqual(resBeyondWindow.newStreak, 5, 'Streak must be protected by shield');
  assert.strictEqual(resBeyondWindow.streakShieldActive, false, 'Shield must be consumed');

  // Test 4C: Beyond 8 days without shield, streak resets to 1
  const stateNoShield = { currentStreak: 5, streakShieldActive: false, lastActivityDate: '2026-10-01' };
  const resNoShield = calculateStreak(stateNoShield, '2026-10-28');
  assert.strictEqual(resNoShield.newStreak, 1, 'Streak must reset to 1 without shield');
}

// ============================================================================
// Bug 6: Submission Revocation Reconciliation & Boss Asymmetry Guard
// ============================================================================
{
  // Test 6A: Regular submission revocation decrements totalActivitiesCompleted and pathCompletions
  const prevStudentState = {
    xp: 650,
    totalActivitiesCompleted: 5,
    completedActivities: ['act-1', 'act-2'],
    completedBossChallenges: [],
    pathCompletions: { path1: 3, path2: 2 }
  };
  const regularSub = { id: 'sub-1', activityId: 'act-1', pathId: 'path1', xp: 150, isBoss: false };

  const reconciledRegular = reconcileRevocationState(prevStudentState, regularSub);
  assert.strictEqual(reconciledRegular.xp, 500, 'XP must be reduced by 150');
  assert.strictEqual(reconciledRegular.totalActivitiesCompleted, 4, 'totalActivitiesCompleted must decrement for regular activity');
  assert.deepStrictEqual(reconciledRegular.completedActivities, ['act-2']);
  assert.strictEqual(reconciledRegular.pathCompletions.path1, 2, 'pathCompletions for path1 must decrement by 1');
  assert.strictEqual(reconciledRegular.pathCompletions.path2, 2, 'pathCompletions for path2 must be untouched');

  // Test 6B: Boss challenge revocation does NOT decrement totalActivitiesCompleted or pathCompletions
  const prevBossState = {
    xp: 1200,
    totalActivitiesCompleted: 5,
    completedActivities: ['act-1'],
    completedBossChallenges: ['boss-w1', 'boss-w2'],
    pathCompletions: { path1: 2 }
  };
  const bossSub = { id: 'sub-boss-1', activityId: 'boss-w1', xp: 300, isBoss: true };

  const reconciledBoss = reconcileRevocationState(prevBossState, bossSub);
  assert.strictEqual(reconciledBoss.xp, 900, 'Boss XP must be deducted');
  assert.strictEqual(reconciledBoss.totalActivitiesCompleted, 5, 'CRITICAL: Boss revocation must NOT decrement totalActivitiesCompleted');
  assert.deepStrictEqual(reconciledBoss.completedBossChallenges, ['boss-w2']);
  assert.strictEqual(reconciledBoss.pathCompletions.path1, 2, 'pathCompletions must not be modified by boss revocation');

  // Test 6C: Underflow protection - metrics clamp at 0
  const lowState = {
    xp: 50,
    totalActivitiesCompleted: 0,
    completedActivities: [],
    guild: 'makers',
    guildXpContributed: 20
  };
  const excessiveSub = { id: 'sub-ex', activityId: 'act-x', xp: 500, isBoss: false };
  const reconciledClamp = reconcileRevocationState(lowState, excessiveSub);
  assert.strictEqual(reconciledClamp.xp, 0, 'XP must never drop below 0');
  assert.strictEqual(reconciledClamp.totalActivitiesCompleted, 0, 'totalActivitiesCompleted must never drop below 0');
  assert.strictEqual(reconciledClamp.guildXpContributed, 0, 'guildXpContributed must never drop below 0');
}

// ============================================================================
// Bug 7: Guild Path Masters Distinct Learning Paths Calculation
// ============================================================================
{
  // Guild members with 4 activities on the same path (path1)
  const membersSinglePath = [
    { completedActivities: ['path1-1', 'path1-2', 'path1-3', 'path1-4'] }
  ];
  const qualifyingSingle = calculatePathMastersProgress(membersSinglePath, DEFAULT_PATHS, 2);
  assert.strictEqual(qualifyingSingle, 1, '4 activities on path1 must count as 1 distinct path');

  // Guild members with activities across 3 distinct paths
  const membersMultiPath = [
    { completedActivities: ['path1-1', 'path1-2', 'path2-1', 'path2-2'] },
    { completedActivities: ['path3-1', 'path3-2'] }
  ];
  const qualifyingMulti = calculatePathMastersProgress(membersMultiPath, DEFAULT_PATHS, 2);
  assert.strictEqual(qualifyingMulti, 3, 'Activities across 3 distinct paths must count as 3 qualifying paths');
}

// ============================================================================
// Bug 8: Document Importer .docx Binary File Guard
// ============================================================================
{
  assert.strictEqual(isDocxFile('lesson-plan.docx'), true);
  assert.strictEqual(isDocxFile('curriculum.DOCX'), true);
  assert.strictEqual(isDocxFile('legacy-unit.doc'), true);
  assert.strictEqual(isDocxFile('notes.txt'), false);
  assert.strictEqual(isDocxFile('guide.pdf'), false);
  assert.strictEqual(isDocxFile(''), false);
  assert.strictEqual(isDocxFile(null), false);
}

// ============================================================================
// Bug 9: Bulk Roster Single-Column Parsing with Default PIN
// ============================================================================
{
  const rawRoster = `
    Alice Smith, 4567
    Bob Jones
    
    Charlie Brown, 9999
    Diana Prince
  `;
  const parsed = parseRosterLines(rawRoster);

  assert.strictEqual(parsed.length, 4, 'Must parse all 4 valid student lines');
  assert.deepStrictEqual(parsed[0], { name: 'Alice Smith', pass: '4567' });
  assert.deepStrictEqual(parsed[1], { name: 'Bob Jones', pass: '1234' }, 'Single-column line must default PIN to 1234');
  assert.deepStrictEqual(parsed[2], { name: 'Charlie Brown', pass: '9999' });
  assert.deepStrictEqual(parsed[3], { name: 'Diana Prince', pass: '1234' }, 'Single-column line must default PIN to 1234');
}

// ============================================================================
// Step Normalization Type Guarantee (Finding 3 Remediation)
// ============================================================================
{
  // Object with null and numeric properties must be strictly coerced
  const rawStep = { text: 'Build solar car', link: null, completed: 0 };
  const normalized = normalizeStep(rawStep);

  assert.strictEqual(normalized.text, 'Build solar car');
  assert.strictEqual(normalized.link, '', 'Null link must coerce to empty string');
  assert.strictEqual(normalized.linkText, '', 'Missing linkText must default to empty string');
  assert.strictEqual(normalized.completed, false, '0 completed must coerce to boolean false');

  // Extra properties must still be preserved
  const stepWithCustom = normalizeStep({ text: 'Do research', customId: 99, completed: true });
  assert.strictEqual(stepWithCustom.customId, 99);
  assert.strictEqual(stepWithCustom.completed, true);

  // Array normalization
  const stepList = normalizeSteps([rawStep, null, '', { text: 'Test code' }]);
  assert.strictEqual(stepList.length, 2);
  assert.strictEqual(stepList[0].text, 'Build solar car');
  assert.strictEqual(stepList[1].text, 'Test code');
}

// ============================================================================
// Admin Authorization Verification
// ============================================================================
{
  assert.strictEqual(isAdminUser({ role: 'super_admin' }), true);
  assert.strictEqual(isAdminUser({ role: 'admin' }), true);
  assert.strictEqual(isAdminUser({ email: 'matthew.harbert@lcps.org' }), true);
  assert.strictEqual(isAdminUser({ email: 'propellevelup@lcps.org' }), true);
  assert.strictEqual(isAdminUser({ role: 'student', email: 'student@lcps.org' }), false);
  assert.strictEqual(isAdminUser(null), false);
}

// ============================================================================
// Learning Path Resolution & Weekly Monday 7 AM Invariant
// ============================================================================
{
  const paths = resolveClassLearningPaths(null, DEFAULT_PATHS);
  assert.strictEqual(paths.length, DEFAULT_PATHS.length);

  const monday = getMostRecentMonday7am(new Date('2026-10-28T12:00:00Z'));
  assert.strictEqual(monday.getDay(), 1, 'Must be Monday (day index 1)');
  assert.strictEqual(monday.getHours(), 7, 'Must be 7 AM');
}

console.log('✔ All Core Bug Fixes verified successfully with real production code!');
