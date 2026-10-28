import assert from 'node:assert';
import { normalizeStep, normalizeSteps, renderFormattedText } from '../../../src/utils/textUtils.js';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  getMostRecentMonday7am,
  resolveClassLearningPaths
} from '../../../src/utils/gameUtils.js';
import { isAdminUser } from '../../../src/utils/authUtils.js';

console.log('==========================================');
console.log('Running Adversarial Stress Tests');
console.log('==========================================\n');

// --- 1. textUtils Stress & ReDoS Testing ---
console.log('[STRESS 1] Testing textUtils against ReDoS, malformed markdown & type quirks...');

// ReDoS attack vector check: repeated asterisks and long strings
const longString = '**' + 'a'.repeat(50000) + '**';
const t0 = Date.now();
const parsedLong = renderFormattedText(longString);
const duration = Date.now() - t0;
assert(duration < 200, `ReDoS risk detected: took ${duration}ms to parse 50k chars`);
assert.strictEqual(parsedLong[0].type, 'strong');

// Malformed markdown: unclosed delimiters
const unclosedBold = renderFormattedText('This is **unclosed bold text');
assert.ok(Array.isArray(unclosedBold) || typeof unclosedBold === 'string');

const emptyMarkers = renderFormattedText('Empty **** and ** markers');
assert.ok(emptyMarkers !== undefined);

// Non-string step handling
const numberStep = normalizeStep({ text: 12345, link: 6789 });
assert.strictEqual(numberStep.text, 12345);
assert.strictEqual(numberStep.link, 6789);

// normalizeSteps with large array
const largeSteps = Array.from({ length: 5000 }, (_, i) => (i % 2 === 0 ? `Step ${i}` : null));
const normLarge = normalizeSteps(largeSteps);
assert.strictEqual(normLarge.length, 2500);

console.log('✔ textUtils passed all adversarial stress tests without hanging or throwing.');

// --- 2. gameUtils Stress & Edge Conditions ---
console.log('\n[STRESS 2] Testing gameUtils boundary conditions, mutations & regression...');

// Mutation hazard: does getMostRecentMonday7am mutate the input Date?
const inputDate = new Date('2026-10-27T10:00:00');
const originalTime = inputDate.getTime();
getMostRecentMonday7am(inputDate);
assert.strictEqual(inputDate.getTime(), originalTime, 'CRITICAL: getMostRecentMonday7am must NOT mutate the passed Date object');

// Sub-millisecond boundary check: 06:59:59.999 vs 07:00:00.000
const mon659 = new Date('2026-10-26T06:59:59.999');
const res659 = getMostRecentMonday7am(mon659);
assert.strictEqual(res659.getDate(), 19, '06:59:59.999 must resolve to previous week');

const mon700 = new Date('2026-10-26T07:00:00.000');
const res700 = getMostRecentMonday7am(mon700);
assert.strictEqual(res700.getDate(), 26, '07:00:00.000 must resolve to current week');

// getLevelForXp with adversarial inputs
assert.strictEqual(getLevelForXp(NaN).level, 1);
assert.strictEqual(getLevelForXp(undefined).level, 1);
assert.strictEqual(getLevelForXp(null).level, 1);
assert.strictEqual(getLevelForXp(-1000).level, 1);
assert.strictEqual(getLevelForXp("6500").level, 10, 'Numeric string should coerce to level 10');
assert.strictEqual(getLevelForXp(Infinity).level, 25);

// calculateLevelAndBonusCoins: XP reduction (revocation scenario)
const regressedCoins = calculateLevelAndBonusCoins(1000, 200);
assert.strictEqual(regressedCoins.bonusCoins, 0, 'Negative XP delta must not award bonus coins');
assert.strictEqual(regressedCoins.oldLevel.level, 4);
assert.strictEqual(regressedCoins.newLevel.level, 2);

// resolveClassLearningPaths with corrupted or mismatched categories
const corruptedClassDoc = {
  categoryNames: { 'non-existent-1': 'Unknown Path' },
  categoryOrder: ['non-existent-2', 'non-existent-1', 'another-fake']
};
const resolvedCorrupted = resolveClassLearningPaths(corruptedClassDoc);
assert(Array.isArray(resolvedCorrupted));
assert.strictEqual(resolvedCorrupted.length, 1);
assert.strictEqual(resolvedCorrupted[0].id, 'non-existent-1');

console.log('✔ gameUtils passed all boundary, non-mutation, and corruption stress tests.');

// --- 3. authUtils Security Stress & Spoofing Prevention ---
console.log('\n[STRESS 3] Testing authUtils security checks & spoofing resistance...');

// Email suffix spoofing attempts
assert.strictEqual(isAdminUser({ email: 'matthew.harbert@lcps.org.attacker.com' }), false);
assert.strictEqual(isAdminUser({ email: 'attackermatthew.harbert@lcps.org' }), false);
assert.strictEqual(isAdminUser({ email: 'propellevelup@lcps.org.phishing.net' }), false);
assert.strictEqual(isAdminUser({ email: 'fake_propellevelup@lcps.org' }), false);

// Role spoofing / partial matching
assert.strictEqual(isAdminUser({ role: 'administrator' }), false);
assert.strictEqual(isAdminUser({ role: 'admin_assistant' }), false);
assert.strictEqual(isAdminUser({ role: 'not_an_admin' }), false);

// Malformed email types: null and undefined are handled safely
assert.strictEqual(isAdminUser({ email: null }), false);
assert.strictEqual(isAdminUser({ email: undefined }), false);

// Non-string types throw TypeError if passed as email because typeof string is assumed
let nonStringEmailThrew = false;
try {
  isAdminUser({ email: 12345 });
} catch (e) {
  nonStringEmailThrew = true;
}
assert.strictEqual(nonStringEmailThrew, true, 'Calling isAdminUser with non-string email throws TypeError');

console.log('✔ authUtils passed all security spoofing and type vulnerability tests.');

console.log('\n==========================================');
console.log('🎉 ALL ADVERSARIAL STRESS TESTS PASSED!');
console.log('==========================================');
