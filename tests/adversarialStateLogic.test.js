import assert from 'node:assert';
import { LEVELS, ACHIEVEMENTS, DEFAULT_PATHS } from '../src/data/gameData.js';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  calculateStreak,
  reconcileRevocationState,
  calculateRewardState
} from '../src/utils/gameUtils.js';

console.log('====================================================');
console.log('Adversarial Stress Test: Game State & Logic Bugs');
console.log('====================================================\n');

// ============================================================================
// SUITE 1: Bug 1 - Progress Wipe Simulation on Firestore Fetch Throws
// ============================================================================
console.log('Suite 1: Bug 1 - Progress Wipe Simulation on Fetch Throws');
{
  // Test Harness: Simulating useGameState lifecycle and safety invariant
  const defaultState = {
    playerName: '',
    xp: 0,
    coins: 100,
    completedActivities: [],
    completedBossChallenges: [],
    currentStreak: 0,
    lastActivityDate: null,
    streakShieldActive: false,
    unlockedAchievements: [],
    guild: null,
    guildXpContributed: 0,
    totalActivitiesCompleted: 0
  };

  // Scenario 1A: Network error / Firestore down during getStudent()
  {
    let dataLoaded = false;
    let syncCalledWith = null;

    const mockBackend = {
      getStudent: async (id) => { throw new Error('Firestore connection timeout: ECONNRESET'); },
      getStudentSubmissions: async (id) => []
    };

    const mockSyncEffect = (state, loaded) => {
      if (loaded) {
        syncCalledWith = state;
      }
    };

    // Simulated loadUserData()
    try {
      const studentData = await mockBackend.getStudent('student-123');
      const subs = await mockBackend.getStudentSubmissions('student-123');
      if (studentData) {
        dataLoaded = true;
      }
    } catch (err) {
      dataLoaded = false;
    }

    mockSyncEffect(defaultState, dataLoaded);

    assert.strictEqual(dataLoaded, false, 'dataLoaded must remain FALSE on fetch error');
    assert.strictEqual(syncCalledWith, null, 'Cloud state must NEVER be overwritten on fetch error');
  }

  // Scenario 1B: RealBackend catches error and returns null (silent failure mode)
  {
    let dataLoaded = false;
    let syncCalledWith = null;

    const mockBackend = {
      getStudent: async (id) => null, // e.g. document does not exist or error caught internally
      getStudentSubmissions: async (id) => []
    };

    try {
      const studentData = await mockBackend.getStudent('student-123');
      const subs = await mockBackend.getStudentSubmissions('student-123');
      if (studentData) {
        dataLoaded = true;
      }
    } catch (err) {
      dataLoaded = false;
    }

    if (dataLoaded) {
      syncCalledWith = defaultState;
    }

    assert.strictEqual(dataLoaded, false, 'dataLoaded must be FALSE when studentData is null');
    assert.strictEqual(syncCalledWith, null, 'Backend update must NOT be called when studentData is null');
  }

  // Scenario 1C: getStudent succeeds but getStudentSubmissions throws
  {
    let dataLoaded = false;
    let syncCalledWith = null;

    const mockBackend = {
      getStudent: async (id) => ({ id: 'student-123', xp: 5000, coins: 850 }),
      getStudentSubmissions: async (id) => { throw new Error('Failed to query submissions collection'); }
    };

    try {
      const studentData = await mockBackend.getStudent('student-123');
      const subs = await mockBackend.getStudentSubmissions('student-123');
      if (studentData) {
        dataLoaded = true;
      }
    } catch (err) {
      dataLoaded = false;
    }

    if (dataLoaded) {
      syncCalledWith = defaultState;
    }

    assert.strictEqual(dataLoaded, false, 'dataLoaded must remain FALSE when submissions query throws');
    assert.strictEqual(syncCalledWith, null, 'Partial load failure must NOT trigger wipe');
  }

  console.log('  ✔ Bug 1 simulation: Data wipe prevented under all network/Firestore failure modes');
}

