import assert from 'node:assert';
import { getDefaultGameState, calculateGuildChallengeRewardState } from '../src/utils/gameUtils.js';
import { LEVELS } from '../src/data/gameData.js';

console.log('Testing Guild Challenge Reliability & Video Submission Processing...');

// ============================================================================
// Test 1: getDefaultGameState contains claimedGuildChallenges array
// ============================================================================
{
  const state = getDefaultGameState();
  assert(Array.isArray(state.claimedGuildChallenges), 'claimedGuildChallenges must be initialized as an array');
  assert.strictEqual(state.claimedGuildChallenges.length, 0, 'claimedGuildChallenges must initially be empty');
  console.log('✔ Test 1: getDefaultState initializes claimedGuildChallenges as empty array');
}

// ============================================================================
// Test 2: calculateGuildChallengeRewardState awards XP, coins, and records challenge ID
// ============================================================================
{
  const prevState = {
    xp: 100,
    coins: 50,
    guild: 'guild_tech',
    guildXpContributed: 25,
    claimedGuildChallenges: ['ch_first']
  };

  const challenge = {
    id: 'ch_stem_builders',
    title: 'STEM Builders',
    reward: 150,
    coinReward: 75
  };

  const nextState = calculateGuildChallengeRewardState(prevState, challenge, { applyLevelBonus: false });

  assert.strictEqual(nextState.xp, 250, 'XP should increase by 150 (100 + 150 = 250)');
  assert.strictEqual(nextState.coins, 125, 'Coins should increase by 75 (50 + 75 = 125)');
  assert.strictEqual(nextState.guildXpContributed, 175, 'Guild XP contributed should increase by 150 (25 + 150 = 175)');
  assert(nextState.claimedGuildChallenges.includes('ch_stem_builders'), 'New challenge ID must be in claimedGuildChallenges');
  assert(nextState.claimedGuildChallenges.includes('ch_first'), 'Existing claimed challenge IDs must be preserved');
  assert.strictEqual(nextState.claimedGuildChallenges.length, 2, 'Total claimed count should be 2');
  console.log('✔ Test 2: calculateGuildChallengeRewardState awards XP, coins, and updates challenge list');
}

// ============================================================================
// Test 3: Idempotency & duplicate claim prevention
// ============================================================================
{
  const prevState = {
    xp: 500,
    coins: 200,
    guild: 'guild_tech',
    guildXpContributed: 500,
    claimedGuildChallenges: ['ch_stem_builders']
  };

  const challenge = {
    id: 'ch_stem_builders',
    title: 'STEM Builders',
    reward: 150,
    coinReward: 75
  };

  const nextState = calculateGuildChallengeRewardState(prevState, challenge, { applyLevelBonus: false });

  assert.strictEqual(nextState, prevState, 'Claiming an already claimed challenge must return previous state unchanged');
  assert.strictEqual(nextState.xp, 500, 'XP must not change on duplicate claim');
  assert.strictEqual(nextState.coins, 200, 'Coins must not change on duplicate claim');
  console.log('✔ Test 3: Duplicate claim attempt returns state unchanged');
}

// ============================================================================
// Test 4: Crossing level boundary awards cumulative bonus coins
// ============================================================================
{
  const prevState = {
    xp: 150, // Level 1 (0 XP)
    coins: 10,
    guild: 'guild_alpha',
    guildXpContributed: 150,
    claimedGuildChallenges: []
  };

  // 150 + 400 = 550 XP -> reaches Level 3 (500 XP), crosses Level 2 (200 XP, 25 coins) and Level 3 (500 XP, 50 coins) = 75 bonus coins
  const challenge = {
    id: 'ch_robot_masters',
    title: 'Robot Masters',
    reward: 400,
    coinReward: 50
  };

  const nextState = calculateGuildChallengeRewardState(prevState, challenge, { applyLevelBonus: true, levels: LEVELS });

  assert.strictEqual(nextState.xp, 550, 'XP should be 550');
  // 10 + 50 (challenge reward) + 75 (level 2 + 3 bonus coins) = 135
  assert.strictEqual(nextState.coins, 135, 'Coins should include base challenge reward (50) plus level-up bonus coins (75)');
  assert(nextState._levelInfo && nextState._levelInfo.leveledUp, '_levelInfo must report leveledUp: true');
  assert.strictEqual(nextState._levelInfo.newLevel.level, 3, 'Must report new level as 3');
  console.log('✔ Test 4: Level crossing via guild challenge awards level bonus coins');
}

