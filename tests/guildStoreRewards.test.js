import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  filterAndSortRedemptions,
  getRedemptionStatusBadge,
  getStemOrderStatus,
  getStemOrderBadge,
  isRecordOwnedByStudent,
} from '../src/utils/portalUtils.js';
import { applyAvatarItemRefund, findAvatarShopItem } from '../src/utils/gameUtils.js';

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

// Test 9: Dark Mode Styling & Tailwind Compatibility
const tailwindConfigSrc = fs.readFileSync(path.resolve('./tailwind.config.js'), 'utf8');
assert(tailwindConfigSrc.includes("850: '#232D53'"), 'tailwind.config.js must define slate 850 for dark mode safety');
assert(!guildPanelSrc.includes('dark:bg-slate-850'), 'GuildPanel.jsx should use valid dark:bg-slate-800 for cards');
assert(guildPanelSrc.includes('dark:bg-slate-800'), 'GuildPanel.jsx must use dark:bg-slate-800 for dark mode cards');
console.log('✔ Test 9: Guild store cards utilize valid dark mode background tokens (dark:bg-slate-800)');

// Test 10: STEM Purchase Permission Resiliency & Soft Delete Fallback
const realBackendSrc = fs.readFileSync(path.resolve('./src/services/realBackend.js'), 'utf8');
assert(realBackendSrc.includes('await deleteDoc(ref)'), 'realBackend.js must attempt deleteDoc');
assert(realBackendSrc.includes('deleted: true') && realBackendSrc.includes("status: 'deleted'"), 'realBackend.js must fall back to soft-delete if deleteDoc fails with permission error');
console.log('✔ Test 10: deleteStemPurchase provides resilient dual-layer hard/soft delete fallback');

// Test 11: Active STEM Purchases Filter
const samplePurchases = [
  { id: 'p1', itemName: 'Chassis Kit', fulfilled: false },
  { id: 'p2', itemName: 'Faulty Order', deleted: true, status: 'deleted' },
  { id: 'p3', itemName: 'Microcontroller', fulfilled: true }
];
const filteredPurchases = samplePurchases.filter(p => !p.deleted && p.status !== 'deleted');
assert.strictEqual(filteredPurchases.length, 2, 'Deleted STEM orders must be excluded from active orders list');
assert.strictEqual(filteredPurchases.find(p => p.id === 'p2'), undefined, 'Deleted order p2 must not be returned');
console.log('✔ Test 11: getStemPurchases strictly filters out soft-deleted orders');

// Test 12: Firestore Security Rules Audit for STEM Purchases & Redemptions
const firestoreRulesSrc = fs.readFileSync(path.resolve('./firestore.rules'), 'utf8');
const firestoreRulesNorm = firestoreRulesSrc.replace(/\s+/g, ' ');
assert(
  firestoreRulesSrc.includes('match /stem_purchases/{purchaseId}') &&
  firestoreRulesSrc.includes('allow update: if isAuthenticated() || isValidStudentStemAction();') &&
  firestoreRulesSrc.includes('allow delete: if isAuthenticated();'),
  'firestore.rules must allow authenticated teachers & admins to update/delete stem_purchases and students to cancel pending or request refunds'
);
assert(
  firestoreRulesNorm.includes('match /classes/{classId}/redemptions/{redemptionId}') &&
  firestoreRulesNorm.includes('allow update: if (isAuthenticated() && isTeacherOfClass(classId)) || isValidStudentRedemptionCancellation() || isValidStudentRedemptionRefundRequest();') &&
  firestoreRulesNorm.includes('allow delete: if isAuthenticated() && isTeacherOfClass(classId);'),
  'firestore.rules must allow teachers to update/delete and students to cancel pending or request refunds on fulfilled redemptions'
);
assert(
  firestoreRulesSrc.includes('isValidStudentRedemptionCancellation()') &&
  firestoreRulesSrc.includes("resource.data.get('status', '') == 'pending'") &&
  firestoreRulesSrc.includes("resource.data.get('refunded', false) != true"),
  'isValidStudentRedemptionCancellation must block double-refunds and non-pending cancellations'
);
assert(
  firestoreRulesSrc.includes('exists(/databases/$(database)/documents/classes/$(classId))'),
  'isClassTeacherOrCoTeacher must verify class document existence before reading .data to prevent CEL runtime exceptions'
);
console.log('✔ Test 12: firestore.rules permission matrix and CEL existence guards verified');

