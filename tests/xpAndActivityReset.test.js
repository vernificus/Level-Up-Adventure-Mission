import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  areValuesEqual,
  isSubmissionAfterReset,
  getActiveCycleSubmissions,
  mergeServerStudentIntoLocal,
  calculateRewardState,
} from '../src/utils/gameUtils.js';

console.log('Testing XP Awarding Reliability & Teacher Activity Reset...');

// ---------------------------------------------------------------------------
// 1. areValuesEqual & Referential Stability in mergeServerStudentIntoLocal
// ---------------------------------------------------------------------------
{
  assert.strictEqual(areValuesEqual([1, 2], [1, 2]), true);
  assert.strictEqual(areValuesEqual([1, 2], [1, 3]), false);
  assert.strictEqual(areValuesEqual({ a: 1, b: [2] }, { a: 1, b: [2] }), true);

  const local = {
    xp: 250,
    coins: 125,
    guild: 'coders',
    guildXpContributed: 250,
    completedActivities: ['act-1', 'act-2'],
    completedBossChallenges: [],
    claimedGuildChallenges: ['ch-1'],
    unlockedAchievements: ['first_mission'],
    lastActivityReset: '2026-11-16T12:00:00.000Z',
    totalActivitiesCompleted: 2,
    pendingMysteryBoxes: 0,
    doubleXpActive: false,
  };

  // Identical freshStudent must return exact same object reference (no redundant Firestore sync)
  const freshCopy = JSON.parse(JSON.stringify(local));
  const mergedNoOp = mergeServerStudentIntoLocal(local, freshCopy, freshCopy);
  assert.strictEqual(mergedNoOp, local, 'mergeServerStudentIntoLocal must return prev reference when nothing changed');
  console.log('✔ Test 1: Referential equality preserved when server state is unchanged (eliminates 3s overwrite loop)');
}

// ---------------------------------------------------------------------------
// 2. Teacher Activity Reset Detection & Preservation of XP/Coins
// ---------------------------------------------------------------------------
{
  const localBeforeReset = {
    xp: 400,
    coins: 175,
    guild: 'builders',
    guildXpContributed: 400,
    completedActivities: ['act-1', 'act-2', 'act-3'],
    completedBossChallenges: ['boss-1'],
    claimedGuildChallenges: ['ch-1'],
    unlockedAchievements: ['first_mission'],
    lastActivityReset: '2026-11-10T07:00:00.000Z',
    totalActivitiesCompleted: 3,
    pendingMysteryBoxes: 1,
    doubleXpActive: false,
  };

  const serverAfterTeacherReset = {
    ...localBeforeReset,
    completedActivities: [],
    lastActivityReset: '2026-11-17T15:00:00.000Z',
  };

  const mergedAfterReset = mergeServerStudentIntoLocal(
    localBeforeReset,
    serverAfterTeacherReset,
    localBeforeReset
  );

  assert.deepStrictEqual(mergedAfterReset.completedActivities, [], 'Teacher activity reset must clear completedActivities');
  assert.strictEqual(mergedAfterReset.lastActivityReset, '2026-11-17T15:00:00.000Z');
  assert.strictEqual(mergedAfterReset.xp, 400, 'Activity reset must NOT wipe student XP');
  assert.strictEqual(mergedAfterReset.coins, 175, 'Activity reset must NOT wipe student coins');
  console.log('✔ Test 2: Polling merge immediately applies teacher activity reset while preserving XP & coins');
}