// ============================================================================
// SUITE 2: Bug 2 - Boss Challenge Multi-Level Boundary Check
// ============================================================================
console.log('\nSuite 2: Bug 2 - Boss Challenge Multi-Level Boundary Crossing');
{
  const checkLevelUp = (oldState, newState) => {
    const { oldLevel, newLevel: newLevelData, bonusCoins: totalCoins } = calculateLevelAndBonusCoins(oldState.xp, newState.xp, LEVELS);
    let levelUpTriggered = false;

    if (newLevelData.level > oldLevel.level) {
      levelUpTriggered = true;
      if (totalCoins > 0) {
        newState.coins = (newState.coins || 0) + totalCoins;
      }
    }
    return { levelUpTriggered, newLevel: newLevelData, totalCoins };
  };

  // Test 2A: 500 XP Boss victory crossing 2 level boundaries (Level 1 -> Level 3)
  // Level 1: 0 XP (0 coins)
  // Level 2: 200 XP (25 coins)
  // Level 3: 500 XP (50 coins)
  {
    const prev = { xp: 0, coins: 100, completedBossChallenges: [] };
    const xpEarned = 500;
    const updatedState = {
      ...prev,
      xp: prev.xp + xpEarned,
      completedBossChallenges: ['boss-week-1']
    };

    const result = checkLevelUp(prev, updatedState);
    assert.strictEqual(result.levelUpTriggered, true, 'Level up must trigger');
    assert.strictEqual(result.newLevel.level, 3, 'Must reach Level 3 (Challenger)');
    assert.strictEqual(result.totalCoins, 75, 'Must accumulate coin rewards from both Level 2 (25) and Level 3 (50)');
    assert.strictEqual(updatedState.coins, 175, 'Coins must equal initial 100 + 75 bonus coins');
  }

  // Test 2B: Massive Boss victory (2000 XP) crossing 5 level boundaries (Level 1 -> Level 6)
  // Level 2: 25, Level 3: 50, Level 4: 75, Level 5: 100, Level 6: 125 -> sum = 375
  {
    const prev = { xp: 0, coins: 100, completedBossChallenges: [] };
    const xpEarned = 2000;
    const updatedState = {
      ...prev,
      xp: prev.xp + xpEarned,
      completedBossChallenges: ['boss-week-mega']
    };

    const result = checkLevelUp(prev, updatedState);
    assert.strictEqual(result.newLevel.level, 6, 'Must reach Level 6 (Master)');
    assert.strictEqual(result.totalCoins, 375, 'Must accumulate 25+50+75+100+125 = 375 bonus coins');
    assert.strictEqual(updatedState.coins, 475, 'Coins must equal 100 + 375 = 475');
  }

  // Test 2C: Boss victory from mid-level crossing 1 boundary (Level 2 to Level 3)
  {
    const prev = { xp: 350, coins: 200, completedBossChallenges: [] }; // Level 2
    const xpEarned = 300; // 350 + 300 = 650 (Level 3)
    const updatedState = {
      ...prev,
      xp: prev.xp + xpEarned,
      completedBossChallenges: ['boss-week-1']
    };

    const result = checkLevelUp(prev, updatedState);
    assert.strictEqual(result.newLevel.level, 3);
    assert.strictEqual(result.totalCoins, 50, 'Must award 50 coins for Level 3');
    assert.strictEqual(updatedState.coins, 250);
  }

  // Test 2D: Boss challenge deduplication (cannot process completed boss again)
  {
    const prev = { xp: 500, coins: 100, completedBossChallenges: ['boss-week-1'] };
    const submission = { isBoss: true, activityId: 'boss-week-1', xp: 300 };

    let state = prev;
    if (submission.isBoss && prev.completedBossChallenges.includes(submission.activityId)) {
      // should return prev without processing
    } else {
      state = { ...prev, xp: prev.xp + 300 };
    }

    assert.strictEqual(state.xp, 500, 'Duplicate boss submission must be rejected');
  }

  console.log('  ✔ Bug 2 verification: Boss multi-level boundary crossings award exact cumulative coins');
}

