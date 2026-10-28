import { getDefaultGameState, calculateGuildChallengeRewardState, calculateLevelAndBonusCoins } from '../../../src/utils/gameUtils.js';
import { LEVELS } from '../../../src/data/gameData.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Reviewer Adversarial Stress Testing ---');

// Stress Test 1: Purity of calculateGuildChallengeRewardState (no mutation of prev)
{
  const originalState = Object.freeze({
    xp: 100,
    coins: 50,
    guild: 'guild_tech',
    guildXpContributed: 25,
    claimedGuildChallenges: Object.freeze(['ch_1'])
  });

  const challenge = Object.freeze({
    id: 'ch_2',
    title: 'Challenge 2',
    reward: 100,
    coinReward: 50
  });

  const nextState = calculateGuildChallengeRewardState(originalState, challenge, { applyLevelBonus: true, levels: LEVELS });
  assert.notStrictEqual(nextState, originalState);
  assert.strictEqual(originalState.xp, 100);
  assert.strictEqual(originalState.coins, 50);
  assert.deepStrictEqual(originalState.claimedGuildChallenges, ['ch_1']);
  assert.strictEqual(nextState.xp, 200);
  assert.strictEqual(nextState.claimedGuildChallenges.length, 2);
  console.log('✔ Stress Test 1 Passed: calculateGuildChallengeRewardState is pure and does not mutate frozen inputs');
}

// Stress Test 2: Malformed and Edge-Case Inputs to calculateGuildChallengeRewardState
{
  const state = {
    xp: 0,
    coins: 10,
    claimedGuildChallenges: null // null instead of array
  };

  // Malformed challenge: missing rewards
  const malformedCh1 = { id: 'ch_empty' };
  const res1 = calculateGuildChallengeRewardState(state, malformedCh1);
  // Default fallback should be 100 XP, 50 coins
  assert.strictEqual(res1.xp, 100);
  assert.strictEqual(res1.coins, 60);
  assert.deepStrictEqual(res1.claimedGuildChallenges, ['ch_empty']);

  // Challenge with string numbers
  const strCh = { id: 'ch_str', reward: '250', coinReward: '75' };
  const res2 = calculateGuildChallengeRewardState(res1, strCh);
  assert.strictEqual(res2.xp, 350);
  assert.strictEqual(res2.coins, 135);
  assert.deepStrictEqual(res2.claimedGuildChallenges, ['ch_empty', 'ch_str']);

  // Null challenge or missing id
  assert.strictEqual(calculateGuildChallengeRewardState(state, null), state);
  assert.strictEqual(calculateGuildChallengeRewardState(state, {}), state);
  assert.strictEqual(calculateGuildChallengeRewardState(state, { reward: 100 }), state);

  console.log('✔ Stress Test 2 Passed: Malformed challenge inputs and null claimedGuildChallenges safely handled');
}

// Stress Test 3: Multi-level boundary leap with bonus coins
{
  // Student at 0 XP (Level 1)
  const state = {
    xp: 0,
    coins: 0,
    guild: 'guild_alpha',
    guildXpContributed: 0,
    claimedGuildChallenges: []
  };

  // Huge challenge awarding 2000 XP (crosses Level 2, 3, 4, 5, 6)
  // Let's verify LEVELS
  const levelsCrossed = LEVELS.filter(l => l.xpRequired > 0 && l.xpRequired <= 2000);
  const expectedBonusCoins = levelsCrossed.reduce((sum, l) => sum + (l.coinReward || 0), 0);

  const giantChallenge = {
    id: 'ch_mega',
    reward: 2000,
    coinReward: 100
  };

  const res = calculateGuildChallengeRewardState(state, giantChallenge, { applyLevelBonus: true, levels: LEVELS });
  assert.strictEqual(res.xp, 2000);
  assert.strictEqual(res.coins, 100 + expectedBonusCoins);
  assert(res._levelInfo.leveledUp);
  console.log(`✔ Stress Test 3 Passed: Multi-level jump (2000 XP) credited ${expectedBonusCoins} bonus coins correctly`);
}

// Stress Test 4: Concurrency & Duplicate Rejection in Array updates
{
  const state = {
    xp: 500,
    coins: 200,
    claimedGuildChallenges: ['ch_1', 'ch_2']
  };

  const chDuplicate = { id: 'ch_1', reward: 100, coinReward: 50 };
  const resDup = calculateGuildChallengeRewardState(state, chDuplicate);
  assert.strictEqual(resDup, state); // strictly unchanged

  console.log('✔ Stress Test 4 Passed: Duplicate claim returns previous state without any changes');
}

// Stress Test 5: TeacherPortal multi-member rewardGuild and resetGuildMembersXp API signatures
{
  assert(typeof realBackend.rewardGuild === 'function', 'realBackend.rewardGuild must exist');
  assert(typeof realBackend.resetGuildMembersXp === 'function', 'realBackend.resetGuildMembersXp must exist');
  assert(typeof realBackend.claimGuildChallengeReward === 'function', 'realBackend.claimGuildChallengeReward must exist');

  console.log('✔ Stress Test 5 Passed: realBackend exports all required guild management functions');
}

console.log('\n--- ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! ---');
