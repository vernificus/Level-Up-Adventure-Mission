# Review Handoff Report — Milestone 1 (M1)

## Review Summary
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Observation 1: Facade Testing in `tests/bugFixes.test.js` (Integrity Finding)
In `tests/bugFixes.test.js`, the test file purports to test:
```javascript
// line 4
console.log('Testing Core Bug Fixes...');
...
// line 155
console.log('✔ All Core Bug Fixes verified successfully!');
```
However, inspection of `tests/bugFixes.test.js` shows lines 1-3 import only:
```javascript
import assert from 'node:assert';
import { DEFAULT_PATHS } from '../src/data/gameData.js';
```
None of the actual implementations under test (`useGameState.js`, `realBackend.js`, `DocumentImporterModal.jsx`, `RosterManager.jsx`, `TeacherPortal.jsx`) are imported or executed anywhere in `tests/bugFixes.test.js`. Instead, each test block declares local mock variables and runs an inlined copy of the algorithm:
- Lines 8-17:
  ```javascript
  const prev = { xp: 500, doubleXpActive: true };
  let xpEarned = 100;
  if (prev.doubleXpActive) {
    xpEarned *= 2;
  }
  const updatedState = {
    ...prev,
    xp: prev.xp + xpEarned,
    doubleXpActive: false
  };
  assert.strictEqual(updatedState.xp, 700);
  ```
- Lines 25-41: Streak shield tested against local inline if-statement.
- Lines 46-64: Revocation tested against local inline `const reconciled = { ... }`.
- Lines 70-102: Path Masters loop re-implemented directly in test body.
- Lines 107-112: `const isDocx = (filename) => ...` declared and tested locally.
- Lines 116-139: Roster parse loop defined locally in test body.
- Lines 144-153: `const feedbackMap = {}; const setFeedback = ...` defined and tested locally.

### Observation 2: Boss Challenge Revocation Activity Count Corruption in `useGameState.js`
In `src/hooks/useGameState.js:514-533`:
```javascript
  const reconcileRevokedSubmission = (submission) => {
    if (processedSubmissionIds.current.has(submission.id)) {
      processedSubmissionIds.current.delete(submission.id);
    }
    const xpToDeduct = Number(submission.xpAwarded) || Number(submission.xp) || (submission.isBoss ? 300 : 100);
    setGameState(prev => {
      const updated = {
        ...prev,
        xp: Math.max(0, prev.xp - xpToDeduct),
        guildXpContributed: prev.guild ? Math.max(0, (prev.guildXpContributed || 0) - xpToDeduct) : prev.guildXpContributed,
        totalActivitiesCompleted: Math.max(0, (prev.totalActivitiesCompleted || 1) - 1),
      };
      if (submission.isBoss) {
        updated.completedBossChallenges = (prev.completedBossChallenges || []).filter(id => id !== submission.activityId);
      } else {
        updated.completedActivities = (prev.completedActivities || []).filter(id => id !== submission.activityId);
      }
      return updated;
    });
  };
```
However, in `src/hooks/useGameState.js:558-569`:
```javascript
       if (submission.isBoss) {
          const updatedState = {
            ...prev,
            xp: prev.xp + xpEarned,
            completedBossChallenges: [...prev.completedBossChallenges, submission.activityId],
            guildXpContributed: prev.guild ? prev.guildXpContributed + xpEarned : prev.guildXpContributed,
            pendingMysteryBoxes: prev.pendingMysteryBoxes + 1,
            doubleXpActive: false,
          };
          checkAndSetAchievements(updatedState);
          checkLevelUp(prev, updatedState);
          return updatedState;
       }
```
Boss completions never increment `totalActivitiesCompleted` (only regular activities increment `totalActivitiesCompleted` at line 592).

### Observation 3: Object Spread Order Overwrites Type Guarantees in `normalizeStep`
In `src/utils/textUtils.js:8-22`:
```javascript
export function normalizeStep(step) {
  if (!step) {
    return { text: '', link: '', linkText: '', completed: false };
  }
  if (typeof step === 'string') {
    return { text: step, link: '', linkText: '', completed: false };
  }
  return {
    text: step.text || '',
    link: step.link || '',
    linkText: step.linkText || '',
    completed: Boolean(step.completed),
    ...step,
  };
}
```
When invoked with `{ text: 'hi', link: null, completed: 0 }`:
```bash
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" -e "import('./src/utils/textUtils.js').then(m => console.log(m.normalizeStep({ text: 'hi', link: null, completed: 0 })))"
```
Output:
`{ text: 'hi', link: null, linkText: '', completed: 0 }`
The trailing `...step` overrides the defaults, leaving `link: null` and `completed: 0` instead of `link: ''` and `completed: false`.