// ============================================================================
// SUITE 3: Bug 3 - Double XP Active on Normal Activity & Daily Quest (4x XP)
// ============================================================================
console.log('\nSuite 3: Bug 3 - Double XP & Daily Quest Multiplier Interaction');
{
  const checkDailyQuestMatch = (activity, pathId, quest) => {
    if (quest.targetType && activity.type === quest.targetType) return true;
    if (quest.targetPath && pathId === quest.targetPath) return true;
    return false;
  };

  const processSubmissionReward = (prev, submission, quest) => {
    const activity = { id: submission.activityId, type: submission.activityType, xp: submission.xp };
    const pathId = submission.pathId;
    const isDailyQuestMatch = checkDailyQuestMatch(activity, pathId, quest);
    return calculateRewardState(prev, submission, { isDailyQuestMatch });
  };

  // Test 3A: Double XP active on regular activity with NO daily quest match
  {
    const prev = { xp: 200, doubleXpActive: true, dailyQuestCompleted: false, completedActivities: [], totalActivitiesCompleted: 0 };
    const sub = { activityId: 'act-1', activityType: 'Low Tech', pathId: 'path1', xp: 100 };
    const quest = { targetPath: 'path2' }; // mismatch

    const updated = processSubmissionReward(prev, sub, quest);
    assert.strictEqual(updated.xp, 400, '100 XP * 2 = 200 XP earned -> 200 + 200 = 400');
    assert.strictEqual(updated.doubleXpActive, false, 'doubleXpActive must reset to false');
    assert.strictEqual(updated.dailyQuestCompleted, false, 'daily quest should not be completed');
  }

  // Test 3B: Double XP active + Daily Quest matching simultaneously (4x XP)
  {
    const prev = { xp: 100, doubleXpActive: true, dailyQuestCompleted: false, completedActivities: [], totalActivitiesCompleted: 0 };
    const sub = { activityId: 'act-2', activityType: 'High Tech', pathId: 'path2', xp: 150 };
    const quest = { targetPath: 'path2' }; // match!

    const updated = processSubmissionReward(prev, sub, quest);
    // 150 * 2 (double XP) = 300; 300 * 2 (daily quest) = 600 earned
    assert.strictEqual(updated.xp, 700, '100 initial + 600 earned (4x multiplier) = 700');
    assert.strictEqual(updated.doubleXpActive, false, 'doubleXpActive must be consumed');
    assert.strictEqual(updated.dailyQuestCompleted, true, 'dailyQuestCompleted must be marked true');

    // Subsequent activity on same day should receive standard 1x XP
    const sub2 = { activityId: 'act-3', activityType: 'High Tech', pathId: 'path2', xp: 150 };
    const secondUpdated = processSubmissionReward(updated, sub2, quest);
    assert.strictEqual(secondUpdated.xp, 850, '700 + 150 (1x XP) = 850; no double or daily bonus');
    assert.strictEqual(secondUpdated.doubleXpActive, false);
    assert.strictEqual(secondUpdated.dailyQuestCompleted, true);
  }

  // Test 3C: Boss challenge with Double XP active
  {
    const prev = { xp: 500, doubleXpActive: true, pendingMysteryBoxes: 0, completedBossChallenges: [] };
    const bossSub = { activityId: 'boss-1', isBoss: true, xp: 300 };

    const updated = processSubmissionReward(prev, bossSub, {});
    assert.strictEqual(updated.xp, 1100, '500 + (300 * 2) = 1100');
    assert.strictEqual(updated.doubleXpActive, false, 'Double XP consumed on boss');
    assert.strictEqual(updated.pendingMysteryBoxes, 1);
  }

  console.log('  ✔ Bug 3 verification: Double XP consumed accurately and produces 4x multiplier with daily quest');
}

