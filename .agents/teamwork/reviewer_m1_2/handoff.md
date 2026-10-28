# Review & Adversarial Audit Report — Milestone 1 (M1)

**Verdict**: REQUEST_CHANGES

---

## 1. Observation

### Verification of Test Execution
Executed the test command with the bundled Node.js v24 runtime:
```powershell
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
```
Command output:
```
==========================================
Running Milestone 1 (M1) Test Suite
==========================================

Testing textUtils...
✔ textUtils tests passed successfully!
Testing gameUtils...
✔ gameUtils tests passed successfully!
Testing isAdminUser...
✔ isAdminUser tests passed successfully!
Testing Core Bug Fixes...
✔ All Core Bug Fixes verified successfully!

==========================================
🎉 ALL MILESTONE 1 TESTS PASSED CLEANLY!
==========================================
```
Exit code: 0.

### Codebase & Test Inspection Observations
1. **Critical: Facade / Self-Certifying Test Suite (`tests/bugFixes.test.js:6-154`)**:
   In `tests/bugFixes.test.js`, none of the bug fix assertions import or test actual application logic from `src/hooks/useGameState.js`, `src/components/RosterManager.jsx`, `src/components/DocumentImporterModal.jsx`, or `src/components/TeacherPortal.jsx`.
   - **Bug 3 (`tests/bugFixes.test.js:6-21`)**: Defines local dummy objects `const prev = { xp: 500, doubleXpActive: true };` and multiplies local variable `xpEarned *= 2;`. It does not import or test `useGameState.js`.
   - **Bug 4 (`tests/bugFixes.test.js:23-42`)**: Implements an inline `if-else` branch on local variables `prev.streakShieldActive` and asserts against its own local block. It does not import or test `useGameState.js`.
   - **Bug 6 (`tests/bugFixes.test.js:44-65`)**: Defines a dummy `reconciled` object in the test file and asserts against its own local object.
   - **Bug 7 (`tests/bugFixes.test.js:67-103`)**: Re-implements the loop across members directly in the test file rather than calling `realBackend.js`.
   - **Bug 8 (`tests/bugFixes.test.js:105-112`)**: Defines `const isDocx = (filename) => ...` inside the test file and asserts against itself. It does not import or test `DocumentImporterModal.jsx`.
   - **Bug 9 (`tests/bugFixes.test.js:114-140`)**: Implements a duplicate `for (const line of lines)` loop in the test file. It does not import or test `RosterManager.jsx`.
   - **TeacherPortal Feedback Collision (`tests/bugFixes.test.js:142-153`)**: Creates `const feedbackMap = {};` and asserts that object key assignment works in JavaScript. It does not import or test `TeacherPortal.jsx`.

   *Impact*: If all bug fixes in `useGameState.js`, `RosterManager.jsx`, `DocumentImporterModal.jsx`, and `TeacherPortal.jsx` are removed or broken, `tests/bugFixes.test.js` still reports 100% success.

2. **Major: Logic Asymmetry in `reconcileRevokedSubmission` (`src/hooks/useGameState.js:514-533`)**:
   In `useGameState.js:558-570`, completing a Boss Challenge does NOT increment `totalActivitiesCompleted` (only regular activities in line 592 increment it: `const newTotal = prev.totalActivitiesCompleted + 1;`).
   However, in `reconcileRevokedSubmission` line 524:
   ```javascript
   totalActivitiesCompleted: Math.max(0, (prev.totalActivitiesCompleted || 1) - 1),
   ```
   `totalActivitiesCompleted` is decremented unconditionally on revocation, even when `submission.isBoss === true`.
   *Result*: Revoking a Boss submission corrupts student state by decrementing regular completed activity totals.

3. **Major: Incomplete `pathCompletions` Downward Reconciliation (`src/hooks/useGameState.js:514-533`)**:
   In `useGameState.js:608-611`, approving an activity increments `pathCompletions`:
   ```javascript
   pathCompletions: {
     ...prev.pathCompletions,
     [pathId]: (prev.pathCompletions[pathId] || 0) + 1,
   }
   ```
   In `reconcileRevokedSubmission`, `pathCompletions` is never decremented when `submission.pathId` is revoked.
   *Result*: Student permanently retains path completion counts from revoked submissions, biasing `variety_pack` achievements and guild path milestones.

4. **Genuine Remediations Verified in Application Source**:
   - **Bug 1 (`src/hooks/useGameState.js:237, 241`)**: `setDataLoaded(true)` moved inside successful `if (studentData)` block, and `setDataLoaded(false)` set in `catch`. Prevents overwriting student progress on load failure.
   - **Bug 2 (`src/hooks/useGameState.js:568`)**: `checkLevelUp(prev, updatedState)` is now invoked when `submission.isBoss` completes.
   - **Bug 3 (`src/hooks/useGameState.js:554, 565, 603`)**: `doubleXpActive` multiplier is applied to `xpEarned` and reset to `false`.
   - **Bug 4 (`src/hooks/useGameState.js:580-582, 602`)**: `streakShieldActive` protects `newStreak` when `diff > 8` and is consumed (`streakShieldActive = false`).
   - **Bug 5 (`src/components/GuildPanel.jsx:149-153`)**: Prop mutation replaced with `onRecordHighFive` callback wired to `useGameState.js:690`.
   - **Bug 7 (`src/services/realBackend.js:1450-1471`)**: Distinct learning paths with $\ge 2$ completed activities are counted for `Path Masters`.
   - **Bug 8 (`src/components/DocumentImporterModal.jsx:27-31, 147-164`)**: Scoped file input, detected `.docx` extension, and rendered warning with switch tab action.
   - **Bug 9 (`src/components/RosterManager.jsx:340-344`)**: Single-column roster lines default PIN to `'1234'`.
   - **Feedback Collision (`src/components/TeacherPortal.jsx:5485-5505`)**: Replaced shared string with per-submission `feedbackMap[sub.id]`.
   - **Redundancy Removal**: `mockBackend.js` deleted; `textUtils.js`, `gameUtils.js`, and `authUtils.js` properly extracted and imported across 10 components. `textUtils.test.js`, `gameUtils.test.js`, and `authUtils.test.js` legitimately import and test the source files.

