import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 1. Verify mockBackend.js is genuinely absent
console.log('[AUDIT CHECK 1] Verifying mockBackend.js deletion...');
const mockBackendPath = path.resolve('src/services/mockBackend.js');
assert.strictEqual(fs.existsSync(mockBackendPath), false, 'mockBackend.js MUST not exist on disk');
console.log('✔ mockBackend.js is genuinely deleted from disk.');

// 2. Verify textUtils.js implementation
console.log('\n[AUDIT CHECK 2] Verifying textUtils.js implementation & edge cases...');
import { normalizeStep, normalizeSteps, renderFormattedText } from '../../../src/utils/textUtils.js';

// Test normalizeStep edge cases
assert.deepStrictEqual(normalizeStep(null), { text: '', link: '', linkText: '', completed: false });
assert.deepStrictEqual(normalizeStep(undefined), { text: '', link: '', linkText: '', completed: false });
assert.deepStrictEqual(normalizeStep(''), { text: '', link: '', linkText: '', completed: false });
assert.deepStrictEqual(normalizeStep('Simple string step'), { text: 'Simple string step', link: '', linkText: '', completed: false });
assert.deepStrictEqual(
  normalizeStep({ text: 'Object step', link: 'https://test.org', linkText: 'Test', completed: true }),
  { text: 'Object step', link: 'https://test.org', linkText: 'Test', completed: true }
);
assert.deepStrictEqual(
  normalizeStep({ text: 'Partial step', extraProp: 123 }),
  { text: 'Partial step', link: '', linkText: '', completed: false, extraProp: 123 }
);

// Test normalizeSteps edge cases
assert.deepStrictEqual(normalizeSteps(null), []);
assert.deepStrictEqual(normalizeSteps(undefined), []);
assert.deepStrictEqual(normalizeSteps([]), []);
assert.deepStrictEqual(normalizeSteps(['', null, { text: '' }, { link: '' }]), []);
const stepsResult = normalizeSteps([
  'Step 1',
  { text: 'Step 2', link: 'https://example.com' },
  null,
  { text: '', link: 'https://linkonly.com' }
]);
assert.strictEqual(stepsResult.length, 3);
assert.strictEqual(stepsResult[0].text, 'Step 1');
assert.strictEqual(stepsResult[1].text, 'Step 2');
assert.strictEqual(stepsResult[2].link, 'https://linkonly.com');

// Test renderFormattedText
assert.strictEqual(renderFormattedText(null), null);
assert.strictEqual(renderFormattedText(''), null);
assert.strictEqual(renderFormattedText(123), 123);

const plain = renderFormattedText('Just plain text');
assert.strictEqual(plain[0].props.children, 'Just plain text');

const bold = renderFormattedText('Start **bolded** end');
assert.strictEqual(bold.length, 3);
assert.strictEqual(bold[0].props.children, 'Start ');
assert.strictEqual(bold[1].type, 'strong');
assert.strictEqual(bold[1].props.children, 'bolded');
assert.strictEqual(bold[2].props.children, ' end');

const italic = renderFormattedText('Prefix *slanted* suffix');
assert.strictEqual(italic.length, 3);
assert.strictEqual(italic[0].props.children, 'Prefix ');
assert.strictEqual(italic[1].type, 'em');
assert.strictEqual(italic[1].props.children, 'slanted');
assert.strictEqual(italic[2].props.children, ' suffix');

const mixed = renderFormattedText('**Bold** and *Italic* together');
assert.strictEqual(mixed.length, 4);
assert.strictEqual(mixed[0].type, 'strong');
assert.strictEqual(mixed[0].props.children, 'Bold');
assert.strictEqual(mixed[1].props.children, ' and ');
assert.strictEqual(mixed[2].type, 'em');
assert.strictEqual(mixed[2].props.children, 'Italic');
assert.strictEqual(mixed[3].props.children, ' together');

console.log('✔ textUtils.js passed all unit and edge case tests.');