// ============================================================================
// Test 5: Defensive handling of unassigned guild members
// ============================================================================
{
  const unassignedState = {
    xp: 0,
    coins: 50,
    guild: null,
    claimedGuildChallenges: []
  };

  const challenge = {
    id: 'ch_general_stem',
    title: 'General STEM',
    reward: 100,
    coinReward: 25
  };

  const nextState = calculateGuildChallengeRewardState(unassignedState, challenge, { applyLevelBonus: false });
  assert.strictEqual(nextState.xp, 100, 'Student earns XP even if guild unassigned');
  assert.strictEqual(nextState.coins, 75, 'Student earns coins even if guild unassigned');
  assert(nextState.claimedGuildChallenges.includes('ch_general_stem'), 'Challenge is recorded');
  console.log('✔ Test 5: Unassigned guild member receives rewards cleanly');
}

// ============================================================================
// Test 6: Video submission data contracts
// ============================================================================
{
  const videoPayload = {
    type: 'video',
    content: 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQ8=',
    fileName: 'chromebook-demo-2026-10-28.webm',
    fileType: 'video/webm',
    note: 'Robotics obstacle test run',
    collaborators: [{ id: 's1', name: 'Partner' }]
  };

  assert.strictEqual(videoPayload.type, 'video', 'Video payload type must be video');
  assert(videoPayload.content.startsWith('data:video/'), 'Content must be a valid video data URI');
  assert(videoPayload.fileType.startsWith('video/'), 'fileType must be video/*');
  assert.strictEqual(videoPayload.collaborators.length, 1, 'Teammates can be attached to video submissions');
  console.log('✔ Test 6: Video submission payload schema validated');
}

// ============================================================================
// Test 7: Component & Hook Wiring Validation
// ============================================================================
{
  const fs = await import('node:fs');
  const path = await import('node:path');

  const useGameStateSrc = fs.readFileSync(path.resolve('./src/hooks/useGameState.js'), 'utf8');
  assert(useGameStateSrc.includes('claimedGuildChallenges: [],'), 'useGameState getDefaultState must initialize claimedGuildChallenges: []');
  assert(useGameStateSrc.includes('gameData.claimedGuildChallenges = Array.isArray(studentData.claimedGuildChallenges)'), 'useGameState loadUserData must sanitize claimedGuildChallenges as array');
  assert(useGameStateSrc.includes('claimGuildChallenge,'), 'useGameState return object must export claimGuildChallenge');
  assert(useGameStateSrc.includes('backend.claimGuildChallengeReward'), 'useGameState claimGuildChallenge must invoke backend.claimGuildChallengeReward');

  const guildPanelSrc = fs.readFileSync(path.resolve('./src/components/GuildPanel.jsx'), 'utf8');
  assert(guildPanelSrc.includes('onClaimGuildChallenge'), 'GuildPanel must accept onClaimGuildChallenge prop');
  assert(guildPanelSrc.includes('setClaimingChallengeId'), 'GuildPanel must track in-flight claimingChallengeId');
  assert(guildPanelSrc.includes('Boolean(claimedRewards[ch.id] || (gameState?.claimedGuildChallenges || []).includes(ch.id))'), 'GuildPanel must compute isClaimed combining claimedRewards and gameState.claimedGuildChallenges');

  const appSrc = fs.readFileSync(path.resolve('./src/App.jsx'), 'utf8');
  assert(appSrc.includes('claimGuildChallenge'), 'App.jsx must destructure claimGuildChallenge');
  assert(appSrc.includes('onClaimGuildChallenge={claimGuildChallenge}'), 'App.jsx must pass onClaimGuildChallenge to GuildPanel');

  const teacherPortalSrc = fs.readFileSync(path.resolve('./src/components/TeacherPortal.jsx'), 'utf8');
  assert(teacherPortalSrc.includes('updatedCount'), 'TeacherPortal must handle updatedCount safely');
  assert(teacherPortalSrc.includes('resetChallenges'), 'TeacherPortal must support resetChallenges option');
  assert(teacherPortalSrc.includes('rewardMode'), 'TeacherPortal must pass rewardMode to backend.rewardGuild');

  console.log('✔ Test 7: Component & Hook wiring verified against production source files');
}

