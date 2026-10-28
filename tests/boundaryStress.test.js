import assert from 'node:assert';
import { renderFormattedText, normalizeStep, normalizeSteps } from '../src/utils/textUtils.js';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  getMostRecentMonday7am,
  resolveClassLearningPaths
} from '../src/utils/gameUtils.js';
import { isAdminUser } from '../src/utils/authUtils.js';
import { LEVELS, DEFAULT_PATHS, PATH_COLORS } from '../src/data/gameData.js';

console.log('Testing Boundary & Stress Cases...');

// ============================================================================
// SECTION 1: textUtils.js Boundary & Stress Tests
// ============================================================================

// 1.1 Empty strings and falsy inputs
assert.strictEqual(renderFormattedText(''), null, 'Empty string should return null');
assert.strictEqual(renderFormattedText(null), null, 'null should return null');
assert.strictEqual(renderFormattedText(undefined), null, 'undefined should return null');

// Non-string inputs should return input safely or null
assert.strictEqual(renderFormattedText(123), 123, 'Numbers should be returned safely');
assert.strictEqual(renderFormattedText(0), null, '0 should return null');
assert.strictEqual(renderFormattedText(false), null, 'false should return null');

// 1.2 Plain text (no markdown)
const plain = renderFormattedText('Simple unformatted text');
assert.strictEqual(plain.length, 1);
assert.strictEqual(plain[0].props.children, 'Simple unformatted text');

// 1.3 Formatting at extremities
const startBold = renderFormattedText('**Start** middle end');
assert.strictEqual(startBold[0].type, 'strong');
assert.strictEqual(startBold[0].props.children, 'Start');

const endBold = renderFormattedText('Start middle **End**');
assert.strictEqual(endBold[endBold.length - 1].type, 'strong');
assert.strictEqual(endBold[endBold.length - 1].props.children, 'End');

// 1.4 Multiple bold and italic in single string
const multi = renderFormattedText('Here is **bold 1** and *italic 1* and **bold 2**.');
assert.strictEqual(multi.length, 7);
assert.strictEqual(multi[0].type, 'span');
assert.strictEqual(multi[0].props.children, 'Here is ');
assert.strictEqual(multi[1].type, 'strong');
assert.strictEqual(multi[1].props.children, 'bold 1');
assert.strictEqual(multi[2].type, 'span');
assert.strictEqual(multi[2].props.children, ' and ');
assert.strictEqual(multi[3].type, 'em');
assert.strictEqual(multi[3].props.children, 'italic 1');
assert.strictEqual(multi[4].type, 'span');
assert.strictEqual(multi[4].props.children, ' and ');
assert.strictEqual(multi[5].type, 'strong');
assert.strictEqual(multi[5].props.children, 'bold 2');
assert.strictEqual(multi[6].type, 'span');
assert.strictEqual(multi[6].props.children, '.');

// 1.5 Malformed markdown handling (must never crash)
const unclosedBold = renderFormattedText('Unclosed **bold text here');
assert(Array.isArray(unclosedBold));
assert.strictEqual(unclosedBold[0].props.children, 'Unclosed **bold text here');

const unclosedItalic = renderFormattedText('Unclosed *italic text here');
assert(Array.isArray(unclosedItalic));
assert.strictEqual(unclosedItalic[0].props.children, 'Unclosed *italic text here');

const strayAsterisks = renderFormattedText('*** Starlight ***');
assert(Array.isArray(strayAsterisks));

const emptyStars = renderFormattedText('Empty **** markers');
assert(Array.isArray(emptyStars));

// 1.6 normalizeStep boundary tests
const stepNull = normalizeStep(null);
assert.deepStrictEqual(stepNull, { text: '', link: '', linkText: '', completed: false });

const stepUndef = normalizeStep(undefined);
assert.deepStrictEqual(stepUndef, { text: '', link: '', linkText: '', completed: false });

const stepEmptyStr = normalizeStep('');
assert.deepStrictEqual(stepEmptyStr, { text: '', link: '', linkText: '', completed: false });

const stepValidStr = normalizeStep('Just a plain instruction');
assert.deepStrictEqual(stepValidStr, { text: 'Just a plain instruction', link: '', linkText: '', completed: false });