// 3. Verify gameUtils.js implementation
console.log('\n[AUDIT CHECK 3] Verifying gameUtils.js implementation & edge cases...');
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  getMostRecentMonday7am,
  resolveClassLearningPaths
} from '../../../src/utils/gameUtils.js';
import { LEVELS, LEARNING_PATHS, PATH_COLORS } from '../../../src/data/gameData.js';

// getLevelForXp boundary tests
assert.strictEqual(getLevelForXp(0).level, 1);
assert.strictEqual(getLevelForXp(-50).level, 1);
assert.strictEqual(getLevelForXp(199).level, 1);
assert.strictEqual(getLevelForXp(200).level, 2);
assert.strictEqual(getLevelForXp(499).level, 2);
assert.strictEqual(getLevelForXp(500).level, 3);
assert.strictEqual(getLevelForXp(1400).level, 5);
assert.strictEqual(getLevelForXp(62000).level, 25);
assert.strictEqual(getLevelForXp(1000000).level, 25);

// calculateLevelAndBonusCoins tests
const noBonus = calculateLevelAndBonusCoins(100, 199);
assert.strictEqual(noBonus.bonusCoins, 0);
assert.strictEqual(noBonus.oldLevel.level, 1);
assert.strictEqual(noBonus.newLevel.level, 1);

// Level 1 to 2 -> 25 coins
const bonus1to2 = calculateLevelAndBonusCoins(100, 200);
assert.strictEqual(bonus1to2.bonusCoins, 25);
assert.strictEqual(bonus1to2.oldLevel.level, 1);
assert.strictEqual(bonus1to2.newLevel.level, 2);

// Level 1 to 4 -> Level 2 (25) + Level 3 (50) + Level 4 (75) = 150 coins
const bonus1to4 = calculateLevelAndBonusCoins(0, 950);
assert.strictEqual(bonus1to4.bonusCoins, 150);
assert.strictEqual(bonus1to4.oldLevel.level, 1);
assert.strictEqual(bonus1to4.newLevel.level, 4);

// getMostRecentMonday7am tests
// Test Tuesday 14:30
const tuesdayDate = new Date('2026-10-27T14:30:00');
const monFromTue = getMostRecentMonday7am(tuesdayDate);
assert.strictEqual(monFromTue.getDay(), 1, 'Day must be Monday (1)');
assert.strictEqual(monFromTue.getHours(), 7, 'Hour must be 7');
assert.strictEqual(monFromTue.getMinutes(), 0);
assert.strictEqual(monFromTue.getSeconds(), 0);
assert.strictEqual(monFromTue.getDate(), 26);

// Test Monday 06:45 (before 7am) -> rolls back to previous Monday
const monEarly = new Date('2026-10-26T06:45:00');
const monFromEarly = getMostRecentMonday7am(monEarly);
assert.strictEqual(monFromEarly.getDay(), 1);
assert.strictEqual(monFromEarly.getHours(), 7);
assert.strictEqual(monFromEarly.getDate(), 19);

// Test Monday 07:01 (after 7am) -> returns today Monday 7am
const monLate = new Date('2026-10-26T07:01:00');
const monFromLate = getMostRecentMonday7am(monLate);
assert.strictEqual(monFromLate.getDay(), 1);
assert.strictEqual(monFromLate.getHours(), 7);
assert.strictEqual(monFromLate.getDate(), 26);

// Test Sunday 23:59 -> returns last Monday 7am
const sunNight = new Date('2026-10-25T23:59:00');
const monFromSun = getMostRecentMonday7am(sunNight);
assert.strictEqual(monFromSun.getDay(), 1);
assert.strictEqual(monFromSun.getHours(), 7);
assert.strictEqual(monFromSun.getDate(), 19);

// resolveClassLearningPaths tests
const defaultResolved = resolveClassLearningPaths(null, LEARNING_PATHS);
assert.deepStrictEqual(defaultResolved, LEARNING_PATHS);