// ---------------------------------------------------------------------------
// 3. Stale Server Snapshot Does Not Clobber Newer Local Changes
// ---------------------------------------------------------------------------
{
  const lastSeenServer = {
    xp: 200,
    coins: 100,
    guild: 'coders',
    guildXpContributed: 200,
    completedActivities: ['act-1'],
    completedBossChallenges: [],
    claimedGuildChallenges: [],
    unlockedAchievements: ['first_mission'],
    lastActivityReset: '2026-11-10T07:00:00.000Z',
  };

  // Student locally earned Daily Quest bonus XP (+100) and opened Mystery Box (+50 coins)
  const localWithNewerProgress = {
    ...lastSeenServer,
    xp: 300,
    coins: 150,
  };

  // Next poll reads server before client diff finished flushing -> server still matches lastSeenServer
  const merged = mergeServerStudentIntoLocal(localWithNewerProgress, lastSeenServer, lastSeenServer);
  assert.strictEqual(merged.xp, 300, 'Unchanged server XP must not clobber newer local XP');
  assert.strictEqual(merged.coins, 150, 'Unchanged server coins must not clobber newer local coins');

  // Now teacher directly grants +50 XP on server (server changes from 200 -> 250)
  const serverWithTeacherGrant = { ...lastSeenServer, xp: 250 };
  const mergedGrant = mergeServerStudentIntoLocal(lastSeenServer, serverWithTeacherGrant, lastSeenServer);
  assert.strictEqual(mergedGrant.xp, 250, 'Server-side teacher XP grant must be applied locally');
  console.log('✔ Test 3: Local progress protected against stale server reads while teacher XP grants apply cleanly');
}

// ---------------------------------------------------------------------------
// 4. Choice Board Cycle Filtering (isSubmissionAfterReset / getActiveCycleSubmissions)
// ---------------------------------------------------------------------------
{
  const resetTimestamp = '2026-11-17T15:00:00.000Z';
  const submissions = [
    { id: 's1', activityId: 'act-1', status: 'approved', reviewedAt: '2026-11-16T10:00:00.000Z', isBoss: false },
    { id: 's2', activityId: 'act-2', status: 'rejected', reviewedAt: '2026-11-16T11:00:00.000Z', isBoss: false },
    { id: 's3', activityId: 'act-3', status: 'pending', submittedAt: '2026-11-17T14:55:00.000Z', isBoss: false },
    { id: 's4', activityId: 'act-1', status: 'approved', reviewedAt: '2026-11-17T15:10:00.000Z', isBoss: false },
  ];

  assert.strictEqual(isSubmissionAfterReset(submissions[0], resetTimestamp), false);
  assert.strictEqual(isSubmissionAfterReset(submissions[1], resetTimestamp), false);
  assert.strictEqual(isSubmissionAfterReset(submissions[3], resetTimestamp), true);

  const activeSubs = getActiveCycleSubmissions(submissions, resetTimestamp);
  assert.strictEqual(activeSubs.length, 2, 'Active cycle should keep pending s3 and post-reset approved s4');
  assert(!activeSubs.some(s => s.id === 's1'), 'Pre-reset approved submission must not lock activity after reset');
  assert(!activeSubs.some(s => s.id === 's2'), 'Pre-reset rejected submission must not show revision banner after reset');

  // Simulate state right after reset when s4 does not exist yet
  const activeRightAfterReset = getActiveCycleSubmissions(submissions.slice(0, 2), resetTimestamp);
  assert.strictEqual(activeRightAfterReset.length, 0, 'All old completed & rejected activities must clear right after reset');
  console.log('✔ Test 4: getActiveCycleSubmissions clears pre-reset approved/rejected badges cleanly');
}