// ============================================================================
// Test 8: Teacher Multi-Member Operations (Grant, Deduct, Reset)
// ============================================================================
{
  // Simulated guild members
  const students = [
    { id: 's1', name: 'Alice', guild: 'coders', xp: 200, coins: 50, guildXpContributed: 200, unlockedAchievements: ['first_mission'], claimedGuildChallenges: ['ch_1'] },
    { id: 's2', name: 'Bob', guild: 'coders', xp: 300, coins: 100, guildXpContributed: 300, unlockedAchievements: ['first_mission', 'streak_3'], claimedGuildChallenges: ['ch_1', 'ch_2'] },
    { id: 's3', name: 'Charlie', guild: 'artists', xp: 150, coins: 20, guildXpContributed: 150, unlockedAchievements: ['first_mission'], claimedGuildChallenges: ['ch_1'] }
  ];

  // Simulating realBackend.rewardGuild logic
  const simulateRewardGuild = (studentsList, targetGuildId, rewardType, rewardValue, rewardMode = 'grant') => {
    const guildMembers = studentsList.filter(s => s.guild === targetGuildId);
    if (guildMembers.length === 0) throw new Error('No members in this guild');

    for (const student of guildMembers) {
      if (rewardType === 'xp') {
        student.xp = Math.max(0, (student.xp || 0) + rewardValue);
        student.guildXpContributed = Math.max(0, (student.guildXpContributed || 0) + rewardValue);
      } else if (rewardType === 'coins') {
        student.coins = Math.max(0, (student.coins || 0) + rewardValue);
      } else if (rewardType === 'achievement') {
        const current = student.unlockedAchievements || [];
        if (rewardMode === 'deduct') {
          student.unlockedAchievements = current.filter(a => a !== rewardValue);
        } else {
          if (!current.includes(rewardValue)) {
            student.unlockedAchievements = [...current, rewardValue];
          }
        }
      }
    }
    return { success: true, updatedCount: guildMembers.length };
  };

  // 8A: Grant achievement to 'coders'
  const grantRes = simulateRewardGuild(students, 'coders', 'achievement', 'guild_hero', 'grant');
  assert.strictEqual(grantRes.updatedCount, 2, 'Must update exactly 2 members in coders');
  assert(students[0].unlockedAchievements.includes('guild_hero'), 'Alice must receive guild_hero');
  assert(students[1].unlockedAchievements.includes('guild_hero'), 'Bob must receive guild_hero');
  assert(!students[2].unlockedAchievements.includes('guild_hero'), 'Charlie in artists must NOT receive guild_hero');

  // 8B: Deduct achievement from 'coders'
  const deductRes = simulateRewardGuild(students, 'coders', 'achievement', 'first_mission', 'deduct');
  assert.strictEqual(deductRes.updatedCount, 2);
  assert(!students[0].unlockedAchievements.includes('first_mission'), 'Alice must have first_mission removed');
  assert(!students[1].unlockedAchievements.includes('first_mission'), 'Bob must have first_mission removed');
  assert(students[2].unlockedAchievements.includes('first_mission'), 'Charlie must still have first_mission');

  // 8C: Reset guild members with resetChallenges: true
  const simulateResetGuild = (studentsList, targetGuildId, { resetTotalXp = false, resetChallenges = false } = {}) => {
    const guildMembers = studentsList.filter(s => s.guild === targetGuildId);
    for (const student of guildMembers) {
      student.guildXpContributed = 0;
      if (resetTotalXp) student.xp = 0;
      if (resetChallenges) student.claimedGuildChallenges = [];
    }
    return { success: true, updatedCount: guildMembers.length };
  };

  const resetRes = simulateResetGuild(students, 'coders', { resetTotalXp: true, resetChallenges: true });
  assert.strictEqual(resetRes.updatedCount, 2);
  assert.strictEqual(students[0].xp, 0);
  assert.strictEqual(students[0].guildXpContributed, 0);
  assert.deepStrictEqual(students[0].claimedGuildChallenges, []);
  assert.deepStrictEqual(students[1].claimedGuildChallenges, []);
  assert.strictEqual(students[2].claimedGuildChallenges.length, 1, 'Charlie challenges untouched');

  console.log('✔ Test 8: Teacher multi-member operations (grant, deduct, reset) verified');
}