const stepCustomProps = normalizeStep({ text: 'Do homework', customProp: 42, completed: 1 });
assert.strictEqual(stepCustomProps.text, 'Do homework');
assert.strictEqual(stepCustomProps.customProp, 42);

// 1.7 normalizeSteps boundary tests
assert.deepStrictEqual(normalizeSteps(null), [], 'null steps returns empty array');
assert.deepStrictEqual(normalizeSteps(undefined), [], 'undefined steps returns empty array');
assert.deepStrictEqual(normalizeSteps('not an array'), [], 'string steps returns empty array');
assert.deepStrictEqual(normalizeSteps({}), [], 'object steps returns empty array');
assert.deepStrictEqual(normalizeSteps([]), [], 'empty array returns empty array');

const emptyStepsArray = normalizeSteps(['', {}, { text: '' }, { link: '' }, null, undefined]);
assert.deepStrictEqual(emptyStepsArray, [], 'All empty steps should be filtered out');

const validFiltered = normalizeSteps([
  '',
  'Step 1',
  null,
  { text: '', link: 'https://example.com' },
  { text: 'Step 3', link: '' }
]);
assert.strictEqual(validFiltered.length, 3, 'Should keep Step 1, link-only step, and Step 3');
assert.strictEqual(validFiltered[0].text, 'Step 1');
assert.strictEqual(validFiltered[1].link, 'https://example.com');
assert.strictEqual(validFiltered[2].text, 'Step 3');

console.log('✔ textUtils boundary and stress tests passed.');

// ============================================================================
// SECTION 2: gameUtils.js Boundary & Stress Tests
// ============================================================================

// 2.1 XP Boundaries: 0, 99, 100, 199, 200, 25000+, 62000+
assert.strictEqual(getLevelForXp(0).level, 1, '0 XP must be Level 1');
assert.strictEqual(getLevelForXp(99).level, 1, '99 XP must be Level 1');
assert.strictEqual(getLevelForXp(100).level, 1, '100 XP must be Level 1');
assert.strictEqual(getLevelForXp(199).level, 1, '199 XP must be Level 1');
assert.strictEqual(getLevelForXp(200).level, 2, '200 XP must be Level 2 (Apprentice)');
assert.strictEqual(getLevelForXp(499).level, 2, '499 XP must be Level 2');
assert.strictEqual(getLevelForXp(500).level, 3, '500 XP must be Level 3 (Challenger)');

// High level boundaries
assert.strictEqual(getLevelForXp(22800).level, 17, '22800 XP must be Level 17 (Paragon)');
assert.strictEqual(getLevelForXp(25000).level, 17, '25000 XP must be Level 17 (Paragon)');
assert.strictEqual(getLevelForXp(26000).level, 18, '26000 XP must be Level 18 (Sovereign)');
assert.strictEqual(getLevelForXp(62000).level, 25, '62000 XP must be Level 25 (Godlike)');
assert.strictEqual(getLevelForXp(250000).level, 25, '250000 XP should cap at Level 25');

// Negative or invalid XP
assert.strictEqual(getLevelForXp(-100).level, 1, 'Negative XP should default to Level 1');
assert.strictEqual(getLevelForXp(NaN).level, 1, 'NaN XP should default to Level 1');
assert.strictEqual(getLevelForXp(null).level, 1, 'null XP should default to Level 1');
assert.strictEqual(getLevelForXp(undefined).level, 1, 'undefined XP should default to Level 1');
assert.strictEqual(getLevelForXp('1400').level, 5, 'String numeric XP "1400" should evaluate to Level 5');

// 2.2 calculateLevelAndBonusCoins multi-level jump
const zeroJump = calculateLevelAndBonusCoins(100, 150);
assert.strictEqual(zeroJump.bonusCoins, 0);

// Jump from Level 1 (0 XP) to Level 4 (900 XP) -> L2 (25) + L3 (50) + L4 (75) = 150 coins
const multiJump = calculateLevelAndBonusCoins(0, 950);
assert.strictEqual(multiJump.oldLevel.level, 1);
assert.strictEqual(multiJump.newLevel.level, 4);
assert.strictEqual(multiJump.bonusCoins, 150, 'Bonus coins should sum across all crossed levels');