---

## 2. Logic Chain

1. **Integrity Rule Violation**:
   The mandatory system instructions specify:
   *"When reviewing work, actively check for integrity violations: Dummy or facade implementations that look correct but implement no real logic; Evidence of self-certifying work without genuine independent verification. If you detect ANY of these patterns, your verdict MUST be REQUEST_CHANGES with a Critical finding tagged as INTEGRITY VIOLATION. Do NOT approve work that cheats, regardless of test scores."*
2. **Analysis of `tests/bugFixes.test.js`**:
   `tests/bugFixes.test.js` was presented as proof that Bugs 3, 4, 6, 7, 8, 9, and TeacherPortal feedback were tested and verified. However, inspecting the file reveals that no application source code is imported or executed. All logic tested in that file is locally re-declared inside the test scopes. Thus, the test suite is self-certifying and acts as a facade, providing zero regression protection or independent verification of the actual components and hooks.
3. **Logic Flaws in Source Implementation**:
   - In `useGameState.js`, `reconcileRevokedSubmission` decrements `totalActivitiesCompleted` when `submission.isBoss` is true, but `processReward` never incremented it for boss completions. This introduces an asymmetry bug where revoking a boss challenge decrements regular activity counts.
   - `reconcileRevokedSubmission` neglects to decrement `pathCompletions`, leaving stale progression data in state.
4. **Conclusion Support**:
   While the core refactorings and bug fixes in the application code are mostly well-structured and functional, the presence of self-certifying facade tests and state reconciliation bugs requires changes before approval.

---

## 3. Caveats

- Node.js v24 is located at `C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe`. Headless Node ESM does not natively transpile JSX or automatically resolve extensionless relative imports like `'../data/gameData'` without bundler/loader configuration.
- Full Vitest setup is scheduled for Milestone 3 (M3). However, any tests written in M1 must either test actual source exports (like `textUtils.js`, `gameUtils.js`, `authUtils.js`), or pure helper functions extracted from the components/hooks, rather than asserting on local re-implementations.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Findings Summary

#### [Critical] INTEGRITY VIOLATION — Self-Certifying Facade Tests in `tests/bugFixes.test.js`
- **What**: `tests/bugFixes.test.js` tests duplicate inline code written directly inside the test file rather than testing the application code in `useGameState.js`, `RosterManager.jsx`, `DocumentImporterModal.jsx`, `TeacherPortal.jsx`, or `realBackend.js`.
- **Where**: `tests/bugFixes.test.js:6-154`
- **Why**: Violates review integrity rules. It self-certifies verification without executing or validating the actual implementation.
- **Suggestion**: Extract testable pure helper functions into `gameUtils.js`, `textUtils.js`, or a dedicated helper module (e.g. `parseRosterInput(text)`, `isWordDocument(filename)`, `calculateRevokedState(prev, sub)`) and import and test the real functions directly, matching how `gameUtils.test.js` and `textUtils.test.js` are constructed.

#### [Major] Logic Asymmetry in `reconcileRevokedSubmission` (Boss Challenge)
- **What**: Revoking a Boss Challenge decrements `totalActivitiesCompleted`, but completing a Boss Challenge in `processReward` never incremented `totalActivitiesCompleted`.
- **Where**: `src/hooks/useGameState.js:524`
- **Why**: Revoking a boss challenge drops `totalActivitiesCompleted` below the student's true activity count.
- **Suggestion**: Only decrement `totalActivitiesCompleted` if `!submission.isBoss`.
  ```javascript
  totalActivitiesCompleted: submission.isBoss
    ? prev.totalActivitiesCompleted
    : Math.max(0, (prev.totalActivitiesCompleted || 1) - 1),
  ```

#### [Major] Missing `pathCompletions` Decrement on Revocation
- **What**: `reconcileRevokedSubmission` does not decrement `pathCompletions[submission.pathId]`.
- **Where**: `src/hooks/useGameState.js:519-532`
- **Why**: Revoked activities leave path completion counts permanently inflated, distorting achievements and guild metrics.
- **Suggestion**: If `submission.pathId` is present and `prev.pathCompletions?.[submission.pathId] > 0`, decrement `pathCompletions[submission.pathId]`.

#### [Minor] `GuildPanel.jsx` Fallback Direct Mutation
- **What**: `GuildPanel.jsx:154` assigns to `gameState.highFivesSent = { ... }` when `onRecordHighFive` is not provided.
- **Where**: `src/components/GuildPanel.jsx:154`
- **Why**: Mutating props violates React immutability conventions.
- **Suggestion**: Use local component state or avoid reassigning `gameState` property directly.

---

## 5. Verification Method

To verify these findings:
1. **Verify Self-Certifying Test Behavior**:
   In `src/hooks/useGameState.js:554`, intentionally delete `xpEarned *= 2;` or change it to `xpEarned *= 999;`.
   Run:
   ```powershell
   & "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
   ```
   Observe that `tests/bugFixes.test.js` still reports 100% PASS because it does not import or test `useGameState.js`.
2. **Verify Boss Revocation Asymmetry**:
   Trace `useGameState.js`: line 558 (`processReward` for boss does not touch `totalActivitiesCompleted`) vs line 524 (`reconcileRevokedSubmission` unconditionally decrements `totalActivitiesCompleted`).
