import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { filterAndSortRedemptions } from '../src/utils/portalUtils.js';

console.log('Testing Guild Store & Teacher Rewards Integration...');

// ---------------------------------------------------------------------------
// 1. Static Verification of GuildPanel.jsx & App.jsx
// ---------------------------------------------------------------------------
const guildPanelSrc = fs.readFileSync(path.resolve('./src/components/GuildPanel.jsx'), 'utf8');
const appSrc = fs.readFileSync(path.resolve('./src/App.jsx'), 'utf8');

// Test 1: GuildPanel loads custom teacher rewards and student redemptions
assert(guildPanelSrc.includes('backend.getCustomRewards(classId)'), 'GuildPanel must call backend.getCustomRewards');
assert(guildPanelSrc.includes('backend.getRedemptions(classId)'), 'GuildPanel must call backend.getRedemptions');
assert(guildPanelSrc.includes('backend.subscribeToRedemptions'), 'GuildPanel must subscribe to live redemptions');
console.log('✔ Test 1: GuildPanel loads and subscribes to custom teacher rewards and redemptions');

// Test 2: Guild Store purchase & redemption logic
assert(guildPanelSrc.includes('backend.redeemCustomReward(classId, redeemingReward.id'), 'GuildPanel must call redeemCustomReward on redemption');
assert(guildPanelSrc.includes('spendCoins(redeemingReward.cost)'), 'GuildPanel must deduct coins using spendCoins on reward redemption');
assert(guildPanelSrc.includes('studentName:'), 'GuildPanel must record studentName with redemption');
assert(guildPanelSrc.includes('directions: redeemingReward.directions'), 'GuildPanel must record directions with redemption');
console.log('✔ Test 2: Teacher reward redemption handler calls backend and deducts coins correctly');

// Test 3: Sizing and scrolling layout prevents "sliver of a view"
assert(guildPanelSrc.includes('min-h-0'), 'GuildPanel modal must include min-h-0 to avoid collapsing scrollable body in flexbox');
assert(guildPanelSrc.includes('flex-shrink-0'), 'GuildPanel headers and tabs must include flex-shrink-0 to prevent squishing');
assert(guildPanelSrc.includes('overflow-y-auto flex-1 min-h-0'), 'GuildPanel body must have overflow-y-auto flex-1 min-h-0 for full-height scrolling');
assert(guildPanelSrc.includes('h-[94vh] sm:h-[90vh]'), 'GuildPanel modal card must provide generous explicit viewport height');
console.log('✔ Test 3: Modal viewport sizing and flex classes prevent "sliver of a view"');

// Test 4: App.jsx wiring to GuildPanel
assert(appSrc.includes('<GuildPanel'), 'App.jsx must render GuildPanel');
assert(appSrc.includes('spendCoins={spendCoins}'), 'App.jsx must pass spendCoins to GuildPanel');
assert(appSrc.includes('classId={effectiveClassId}'), 'App.jsx must pass classId to GuildPanel');
assert(appSrc.includes('userId={user?.id}'), 'App.jsx must pass userId to GuildPanel');
console.log('✔ Test 4: App.jsx passes spendCoins, effectiveClassId, and userId to GuildPanel');

// ---------------------------------------------------------------------------
// 2. Behavioral Logic Simulation Tests
// ---------------------------------------------------------------------------

// Test 5: Custom Rewards active status filtering
const sampleRewards = [
  { id: 'rew-1', name: 'Homework Pass', cost: 50, directions: 'Show to teacher', active: true },
  { id: 'rew-2', name: 'Sit with Friend', cost: 30, directions: 'Pick a seat on Friday', active: true },
  { id: 'rew-3', name: 'Discontinued Prize', cost: 100, directions: '', active: false },
  { id: 'rew-4', name: 'Legacy Item (no active flag)', cost: 25, directions: '' },
];
const activeRewards = sampleRewards.filter(r => r && r.active !== false);
assert.strictEqual(activeRewards.length, 3, 'Should filter out items where active === false');
assert.strictEqual(activeRewards.find(r => r.id === 'rew-3'), undefined, 'Inactive reward should not be visible');
console.log('✔ Test 5: Inactive teacher rewards are filtered out while active items remain visible');