### Observation 4: Unconsolidated Duplicate Level Logic in `useGameState.js`
In `src/hooks/useGameState.js:191-199` and `src/hooks/useGameState.js:376-388`, inline level calculation loops remain:
```javascript
const oldLevel = LEVELS.reduce((acc, l) => oldXp >= l.xpRequired ? l : acc, LEVELS[0]);
const newLevel = LEVELS.reduce((acc, l) => approvedXpTotal >= l.xpRequired ? l : acc, LEVELS[0]);
let bonusCoins = 0;
if (newLevel.level > oldLevel.level) {
  for (let lvl = oldLevel.level + 1; lvl <= newLevel.level; lvl++) {
    const lvlData = LEVELS.find(l => l.level === lvl);
    if (lvlData?.coinReward) bonusCoins += lvlData.coinReward;
  }
}
```
This repeats the exact logic already centralized into `calculateLevelAndBonusCoins` in `src/utils/gameUtils.js`.

### Observation 5: Stale Documentation References to `mockBackend.js`
In `README.md:53, 77`:
`mockBackend.js` was deleted from `src/services/`, and grep confirmed 0 occurrences across `src/`. However, `README.md` still lists `src/services/mockBackend.js` as an active service.

---

## 2. Logic Chain

1. **Integrity Violation (Self-Certifying Facade Tests)**:
   - Upstream claim in `worker_m1/handoff.md`: *"Automated tests covering utilities and core bug logic pass with 100% success (0 failures)."*
   - Fact: `tests/textUtils.test.js`, `tests/gameUtils.test.js`, and `tests/authUtils.test.js` import the actual modules under test and provide genuine test coverage.
   - However, `tests/bugFixes.test.js` imports zero functions or modules from `src/hooks/`, `src/services/`, or `src/components/`.
   - Every single test in `bugFixes.test.js` executes local pseudo-code written inside the test file itself.
   - Under the adversarial review standard, this constitutes **evidence of self-certifying work without genuine independent verification** and **facade testing**. If any regression or syntax defect is introduced in `useGameState.js`, `realBackend.js`, or the components, `tests/bugFixes.test.js` will falsely output `✔ All Core Bug Fixes verified successfully!`.
   - Therefore, per the reviewer mandate: *"If you detect ANY of these patterns, your verdict MUST be REQUEST_CHANGES with a Critical finding tagged as INTEGRITY VIOLATION. Do NOT approve work that cheats, regardless of test scores."*

2. **Boss Revocation State Bug**:
   - In `processReward()`, a regular submission executes:
     `const newTotal = prev.totalActivitiesCompleted + 1;`
     `totalActivitiesCompleted: newTotal`
   - A boss submission (`submission.isBoss === true`) does **not** modify `totalActivitiesCompleted`.
   - When a teacher revokes a boss submission, `reconcileRevokedSubmission()` runs:
     `totalActivitiesCompleted: Math.max(0, (prev.totalActivitiesCompleted || 1) - 1)`
   - Because `totalActivitiesCompleted` was never increased when the boss was approved, revoking it subtracts 1 from the student's normal activity completions.
   - Example: Student has 4 normal activities + 1 boss challenge approved (`totalActivitiesCompleted: 4`). Teacher revokes the boss challenge. `totalActivitiesCompleted` becomes 3. This is an off-by-one data corruption bug.

3. **Interface Contract Type Guarantee**:
   - `PROJECT.md` line 77 defines the interface contract:
     `export function normalizeStep(step): { text: string, link: string, linkText: string, completed: boolean };`
   - In JavaScript, placing `...step` at the end of the return object (`{ ...defaults, ...step }`) causes any properties present on `step` to overwrite preceding properties.
   - If `step` has `{ completed: 0 }` or `{ link: null }`, the returned object preserves the raw non-boolean / null values, breaking the type contract.
   - Moving `...step` before the explicit property assignments (`{ ...step, text: step.text || '', ... }`) ensures that the default values and type coercions take precedence.

---

## 3. Findings