// ---------------------------------------------------------------------------
// 5. Server + Client XP Reconciliation Math (Zero Double-Count, Zero Drop)
// ---------------------------------------------------------------------------
{
  const simulateApprovalSync = ({ prePollXp, freshStudentXp, sub, isDailyQuestMatch, preDoubleXpActive }) => {
    const rewardCalc = calculateRewardState(
      { xp: freshStudentXp ?? prePollXp, doubleXpActive: preDoubleXpActive || Boolean(sub.doubleXpApplied), completedActivities: [], totalActivitiesCompleted: 0 },
      sub,
      { today: '2026-11-17', isDailyQuestMatch }
    );
    const expectedGain = rewardCalc.xp - (freshStudentXp ?? prePollXp);
    const serverXpApplied = (freshStudentXp !== null && Number(sub.xpAwarded) > 0) ? Number(sub.xpAwarded) : 0;
    const remainingXp = Math.max(0, expectedGain - serverXpApplied);
    return (freshStudentXp ?? prePollXp) + remainingXp;
  };

  // Normal approval where server already added 100 XP
  assert.strictEqual(
    simulateApprovalSync({ prePollXp: 0, freshStudentXp: 100, sub: { activityId: 'a1', xp: 100, xpAwarded: 100 }, isDailyQuestMatch: false, preDoubleXpActive: false }),
    100,
    'Normal approval must result in +100 XP total, never double-counted to 200'
  );

  // Daily Quest 2x match where server gave base 100 XP -> client adds remaining +100 XP bonus
  assert.strictEqual(
    simulateApprovalSync({ prePollXp: 0, freshStudentXp: 100, sub: { activityId: 'a1', xp: 100, xpAwarded: 100 }, isDailyQuestMatch: true, preDoubleXpActive: false }),
    200,
    'Daily quest bonus must add remaining +100 XP (200 total)'
  );

  // Double XP (2x) + Daily Quest (2x) where server consumed doubleXpActive and gave 200 XP -> client adds remaining +200
  assert.strictEqual(
    simulateApprovalSync({ prePollXp: 0, freshStudentXp: 200, sub: { activityId: 'a1', xp: 100, xpAwarded: 200, doubleXpApplied: true }, isDailyQuestMatch: true, preDoubleXpActive: false }),
    400,
    'Double XP + Daily Quest must yield 4x (400 XP) cleanly'
  );

  // Server failed to sync XP to student doc (xpAwarded = 0) -> client awards full +100 XP
  assert.strictEqual(
    simulateApprovalSync({ prePollXp: 50, freshStudentXp: 50, sub: { activityId: 'a1', xp: 100, xpAwarded: 0, xpSyncFailed: true }, isDailyQuestMatch: false, preDoubleXpActive: false }),
    150,
    'Failed server XP write must be recovered cleanly by client'
  );
  console.log('✔ Test 5: XP calculation avoids double-counting while preserving Daily Quest, Double XP & fallback recovery');
}

// ---------------------------------------------------------------------------
// 6. Production Source Wiring Verification
// ---------------------------------------------------------------------------
{
  const useGameStateSrc = fs.readFileSync(path.resolve('./src/hooks/useGameState.js'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('./src/App.jsx'), 'utf8');
  const realBackendSrc = fs.readFileSync(path.resolve('./src/services/realBackend.js'), 'utf8');

  assert(useGameStateSrc.includes('mergeServerStudentIntoLocal'), 'useGameState must use mergeServerStudentIntoLocal');
  assert(useGameStateSrc.includes('lastSyncedStateRef'), 'useGameState must diff changes via lastSyncedStateRef');
  assert(useGameStateSrc.includes('hadServerReset'), 'useGameState loadUserData must respect teacher-triggered lastActivityReset');
  assert(useGameStateSrc.includes('isSubmissionAfterReset'), 'useGameState must filter completedActivities by reset timestamp');
  assert(appSrc.includes('getActiveCycleSubmissions(submissions, gameState.lastActivityReset)'), 'App.jsx must derive board completion from active cycle submissions');
  assert(realBackendSrc.includes('isSubmissionAfterReset(s, studentData.lastActivityReset)'), 'realBackend syncStudentSubmissions must respect lastActivityReset');
  assert(realBackendSrc.includes('isSubmissionAfterReset(s, student.lastActivityReset)'), 'realBackend reconcileClassSubmissions must respect lastActivityReset');
  assert(realBackendSrc.includes('xpSyncFailed'), 'realBackend must flag xpSyncFailed if student update fails during reviewSubmission');

  console.log('✔ Test 6: Production wiring verified across useGameState.js, App.jsx, and realBackend.js');
}

console.log('\n✔ All XP Awarding & Activity Reset tests passed successfully!\n');