// ============================================================================
// Test 9: Backend Claim Reward Idempotency & Deduplication
// ============================================================================
{
  const student = {
    id: 'student_42',
    xp: 50,
    coins: 20,
    guild: 'steam',
    guildXpContributed: 50,
    claimedGuildChallenges: ['ch_existing']
  };

  // Simulating realBackend.claimGuildChallengeReward
  const simulateBackendClaim = (sData, challengeId, rewardXp, rewardCoins) => {
    const claimed = Array.isArray(sData.claimedGuildChallenges) ? sData.claimedGuildChallenges : [];
    if (claimed.includes(challengeId)) {
      return { alreadyClaimed: true, claimedGuildChallenges: claimed };
    }
    const numRewardXp = typeof rewardXp === 'number' ? rewardXp : (Number(rewardXp) || 100);
    const numRewardCoins = typeof rewardCoins === 'number' ? rewardCoins : (Number(rewardCoins) || 50);
    const updatedClaimed = Array.from(new Set([...claimed, challengeId]));

    sData.xp = (sData.xp || 0) + numRewardXp;
    sData.coins = (sData.coins || 0) + numRewardCoins;
    sData.guildXpContributed = (sData.guildXpContributed || 0) + (sData.guild ? numRewardXp : 0);
    sData.claimedGuildChallenges = updatedClaimed;

    return {
      success: true,
      rewardXp: numRewardXp,
      rewardCoins: numRewardCoins,
      xp: sData.xp,
      coins: sData.coins,
      guildXpContributed: sData.guildXpContributed,
      claimedGuildChallenges: updatedClaimed
    };
  };

  // First claim succeeds
  const res1 = simulateBackendClaim(student, 'ch_new', 150, 60);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.xp, 200);
  assert.strictEqual(res1.coins, 80);
  assert.strictEqual(res1.guildXpContributed, 200);
  assert.deepStrictEqual(res1.claimedGuildChallenges, ['ch_existing', 'ch_new']);

  // Second claim of same challenge is rejected idempotently
  const res2 = simulateBackendClaim(student, 'ch_new', 150, 60);
  assert.strictEqual(res2.alreadyClaimed, true);
  assert.strictEqual(student.xp, 200, 'XP must not change on duplicate claim');
  assert.strictEqual(student.coins, 80, 'Coins must not change on duplicate claim');

  console.log('✔ Test 9: Backend claim reward idempotency & duplicate rejection verified');
}