const classDocWithOrdering = {
  categoryNames: {
    'custom-stem': 'Makerspace Engineering',
    'coding': 'Game Design'
  },
  categorySubtitles: {
    'custom-stem': 'Hands-on builds',
    'coding': 'Scratch and Python'
  },
  categoryOrder: ['coding', 'custom-stem']
};
const customResolved = resolveClassLearningPaths(classDocWithOrdering, LEARNING_PATHS);
assert.strictEqual(customResolved.length, 2);
assert.strictEqual(customResolved[0].id, 'coding');
assert.strictEqual(customResolved[0].title, 'Game Design');
assert.strictEqual(customResolved[0].color, PATH_COLORS[0]);
assert.strictEqual(customResolved[1].id, 'custom-stem');
assert.strictEqual(customResolved[1].title, 'Makerspace Engineering');
assert.strictEqual(customResolved[1].color, PATH_COLORS[1]);

console.log('✔ gameUtils.js passed all unit and edge case tests.');

// 4. Verify authUtils.js implementation
console.log('\n[AUDIT CHECK 4] Verifying authUtils.js implementation & edge cases...');
import { isAdminUser } from '../../../src/utils/authUtils.js';

assert.strictEqual(isAdminUser(null), false);
assert.strictEqual(isAdminUser(undefined), false);
assert.strictEqual(isAdminUser(''), false);
assert.strictEqual(isAdminUser(123), false);
assert.strictEqual(isAdminUser({}), false);
assert.strictEqual(isAdminUser({ role: 'teacher' }), false);
assert.strictEqual(isAdminUser({ role: 'student' }), false);
assert.strictEqual(isAdminUser({ role: 'admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super_admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super admin' }), true);
assert.strictEqual(isAdminUser({ email: 'matthew.harbert@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: '  MATTHEW.HARBERT@LCPS.ORG  ' }), true);
assert.strictEqual(isAdminUser({ email: 'propellevelup@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'PROPELLEVELUP@LCPS.ORG' }), true);
assert.strictEqual(isAdminUser({ email: 'random.teacher@lcps.org' }), false);

console.log('✔ authUtils.js passed all unit and edge case tests.');

// 5. Verify re-exports from AuthContext.jsx
console.log('\n[AUDIT CHECK 5] Verifying AuthContext.jsx export contract...');
const authContextSource = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');
assert(authContextSource.includes("export { isAdminUser } from '../utils/authUtils.js';"), 'AuthContext must export isAdminUser');
assert(!authContextSource.includes("joinClassAsStudent"), 'Dead joinClassAsStudent must be removed');
console.log('✔ AuthContext.jsx export contract verified.');

// 6. Verify useGameState.js bug fixes
console.log('\n[AUDIT CHECK 6] Verifying useGameState.js bug fixes...');
const useGameStateSourceRaw = fs.readFileSync('src/hooks/useGameState.js', 'utf8');
const useGameStateSource = useGameStateSourceRaw.replace(/\r\n/g, '\n');

// Bug 1: setDataLoaded(true) only on success, setDataLoaded(false) on error, no finally { setDataLoaded(true) }
assert(useGameStateSource.includes('setDataLoaded(true);'), 'Must set data loaded on success');
assert(useGameStateSource.includes('setDataLoaded(false);'), 'Must set data loaded false on error');
assert(!useGameStateSource.includes('finally {\n      setDataLoaded(true);'), 'Must not set data loaded in finally block');

// Bug 2: checkLevelUp in boss challenge completion
const bossSectionRegex = /if\s*\(submission\.isBoss\)\s*\{[\s\S]*?checkLevelUp\(prev,\s*updatedState\);[\s\S]*?\}/;
assert(bossSectionRegex.test(useGameStateSource), 'useGameState must call checkLevelUp on boss challenge completion');

// Bug 3: Double XP consumption
assert(useGameStateSource.includes('if (prev.doubleXpActive) {\n         xpEarned *= 2;\n       }'), 'Must apply double XP multiplier');
assert(useGameStateSource.includes('doubleXpActive: false,'), 'Must reset doubleXpActive in updated state');

// Bug 4: Streak shield protection and consumption
assert(useGameStateSource.includes('else if (diff > 8 && prev.streakShieldActive) {\n               // Streak shield protects the streak from resetting; consume the shield!\n               streakShieldActive = false;\n             }'), 'Must protect streak and consume streakShieldActive');

// Bug 5: Immutable high-five recording
assert(useGameStateSource.includes('const recordHighFive = useCallback((targetMemberId, isoString = new Date().toISOString()) => {'), 'Must define recordHighFive callback');
assert(!useGameStateSource.includes('gameState.highFivesSent = [...prev, targetId]'), 'Must not mutate gameState.highFivesSent directly');

// Bug 6: Revocation reconciliation
assert(useGameStateSource.includes('reconcileRevokedSubmission(serverSub);'), 'Realtime listener must call reconcileRevokedSubmission on un-approval');
assert(useGameStateSource.includes('const reconcileRevokedSubmission = (submission) => {'), 'Must define reconcileRevokedSubmission handler');

// Dead exports removed from useGameState
assert(!useGameStateSource.includes('approveSubmission: () => {}'), 'Dead approveSubmission export must be removed');
assert(!useGameStateSource.includes('rejectSubmission: () => {}'), 'Dead rejectSubmission export must be removed');
assert(!useGameStateSource.includes('clearReviewedSubmissions: () => {}'), 'Dead clearReviewedSubmissions export must be removed');
assert(!useGameStateSource.includes('validateTeacherPin: () => false'), 'Dead validateTeacherPin export must be removed');

console.log('✔ useGameState.js bug fixes verified in source code.');

// 7. Verify realBackend.js Path Masters logic & consolidation
console.log('\n[AUDIT CHECK 7] Verifying realBackend.js logic...');
const realBackendSource = fs.readFileSync('src/services/realBackend.js', 'utf8');
assert(realBackendSource.includes("import { calculateLevelAndBonusCoins } from \"../utils/gameUtils.js\";"), 'Must import calculateLevelAndBonusCoins');
assert(realBackendSource.includes("import { isAdminUser } from \"../utils/authUtils.js\";"), 'Must import isAdminUser');
assert(realBackendSource.includes("currentVal = Object.keys(pathCounts).filter(pid => pathCounts[pid] >= 2).length;"), 'Must compute distinct qualifying paths for Path Masters challenge');
console.log('✔ realBackend.js logic verified.');

// 8. Verify DocumentImporterModal docx guard
console.log('\n[AUDIT CHECK 8] Verifying DocumentImporterModal docx guard...');
const docImporterSource = fs.readFileSync('src/components/DocumentImporterModal.jsx', 'utf8');
assert(docImporterSource.includes("file.name.toLowerCase().endsWith('.docx')"), 'Must guard against .docx upload');
assert(docImporterSource.includes("accept=\".txt,.md\""), 'Must limit accept attribute to .txt and .md');
console.log('✔ DocumentImporterModal docx guard verified.');

// 9. Verify RosterManager single-column roster support
console.log('\n[AUDIT CHECK 9] Verifying RosterManager single-column support...');
const rosterSource = fs.readFileSync('src/components/RosterManager.jsx', 'utf8');
assert(rosterSource.includes("const pass = (parts.length >= 2 && parts[1]?.trim()) ? parts[1].trim() : '1234';"), 'Must default password to 1234 for single-column rosters');
console.log('✔ RosterManager single-column support verified.');

// 10. Verify TeacherPortal per-submission feedback state
console.log('\n[AUDIT CHECK 10] Verifying TeacherPortal feedback isolation...');
const teacherPortalSource = fs.readFileSync('src/components/TeacherPortal.jsx', 'utf8');
assert(teacherPortalSource.includes("const [feedbackMap, setFeedbackMap] = useState({});"), 'Must use feedbackMap instead of scalar feedback state');
console.log('✔ TeacherPortal feedback isolation verified.');

console.log('\n==========================================');
console.log('🎉 ALL INDEPENDENT AUDIT CHECKS PASSED!');
console.log('==========================================');