// Jump to max level 25
const maxJump = calculateLevelAndBonusCoins(0, 65000);
assert.strictEqual(maxJump.oldLevel.level, 1);
assert.strictEqual(maxJump.newLevel.level, 25);
const expectedMaxCoins = LEVELS.slice(1).reduce((sum, l) => sum + (l.coinReward || 0), 0);
assert.strictEqual(maxJump.bonusCoins, expectedMaxCoins);

// 2.3 Leap Year & Date Calculations
// Leap year 2024: Feb 29 was Thursday. March 1 was Friday.
const fridayMarch1LeapYear = new Date(2024, 2, 1, 14, 0, 0);
const mondayFromLeapYear = getMostRecentMonday7am(fridayMarch1LeapYear);
assert.strictEqual(mondayFromLeapYear.getFullYear(), 2024);
assert.strictEqual(mondayFromLeapYear.getMonth(), 1, 'Should roll back to February (month index 1)');
assert.strictEqual(mondayFromLeapYear.getDate(), 26, 'Should be Monday Feb 26');
assert.strictEqual(mondayFromLeapYear.getHours(), 7, 'Hour must be 7 AM');

// On leap day itself (Feb 29, 2024)
const leapDay = new Date(2024, 1, 29, 11, 0, 0);
const mondayFromLeapDay = getMostRecentMonday7am(leapDay);
assert.strictEqual(mondayFromLeapDay.getDate(), 26);
assert.strictEqual(mondayFromLeapDay.getHours(), 7);

// 2.4 DST Transition Tests (US Eastern DST 2024)
// US Spring forward 2024: Sunday March 10 at 2:00 AM clocks skip to 3:00 AM
// Monday March 11 before 7:00 AM (06:30 AM) -> must roll back 7 days to March 4 at 7:00 AM
const monPre7DstSpring = new Date(2024, 2, 11, 6, 30, 0);
const resPre7Dst = getMostRecentMonday7am(monPre7DstSpring);
assert.strictEqual(resPre7Dst.getDate(), 4, 'Should roll back to March 4');
assert.strictEqual(resPre7Dst.getHours(), 7, 'Hour must remain 7 AM across DST');

// Monday March 11 after 7:00 AM (08:00 AM) -> should be March 11 at 7:00 AM
const monPost7DstSpring = new Date(2024, 2, 11, 8, 0, 0);
const resPost7Dst = getMostRecentMonday7am(monPost7DstSpring);
assert.strictEqual(resPost7Dst.getDate(), 11, 'Should be current Monday March 11');
assert.strictEqual(resPost7Dst.getHours(), 7, 'Hour must be 7 AM');

// US Fall back 2024: Sunday Nov 3 at 2:00 AM clocks fall back to 1:00 AM
// Monday Nov 4 before 7:00 AM -> rolls back to Oct 28 at 7:00 AM
const monPre7DstFall = new Date(2024, 10, 4, 6, 0, 0);
const resPre7Fall = getMostRecentMonday7am(monPre7DstFall);
assert.strictEqual(resPre7Fall.getMonth(), 9, 'Should roll back to October (month index 9)');
assert.strictEqual(resPre7Fall.getDate(), 28, 'Should be Oct 28');
assert.strictEqual(resPre7Fall.getHours(), 7, 'Hour must remain 7 AM');

// 2.5 resolveClassLearningPaths Boundary Tests
// Null/undefined classDoc
assert.deepStrictEqual(resolveClassLearningPaths(null), DEFAULT_PATHS);
assert.deepStrictEqual(resolveClassLearningPaths(undefined), DEFAULT_PATHS);

// Missing categoryNames (null or undefined) but has categorySubtitles
const docSubtitlesOnly = {
  categorySubtitles: { path1: 'Custom Subtitle for Path 1' }
};
const resolvedSubOnly = resolveClassLearningPaths(docSubtitlesOnly);
assert.strictEqual(resolvedSubOnly[0].subtitle, 'Custom Subtitle for Path 1');
assert.strictEqual(resolvedSubOnly[0].title, DEFAULT_PATHS[0].title, 'Title should remain default if missing in categoryNames');