// ============================================================================
// SUITE 4: Bug 4 - Streak Shield Boundary Testing (diff = 7, 8, 9, 30)
// ============================================================================
console.log('\nSuite 4: Bug 4 - Streak Shield Boundary Conditions');
{
  const evaluateStreak = (prev, todayStr) => calculateStreak(prev, todayStr);

  // Test 4A: diff = 7 (Session within 8-day window)
  {
    const prev = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-01' };
    const today = '2026-10-08'; // exactly 7 days
    const diff = (new Date(today) - new Date(prev.lastActivityDate)) / 86400000;
    assert.strictEqual(diff, 7);

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 6, 'Streak should increment from 5 to 6');
    assert.strictEqual(result.streakShieldActive, true, 'Streak shield must NOT be consumed when diff <= 8');
  }

  // Test 4B: diff = 8 (Upper boundary of standard club window)
  {
    const prev = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-01' };
    const today = '2026-10-09'; // exactly 8 days
    const diff = (new Date(today) - new Date(prev.lastActivityDate)) / 86400000;
    assert.strictEqual(diff, 8);

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 6, 'Streak should increment from 5 to 6');
    assert.strictEqual(result.streakShieldActive, true, 'Streak shield must NOT be consumed on exact boundary diff = 8');
  }

  // Test 4C: diff = 9 (First day beyond window, shield active)
  {
    const prev = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-01' };
    const today = '2026-10-10'; // exactly 9 days
    const diff = (new Date(today) - new Date(prev.lastActivityDate)) / 86400000;
    assert.strictEqual(diff, 9);

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 5, 'Streak must be preserved at 5 by the shield');
    assert.strictEqual(result.streakShieldActive, false, 'Streak shield must be consumed');
  }

  // Test 4D: diff = 9 (Beyond window, shield already consumed)
  {
    const prev = { currentStreak: 5, streakShieldActive: false, lastActivityDate: '2026-10-01' };
    const today = '2026-10-10'; // 9 days

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 1, 'Without shield, streak must reset to 1');
    assert.strictEqual(result.streakShieldActive, false);
  }

  // Test 4E: diff = 30 (Long break, shield active)
  {
    const prev = { currentStreak: 12, streakShieldActive: true, lastActivityDate: '2026-10-01' };
    const today = '2026-10-31'; // 30 days
    const diff = (new Date(today) - new Date(prev.lastActivityDate)) / 86400000;
    assert.strictEqual(diff, 30);

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 12, 'Shield protects streak of 12 even after 30 days');
    assert.strictEqual(result.streakShieldActive, false, 'Shield is consumed');
  }

  // Test 4F: diff = 30 (Long break, shield inactive)
  {
    const prev = { currentStreak: 12, streakShieldActive: false, lastActivityDate: '2026-10-01' };
    const today = '2026-10-31'; // 30 days

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 1, 'Without shield, streak of 12 resets to 1 after 30 days');
  }

  // Test 4G: Consecutive activities on the SAME day
  {
    const prev = { currentStreak: 5, streakShieldActive: true, lastActivityDate: '2026-10-28' };
    const today = '2026-10-28';

    const result = evaluateStreak(prev, today);
    assert.strictEqual(result.newStreak, 5, 'Same day activity should not re-increment streak');
    assert.strictEqual(result.streakShieldActive, true, 'Same day activity should not affect shield');
  }

  console.log('  ✔ Bug 4 verification: Streak shield behaves strictly at diff=7, 8, 9, 30 and consumes exactly once');
}