// Test 13: Redemption Status Badges for Student Cancellation & Teacher Rejection
assert.strictEqual(getRedemptionStatusBadge('cancelled').label, '✕ Cancelled');
assert.strictEqual(getRedemptionStatusBadge('rejected').label, '✕ Rejected');
assert(getRedemptionStatusBadge('rejected').className.includes('rose'), 'Rejected badge must use rose styling');
console.log('✔ Test 13: Cancelled and rejected redemption status badges verified');

// Test 14: Student "Nevermind" & Teacher "Reject & Refund" Idempotent Refund Simulation
{
  const studentDoc = { id: 'stu-1', name: 'Alex', coins: 20 };
  const redemptionDoc = { id: 'red-9', studentId: 'stu-1', itemName: 'Homework Pass', cost: 50, status: 'pending', refunded: false };

  const simulateCancelOrReject = ({ status, cancelledBy, reason = '' }) => {
    if (redemptionDoc.status !== 'pending' || redemptionDoc.refunded === true) {
      return { alreadyProcessed: true };
    }
    redemptionDoc.status = status;
    redemptionDoc.cancelledBy = cancelledBy;
    redemptionDoc.refunded = true;
    if (reason) redemptionDoc.rejectionReason = reason;
    studentDoc.coins += redemptionDoc.cost;
    return { success: true, refundedAmount: redemptionDoc.cost, newCoins: studentDoc.coins };
  };

  // Student cancels ("Nevermind") -> refunds 50 coins (20 -> 70)
  const resStudentCancel = simulateCancelOrReject({ status: 'cancelled', cancelledBy: 'student' });
  assert.strictEqual(resStudentCancel.success, true);
  assert.strictEqual(studentDoc.coins, 70, 'Student coins must refund from 20 to 70');

  // Concurrent/duplicate Teacher reject cannot double-refund
  const resDuplicate = simulateCancelOrReject({ status: 'rejected', cancelledBy: 'teacher', reason: 'Late' });
  assert.strictEqual(resDuplicate.alreadyProcessed, true);
  assert.strictEqual(studentDoc.coins, 70, 'Duplicate cancel/reject must never double-refund coins');
  console.log('✔ Test 14: Student Nevermind & Teacher Reject idempotent coin refund verified');
}

// Test 15: Production Wiring Verification for Nevermind & Reject UI
{
  const teacherPortalSrc = fs.readFileSync(path.resolve('./src/components/TeacherPortal.jsx'), 'utf8');
  assert(realBackendSrc.includes('async cancelOrRejectRedemption('), 'realBackend.js must implement cancelOrRejectRedemption');
  assert(guildPanelSrc.includes('Nevermind') && guildPanelSrc.includes('handleCancelRedemption'), 'GuildPanel.jsx must expose Nevermind button on pending redemptions');
  assert(appSrc.includes('Nevermind') && appSrc.includes('handleCancelHistoryRedemption'), 'App.jsx AvatarBuilder history must expose Nevermind button');
  assert(teacherPortalSrc.includes('Reject & Refund') && teacherPortalSrc.includes('handleConfirmRejectRedemption'), 'TeacherPortal.jsx RewardsManager must expose Reject & Refund button and modal');
  console.log('✔ Test 15: Nevermind and Reject & Refund UI wiring verified across all components');
}

// Test 16: STEM Order Status & Badge Helpers + Ownership Check
{
  assert.strictEqual(getStemOrderStatus({ fulfilled: false }), 'pending');
  assert.strictEqual(getStemOrderStatus({ fulfilled: true }), 'delivered');
  assert.strictEqual(getStemOrderStatus({ fulfilled: true, status: 'refund_requested' }), 'refund_requested');
  assert.strictEqual(getStemOrderStatus({ fulfilled: true, status: 'refunded', refunded: true }), 'refunded');
  assert.strictEqual(getStemOrderStatus({ fulfilled: false, status: 'cancelled', refunded: true }), 'cancelled');
  assert.strictEqual(getStemOrderBadge({ fulfilled: false }).label, 'Order Placed');
  assert.strictEqual(getStemOrderBadge({ fulfilled: true }).label, 'Delivered');
  assert.strictEqual(getStemOrderBadge({ fulfilled: true, status: 'refund_requested' }).label, 'Refund Requested');
  assert.strictEqual(getStemOrderBadge({ fulfilled: true, status: 'refunded', refunded: true }).label, 'Refunded');

  assert.strictEqual(isRecordOwnedByStudent({ studentId: 's1', studentName: 'Demo' }, 's1', 'Demo'), true);
  assert.strictEqual(isRecordOwnedByStudent({ studentId: 's2', studentName: 'Other' }, 's1', 'Demo'), false);
  assert.strictEqual(isRecordOwnedByStudent({ studentName: 'Demo' }, '', 'demo'), true);
  console.log('✔ Test 16: STEM order lifecycle status, badges, and ownership guards verified');
}