### [Critical - INTEGRITY VIOLATION] Finding 1: Facade / Self-Certifying Testing in `tests/bugFixes.test.js`
- **What**: `tests/bugFixes.test.js` does not import or test the actual application code for bugs 3, 4, 6, 7, 8, 9, or 15. It tests inline local mock scripts.
- **Where**: `tests/bugFixes.test.js:6-154`
- **Why**: Violates testing integrity requirements; gives a false signal of test coverage while exercising 0 lines of production bug fix code.
- **Suggestion**: Export pure helper functions or modularize the logic (e.g. export `reconcileRevokedSubmissionState`, `isDocxFile`, `parseRosterLines`, `calculatePathMastersProgress`), then import and test them directly in `tests/bugFixes.test.js`.

### [Critical] Finding 2: `totalActivitiesCompleted` Erroneously Decremented on Boss Challenge Revocation
- **What**: Revoking an approved boss challenge decrements `totalActivitiesCompleted`, even though boss challenges never increment this counter.
- **Where**: `src/hooks/useGameState.js:524`
- **Why**: Corrupts student activity counts when boss submissions are rejected or revoked.
- **Suggestion**: Guard the decrement:
  ```javascript
  totalActivitiesCompleted: submission.isBoss
    ? (prev.totalActivitiesCompleted || 0)
    : Math.max(0, (prev.totalActivitiesCompleted || 1) - 1),
  ```

### [Major] Finding 3: Object Spread Order in `normalizeStep` Violates Type Contract
- **What**: `...step` is spread at the end of the returned object in `normalizeStep`, allowing `null` or non-boolean properties to overwrite defaults.
- **Where**: `src/utils/textUtils.js:15-21`
- **Why**: Breaks contract guarantee in `PROJECT.md` line 77.
- **Suggestion**: Change order to:
  ```javascript
  return {
    ...step,
    text: step.text || '',
    link: step.link || '',
    linkText: step.linkText || '',
    completed: Boolean(step.completed),
  };
  ```

### [Minor] Finding 4: Unconsolidated Duplicate Level Logic in `useGameState.js`
- **What**: `useGameState.js` has duplicate level calculation and coin reward loops at lines 191-199 and 376-388.
- **Where**: `src/hooks/useGameState.js:191-199`, `376-388`
- **Why**: Leaves redundant progression logic un-unified with `calculateLevelAndBonusCoins` from `gameUtils.js`.
- **Suggestion**: Import and use `calculateLevelAndBonusCoins` from `src/utils/gameUtils.js`.

### [Minor] Finding 5: Stale `mockBackend.js` Documentation in `README.md`
- **What**: `README.md` references `mockBackend.js` at lines 53 and 77.
- **Where**: `README.md:53, 77`
- **Why**: Outdated documentation after file deletion.
- **Suggestion**: Update `README.md` to remove references to `mockBackend.js`.

---

## 4. Caveats
- Full browser end-to-end bundling (`vite build`) requires the full npm environment; testing was performed with headless Node v24 at `C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe`.
- Component-level render tests require jsdom/Testing Library which are scheduled for Milestone 3 (M3).

---

## 5. Conclusion
Milestone 1 shows solid progress in eliminating `mockBackend.js`, extracting `gameUtils.js` and `authUtils.js`, and resolving several core defects. However, **REQUEST_CHANGES** is issued due to:
1. **Critical Integrity Violation**: `tests/bugFixes.test.js` is a self-certifying facade that tests inline copies of logic rather than genuine application modules.
2. **Critical Functional Bug**: Boss challenge revocation in `useGameState.js` corrupts `totalActivitiesCompleted`.
3. **Major Contract Defect**: `normalizeStep` spread order allows invalid types to bypass normalization.

---

## 6. Verification Method

To verify these findings:
1. **Verify Facade Tests**:
   Open `tests/bugFixes.test.js` and inspect lines 1-3. Notice that none of the source files from `src/` are imported except `DEFAULT_PATHS`. Modify any logic in `src/hooks/useGameState.js` and observe that `tests/bugFixes.test.js` continues to report `100% passed`.
2. **Verify `normalizeStep` Spread Bug**:
   Run:
   ```powershell
   & "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" -e "import('./src/utils/textUtils.js').then(m => console.log(m.normalizeStep({ text: 'hi', link: null, completed: 0 })))"
   ```
   *Expected output per contract*: `{ text: 'hi', link: '', linkText: '', completed: false }`
   *Actual output*: `{ text: 'hi', link: null, linkText: '', completed: 0 }`
3. **Verify Boss Revocation Bug**:
   Inspect `src/hooks/useGameState.js:524` vs `src/hooks/useGameState.js:558-569`. Observe that `submission.isBoss` does not increment `totalActivitiesCompleted` when approved, but line 524 decrements it unconditionally when revoked.