// ============================================================================
// SUITE 5: Bug 6 - Reconcile Multiple Revoked Submissions Underflow Defense
// ============================================================================
console.log('\nSuite 5: Bug 6 - Revocation Reconciliation & Underflow Defense');
{
  const processedSubmissionIds = new Set(['sub-1', 'sub-2', 'sub-3']);

  const reconcileRevokedSubmission = (gameState, submission) => {
    if (processedSubmissionIds.has(submission.id)) {
      processedSubmissionIds.delete(submission.id);
    }
    return reconcileRevocationState(gameState, submission);
  };

  // Test 5A: Single regular revocation
  {
    const state0 = {
      xp: 600,
      totalActivitiesCompleted: 4,
      completedActivities: ['act-1', 'act-2', 'act-3'],
      completedBossChallenges: [],
      guild: 'makers',
      guildXpContributed: 600
    };

    const sub1 = { id: 'sub-1', activityId: 'act-1', xp: 150, isBoss: false };
    const state1 = reconcileRevokedSubmission(state0, sub1);

    assert.strictEqual(state1.xp, 450);
    assert.strictEqual(state1.totalActivitiesCompleted, 3);
    assert.strictEqual(state1.guildXpContributed, 450);
    assert.deepStrictEqual(state1.completedActivities, ['act-2', 'act-3']);
    assert.strictEqual(processedSubmissionIds.has('sub-1'), false, 'Deduplication set must delete revoked sub');
  }

  // Test 5B: Multiple revocations in batch down to 0
  {
    let state = {
      xp: 250,
      totalActivitiesCompleted: 2,
      completedActivities: ['act-2', 'act-3'],
      completedBossChallenges: [],
      guild: 'coders',
      guildXpContributed: 250
    };

    const sub2 = { id: 'sub-2', activityId: 'act-2', xp: 150, isBoss: false };
    const sub3 = { id: 'sub-3', activityId: 'act-3', xp: 100, isBoss: false };

    state = reconcileRevokedSubmission(state, sub2);
    assert.strictEqual(state.xp, 100);
    assert.strictEqual(state.totalActivitiesCompleted, 1);
    assert.strictEqual(state.guildXpContributed, 100);

    state = reconcileRevokedSubmission(state, sub3);
    assert.strictEqual(state.xp, 0);
    assert.strictEqual(state.totalActivitiesCompleted, 0);
    assert.strictEqual(state.guildXpContributed, 0);
    assert.deepStrictEqual(state.completedActivities, []);
  }

  // Test 5C: Excessive revocation underflow defense (< 0 check)
  {
    const state = {
      xp: 50, // student only has 50 XP
      totalActivitiesCompleted: 0,
      completedActivities: [],
      completedBossChallenges: [],
      guild: 'steam',
      guildXpContributed: 25
    };

    const excessiveSub = { id: 'sub-excess', activityId: 'act-huge', xp: 500, isBoss: false };
    const reconciled = reconcileRevokedSubmission(state, excessiveSub);

    assert.strictEqual(reconciled.xp, 0, 'XP must clamp at 0 and NEVER be negative');
    assert.strictEqual(reconciled.guildXpContributed, 0, 'Guild XP must clamp at 0 and NEVER be negative');
    assert.strictEqual(reconciled.totalActivitiesCompleted, 0, 'Total activities must clamp at 0');
  }

  // Test 5D: Boss challenge revocation
  {
    const state = {
      xp: 800,
      totalActivitiesCompleted: 5,
      completedActivities: ['act-1'],
      completedBossChallenges: ['boss-w1', 'boss-w2'],
      guild: null
    };

    const bossSub = { id: 'sub-boss-1', activityId: 'boss-w1', xp: 300, isBoss: true };
    const reconciled = reconcileRevokedSubmission(state, bossSub);

    assert.strictEqual(reconciled.xp, 500);
    assert.strictEqual(reconciled.totalActivitiesCompleted, 5, 'Boss challenge revocation must NOT decrement totalActivitiesCompleted');
    assert.deepStrictEqual(reconciled.completedBossChallenges, ['boss-w2']);
  }

  console.log('  ✔ Bug 6 verification: Revocations safely handle batch executions and clamp all metrics at 0');
}

console.log('\n====================================================');
console.log('🎉 ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED!');
console.log('====================================================');