// Empty categoryNames object {}
const docEmptyNames = { categoryNames: {} };
const resolvedEmptyNames = resolveClassLearningPaths(docEmptyNames);
assert.strictEqual(resolvedEmptyNames.length, DEFAULT_PATHS.length, 'Empty categoryNames should preserve default paths');

// Custom category addition with non-existent ID
const docExtraCategory = {
  categoryNames: {
    'path1': 'Wordsmith',
    'new-robotics': 'Robotics Lab'
  },
  categoryOrder: ['new-robotics', 'path1']
};
const resolvedExtra = resolveClassLearningPaths(docExtraCategory);
assert.strictEqual(resolvedExtra.length, 2);
assert.strictEqual(resolvedExtra[0].id, 'new-robotics');
assert.strictEqual(resolvedExtra[0].title, 'Robotics Lab');
assert.strictEqual(resolvedExtra[0].color, PATH_COLORS[0]);
assert.strictEqual(resolvedExtra[1].id, 'path1');
assert.strictEqual(resolvedExtra[1].color, PATH_COLORS[1]);

// More than 6 categories color cycling test
const docManyCategories = {
  categoryNames: {
    c1: 'Cat 1', c2: 'Cat 2', c3: 'Cat 3', c4: 'Cat 4', c5: 'Cat 5', c6: 'Cat 6', c7: 'Cat 7', c8: 'Cat 8'
  },
  categoryOrder: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
};
const resolvedMany = resolveClassLearningPaths(docManyCategories);
assert.strictEqual(resolvedMany.length, 8);
assert.strictEqual(resolvedMany[6].color, PATH_COLORS[0], 'Index 6 should cycle back to color 0');
assert.strictEqual(resolvedMany[7].color, PATH_COLORS[1], 'Index 7 should cycle back to color 1');

console.log('✔ gameUtils boundary and stress tests passed.');

// ============================================================================
// SECTION 3: authUtils.js Boundary & Stress Tests
// ============================================================================

// 3.1 Null and undefined users
assert.strictEqual(isAdminUser(null), false, 'null user is not admin');
assert.strictEqual(isAdminUser(undefined), false, 'undefined user is not admin');
assert.strictEqual(isAdminUser({}), false, 'empty object is not admin');

// 3.2 Undefined or null roles
assert.strictEqual(isAdminUser({ role: undefined }), false, 'undefined role is not admin');
assert.strictEqual(isAdminUser({ role: null }), false, 'null role is not admin');
assert.strictEqual(isAdminUser({ role: '' }), false, 'empty string role is not admin');
assert.strictEqual(isAdminUser({ role: 'teacher' }), false, 'teacher role is not admin');
assert.strictEqual(isAdminUser({ role: 'student' }), false, 'student role is not admin');

// 3.3 Valid admin roles
assert.strictEqual(isAdminUser({ role: 'admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super_admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super admin' }), true);

// 3.4 Mixed-case and whitespace in emails
assert.strictEqual(isAdminUser({ email: 'matthew.harbert@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'Matthew.Harbert@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'MATTHEW.HARBERT@LCPS.ORG' }), true);
assert.strictEqual(isAdminUser({ email: '  matthew.harbert@lcps.org  ' }), true);

assert.strictEqual(isAdminUser({ email: 'propellevelup@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'PropelLevelUp@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'PROPELLEVELUP@LCPS.ORG' }), true);
assert.strictEqual(isAdminUser({ email: '  PROPELLEVELUP@LCPS.ORG  ' }), true);

// 3.5 Non-admin emails
assert.strictEqual(isAdminUser({ email: 'other.teacher@lcps.org' }), false);
assert.strictEqual(isAdminUser({ email: 'admin@fakedomain.org' }), false);

// 3.6 Combined role and email precedence
assert.strictEqual(isAdminUser({ role: 'teacher', email: 'matthew.harbert@lcps.org' }), true, 'Admin email elevates even with teacher role');
assert.strictEqual(isAdminUser({ role: 'admin', email: 'regular@school.org' }), true, 'Admin role elevates even with regular email');

console.log('✔ authUtils boundary and stress tests passed.');
console.log('\n==========================================');
console.log('🎉 ALL BOUNDARY & STRESS TESTS PASSED!');
console.log('==========================================');