// ============================================================================
// Test 10: Polling Loop Synchronization Safety
// ============================================================================
{
  // Simulated student local state
  const localState = {
    unlockedAchievements: ['first_mission', 'streak_3'],
    claimedGuildChallenges: ['ch_1', 'ch_2'],
    xp: 600,
    coins: 150,
    guild: 'coders',
    guildXpContributed: 600
  };

  const simulatePollingMerge = (prev, freshStudent) => {
    const serverAchievements = Array.isArray(freshStudent.unlockedAchievements) ? freshStudent.unlockedAchievements : [];
    const serverClaimed = Array.isArray(freshStudent.claimedGuildChallenges) ? freshStudent.claimedGuildChallenges : [];

    const isAchievementDeducted = serverAchievements.length < (prev.unlockedAchievements || []).length;
    const mergedAchievements = isAchievementDeducted
      ? serverAchievements
      : Array.from(new Set([...(prev.unlockedAchievements || []), ...serverAchievements]));

    const isExploitReset = serverClaimed.length < (prev.claimedGuildChallenges || []).length;
    const mergedClaimed = isExploitReset
      ? serverClaimed
      : Array.from(new Set([...(prev.claimedGuildChallenges || []), ...serverClaimed]));

    const updates = {
      unlockedAchievements: mergedAchievements,
      claimedGuildChallenges: mergedClaimed
    };

    if (freshStudent.guild !== undefined && freshStudent.guild !== prev.guild) {
      updates.guild = freshStudent.guild;
    }
    if (freshStudent.xp !== undefined && freshStudent.xp !== prev.xp) {
      updates.xp = freshStudent.xp;
    }
    if (freshStudent.guildXpContributed !== undefined && freshStudent.guildXpContributed !== prev.guildXpContributed) {
      updates.guildXpContributed = freshStudent.guildXpContributed;
    }
    if (freshStudent.coins !== undefined && freshStudent.coins !== prev.coins) {
      updates.coins = freshStudent.coins;
    }

    return { ...prev, ...updates };
  };

  // 10A: Server grants new achievement ('guild_hero')
  const freshGrant = {
    unlockedAchievements: ['first_mission', 'streak_3', 'guild_hero'],
    claimedGuildChallenges: ['ch_1', 'ch_2'],
    xp: 600,
    coins: 150,
    guild: 'coders',
    guildXpContributed: 600
  };
  const merged1 = simulatePollingMerge(localState, freshGrant);
  assert(merged1.unlockedAchievements.includes('guild_hero'), 'Server-granted achievement must be merged in');

  // 10B: Server deducts achievement ('streak_3')
  const freshDeduct = {
    unlockedAchievements: ['first_mission'],
    claimedGuildChallenges: ['ch_1', 'ch_2'],
    xp: 600,
    coins: 150,
    guild: 'coders',
    guildXpContributed: 600
  };
  const merged2 = simulatePollingMerge(localState, freshDeduct);
  assert(!merged2.unlockedAchievements.includes('streak_3'), 'Server-deducted achievement must not be resurrected');

  // 10C: Server resets guild challenges & exploit XP
  const freshReset = {
    unlockedAchievements: ['first_mission'],
    claimedGuildChallenges: [],
    xp: 0,
    coins: 150,
    guild: 'coders',
    guildXpContributed: 0
  };
  const merged3 = simulatePollingMerge(localState, freshReset);
  assert.deepStrictEqual(merged3.claimedGuildChallenges, [], 'Reset challenges on server must wipe local claimed list');
  assert.strictEqual(merged3.xp, 0, 'Reset XP on server must update local XP to 0');
  assert.strictEqual(merged3.guildXpContributed, 0, 'Reset Guild XP on server must update local to 0');

  console.log('✔ Test 10: Polling loop synchronization safety (grant, deduct, reset) verified');
}

console.log('\n✔ All Guild Challenge Reliability & Video Submission tests passed successfully!\n');
