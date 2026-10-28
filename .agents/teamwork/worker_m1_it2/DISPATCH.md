# Task Assignment: Milestone 1 - Iteration 2 (Remediation of Reviewer Findings)

## Working Directory
c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1_it2

## Mandatory References
1. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read first)
2. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
3. Reviewer Reports:
   - `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\reviewer_m1_1\handoff.md`
   - `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\reviewer_m1_2\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Remediation Tasks for Iteration 2

### 1. Eliminate Facade Testing in `tests/bugFixes.test.js` [CRITICAL]
- Both Reviewer 1 and Reviewer 2 flagged `tests/bugFixes.test.js` because it did not import production modules, instead testing inline dummy variables and local re-implementations.
- You MUST import real production code:
  - Import `normalizeStep` and `normalizeSteps` from `src/utils/textUtils.js`.
  - Import `calculateLevelAndBonusCoins`, `getLevelForXp`, `resolveClassLearningPaths`, `getMostRecentMonday7am` from `src/utils/gameUtils.js`.
  - Import `isAdminUser` from `src/utils/authUtils.js`.
  - For `useGameState.js` state logic: Export pure state calculation helper functions (e.g. `calculateRewardState(prev, submission, options)`, `reconcileRevocationState(prev, submission)`, `calculateStreak(prev, today)`) or test pure functions directly imported from `src/hooks/useGameState.js` or `src/utils/gameUtils.js`.
  - Remove all pseudo-code duplicate algorithms from `tests/bugFixes.test.js`. Every test MUST test the real imported production code.

### 2. Fix Activity Count & Path Corruption on Revocation in `useGameState.js` [CRITICAL]
- In `reconcileRevokedSubmission` (`src/hooks/useGameState.js`):
  - `totalActivitiesCompleted`: Only decrement `totalActivitiesCompleted` if `!submission.isBoss`! Completing a Boss Challenge never incremented `totalActivitiesCompleted`, so revoking a Boss Challenge must NOT decrement `totalActivitiesCompleted`.
  - `pathCompletions`: If `submission.pathId && !submission.isBoss`, decrement `pathCompletions[submission.pathId] = Math.max(0, (prev.pathCompletions?.[submission.pathId] || 1) - 1)` so path counts remain accurate.

### 3. Fix Object Spread in `src/utils/textUtils.js:normalizeStep` [MAJOR]
- Ensure `normalizeStep(step)` strictly coerces and never lets trailing `...step` overwrite default type guarantees:
  ```javascript
  export function normalizeStep(step) {
    if (!step) {
      return { text: '', link: '', linkText: '', completed: false };
    }
    if (typeof step === 'string') {
      return { text: step, link: '', linkText: '', completed: false };
    }
    return {
      text: String(step.text || ''),
      link: String(step.link || ''),
      linkText: String(step.linkText || ''),
      completed: Boolean(step.completed),
    };
  }
  ```

### 4. Consolidate Duplicate Level Logic in `useGameState.js` [MINOR]
- In `src/hooks/useGameState.js`, replace lines 191-199 and 376-388 with calls to `calculateLevelAndBonusCoins` from `src/utils/gameUtils.js` to eliminate remaining duplicate loops.

### 5. Clean Stale References in `README.md` [MINOR]
- Remove references to deleted `src/services/mockBackend.js` in `README.md:53, 77`.

## Verification
- Run tests using the bundled Node runtime:
  `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`
- Ensure 100% test pass with zero facade testing.
- Write your complete handoff report to `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1_it2\handoff.md`.


## 2026-10-28T13:19:51Z
You are teamwork_worker for Milestone 1 (Iteration 2).
Your working directory is: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1_it2
Read your task assignment: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1_it2\DISPATCH.md
MANDATORY: Read c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Read reviewer reports at c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\reviewer_m1_1\handoff.md and c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\reviewer_m1_2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Remediate all issues raised:
1. Fix tests/bugFixes.test.js: ELIMINATE all inline facade testing! Import real production code from src/utils/ and export/test pure state calculation helpers from src/hooks/useGameState.js.
2. Fix useGameState.js: In reconcileRevokedSubmission, only decrement totalActivitiesCompleted if !submission.isBoss; decrement pathCompletions properly.
3. Fix src/utils/textUtils.js: In normalizeStep, do not let trailing spread overwrite type defaults.
4. Replace duplicate level calculation loops in useGameState.js with calculateLevelAndBonusCoins from gameUtils.js.
5. Clean stale mockBackend references in README.md.
6. Verify all tests pass: & "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js

Write your complete handoff report to c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1_it2\handoff.md.
Notify me using send_message when complete.