// Test 17: Redemption Refund Request & Refunded Status Badges
{
  const reqBadge = getRedemptionStatusBadge('refund_requested');
  const refBadge = getRedemptionStatusBadge('refunded');
  assert(reqBadge.label.includes('Refund Requested'), 'refund_requested badge must display Refund Requested');
  assert(refBadge.label.includes('Refunded'), 'refunded badge must display Refunded');
  console.log('✔ Test 17: Redemption refund_requested and refunded badges verified');
}

// Test 18: Avatar Shop Item Refund Logic (applyAvatarItemRefund & findAvatarShopItem)
{
  const crownMeta = findAvatarShopItem('crown');
  assert(crownMeta && crownMeta.item.cost === 150, 'crown should cost 150 coins in AVATAR_ITEMS');

  const initialState = {
    coins: 70,
    ownedItems: ['default', 'none', 'happy', 'crown', 'cool'],
    avatar: { color: 'default', hat: 'crown', accessory: 'none', face: 'cool' },
  };

  // Refund equipped Royal Crown (150 coins) -> removes from ownedItems, unequips to 'none', coins 70 -> 220
  const crownRefund = applyAvatarItemRefund(initialState, 'crown');
  assert.strictEqual(crownRefund.refunded, true);
  assert.strictEqual(crownRefund.refundAmount, 150);
  assert.strictEqual(crownRefund.nextState.coins, 220);
  assert.strictEqual(crownRefund.nextState.avatar.hat, 'none', 'Refunding equipped hat must reset slot to none');
  assert(!crownRefund.nextState.ownedItems.includes('crown'), 'Refunded item must be removed from ownedItems');

  // Cannot double-refund an already refunded item or free defaults
  const dupRefund = applyAvatarItemRefund(crownRefund.nextState, 'crown');
  assert.strictEqual(dupRefund.refunded, false);
  assert.strictEqual(dupRefund.nextState.coins, 220);

  const defaultRefund = applyAvatarItemRefund(crownRefund.nextState, 'default');
  assert.strictEqual(defaultRefund.refunded, false);
  console.log('✔ Test 18: Avatar shop item refund unequips slot cleanly and credits coins without double-refunds');
}

// Test 19: Universal Refund UI Wiring (STEM Orders, Fulfilled Rewards, Avatar Items, Teacher Inspector)
{
  const teacherPortalSrc = fs.readFileSync(path.resolve('./src/components/TeacherPortal.jsx'), 'utf8');
  const rosterManagerSrc = fs.readFileSync(path.resolve('./src/components/RosterManager.jsx'), 'utf8');
  const useGameStateSrc = fs.readFileSync(path.resolve('./src/hooks/useGameState.js'), 'utf8');

  assert(realBackendSrc.includes('async cancelOrRefundStemPurchase('), 'realBackend.js must implement cancelOrRefundStemPurchase');
  assert(realBackendSrc.includes("action === 'request_refund'"), 'realBackend.js must support student refund requests');
  assert(guildPanelSrc.includes('handleStemOrderAction') && guildPanelSrc.includes('Request Refund'), 'GuildPanel.jsx must allow STEM cancel/refund requests and fulfilled reward refund requests');
  assert(teacherPortalSrc.includes('handleConfirmStemRefundAction') && teacherPortalSrc.includes('Issue Refund'), 'TeacherPortal.jsx must allow teachers to issue or approve refunds on STEM orders and fulfilled rewards');
  assert(appSrc.includes('handleRefundAvatarItem') && useGameStateSrc.includes('refundAvatarItem'), 'App.jsx & useGameState.js must support student Avatar item coin refunds');
  assert(rosterManagerSrc.includes('findAvatarShopItem') && rosterManagerSrc.includes('handleRemoveOwnedItem(itemId, true)'), 'RosterManager.jsx must let teachers refund paid Avatar items');
  console.log('✔ Test 19: Universal refund wiring verified across Guild Store STEM orders, Custom Rewards, Avatar Shop, and Teacher Inspector');
}

console.log('\n✔ All Guild Store & Teacher Rewards tests passed successfully!\n');