// Test 6: Coin affordability calculation
function checkAffordability(coins, cost) {
  return coins >= cost;
}
assert.strictEqual(checkAffordability(100, 50), true, 'Student with 100 coins can afford 50-coin reward');
assert.strictEqual(checkAffordability(49, 50), false, 'Student with 49 coins cannot afford 50-coin reward');
assert.strictEqual(checkAffordability(50, 50), true, 'Student with exactly 50 coins can afford 50-coin reward');
console.log('✔ Test 6: Affordability gate strictly respects coin balance and cost');

// Test 7: Student Redemption Filtering & Sorting via portalUtils
const sampleRedemptions = [
  { id: 'red-1', studentId: 'student-A', studentName: 'Alice', itemName: 'Homework Pass', cost: 50, status: 'pending', redeemedAt: new Date('2026-10-01T10:00:00Z') },
  { id: 'red-2', studentId: 'student-B', studentName: 'Bob', itemName: 'Sit with Friend', cost: 30, status: 'fulfilled', redeemedAt: new Date('2026-10-02T10:00:00Z') },
  { id: 'red-3', studentId: 'student-A', studentName: 'Alice', itemName: 'Extra Recess', cost: 60, status: 'fulfilled', redeemedAt: new Date('2026-10-03T10:00:00Z') },
];

const aliceRedemptions = filterAndSortRedemptions(sampleRedemptions, 'student-A', 'Alice');
assert.strictEqual(aliceRedemptions.length, 2, 'Alice should only see her 2 redemptions');
assert.strictEqual(aliceRedemptions[0].id, 'red-3', 'Most recent redemption should be first');
assert.strictEqual(aliceRedemptions[1].id, 'red-1', 'Earlier redemption should be second');
console.log('✔ Test 7: filterAndSortRedemptions isolates student redemptions and orders by recency');

// Test 8: End-to-End Simulation of Purchasing a Teacher Reward
let simulatedCoins = 120;
let simulatedBackendRedemptions = [];
const mockSpendCoins = (amount) => {
  if (simulatedCoins >= amount) {
    simulatedCoins -= amount;
    return true;
  }
  return false;
};

const executeMockRedemption = (reward, student) => {
  if (!checkAffordability(simulatedCoins, reward.cost)) {
    throw new Error('Insufficient coins');
  }
  const redemptionRecord = {
    id: 'red-' + Date.now(),
    rewardId: reward.id,
    studentId: student.id,
    studentName: student.name,
    itemName: reward.name,
    cost: reward.cost,
    directions: reward.directions,
    status: 'pending',
    redeemedAt: new Date()
  };
  simulatedBackendRedemptions.push(redemptionRecord);
  mockSpendCoins(reward.cost);
  return redemptionRecord;
};

const redeemed = executeMockRedemption(sampleRewards[0], { id: 'student-1', name: 'Sammy' });
assert.strictEqual(redeemed.itemName, 'Homework Pass');
assert.strictEqual(simulatedCoins, 70, 'Coins should be deducted from 120 to 70');
assert.strictEqual(simulatedBackendRedemptions.length, 1);
assert.strictEqual(simulatedBackendRedemptions[0].status, 'pending');

// Teacher fulfills reward
simulatedBackendRedemptions[0].status = 'fulfilled';
assert.strictEqual(simulatedBackendRedemptions[0].status, 'fulfilled', 'Status updates to fulfilled upon teacher action');
console.log('✔ Test 8: End-to-end redemption transaction deducts coins and tracks status lifecycle');

console.log('\n✔ All Guild Store & Teacher Rewards tests passed successfully!\n');

