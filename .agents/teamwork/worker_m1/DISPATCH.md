# Task Assignment: Milestone 1 - Bug Remediation & Redundancy Removal (R1)

## Working Directory
c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1

## Mandatory References
1. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read first)
2. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
3. Explorer Reports:
   - `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_survey_2_gen2\handoff.md` (Detailed bug root causes & fixes)
   - `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_survey_1\handoff.md` (Architecture & tooling)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Objectives for M1

### Part 1: Dead Code Elimination & Redundancy Cleanup
1. **Delete Dead Mock Backend**: Delete `src/services/mockBackend.js` (1,104 lines of unused mock code). Verify with grep that no module imports it.
2. **Consolidate Text Utilities (`src/utils/textUtils.js`)**:
   - Extract and export `renderFormattedText(text)` (supporting `**bold**` and `*italic*`).
   - Extract and export `normalizeStep(step)` and `normalizeSteps(steps)`.
   - Update `src/App.jsx`, `src/components/ActivityDirectionsCard.jsx`, and `src/components/ActivityEditor.jsx` to import from `src/utils/textUtils.js`.
3. **Consolidate Game Utilities (`src/utils/gameUtils.js`)**:
   - Extract and export `resolveClassLearningPaths(classDoc, defaultPaths)`.
   - Extract and export canonical `getLevelForXp(xp)` helper (using levels data from `gameData.js`).
   - Extract and export `getMostRecentMonday7am(now)`.
   - Update `src/hooks/useGameState.js`, `src/components/ActivityEditor.jsx`, `src/components/ChoiceBoardExport.jsx`, `src/components/Leaderboard.jsx`, `src/components/ClubArenaModal.jsx`, and `src/services/realBackend.js` to import and use `src/utils/gameUtils.js`.
4. **Centralize Elevated Admin Check**:
   - Export `isAdminUser(user)` in `src/context/AuthContext.jsx` checking `role === 'admin' || role === 'super_admin' || role === 'super admin' || email === 'matthew.harbert@lcps.org' || email === 'propellevelup@lcps.org'`.
   - Use `isAdminUser` consistently in `App.jsx`, `TeacherPortal.jsx`, `ActivityEditor.jsx`, and `realBackend.js`.
5. **Clean Dead Exports**:
   - In `src/hooks/useGameState.js`: Remove unused dummy exports `approveSubmission`, `rejectSubmission`, `clearReviewedSubmissions`, `validateTeacherPin`.
   - In `src/context/AuthContext.jsx`: Remove dead `joinClassAsStudent` method.

### Part 2: Core State & Logic Bug Remediation
6. **Bug 1 (`src/hooks/useGameState.js:307–319`)**: Guard `setDataLoaded(true)`.
   - In `loadUserData()`, do NOT set `setDataLoaded(true)` in `finally` when error occurs. Only set `setDataLoaded(true)` on successful load of valid student data. In `catch`, keep `setDataLoaded(false)` to prevent `useEffect` from wiping Firestore state with 0 XP.
7. **Bug 2 (`src/hooks/useGameState.js:608–618`)**: Boss Challenge completion level-up.
   - Insert `checkLevelUp(prev, updatedState);` into the `submission.isBoss` block before returning `updatedState`, ensuring Boss completions trigger level-up celebrations and bonus coins.
8. **Bug 3 (`src/hooks/useGameState.js:606–632`)**: Wire up and consume `doubleXpActive`.
   - In `processReward()`, check `if (prev.doubleXpActive) { xpEarned *= 2; }` and reset `doubleXpActive: false` on `updatedState`.
9. **Bug 4 (`src/hooks/useGameState.js:625–627, 636–651`)**: Consume `streakShieldActive`.
   - When `diff > 8 && prev.streakShieldActive`, shield streak from resetting and set `streakShieldActive: false` in `updatedState`.
10. **Bug 5 (`src/components/GuildPanel.jsx:150–153`)**: Remove direct React prop mutation.
    - Provide a safe state update callback from `useGameState` or clone state immutably rather than mutating `gameState.highFivesSent` in-place.
11. **Bug 6 (`src/hooks/useGameState.js:565–575`)**: Submission revocation synchronization.
    - When a server submission transitions from `approved` to `rejected`/pending, reconcile `gameState.xp` and completed activities downward so student local state matches Firestore truth.
12. **Bug 7 (`src/services/realBackend.js:1460–1463`)**: Path Masters guild challenge calculation.
    - Evaluate distinct learning paths rather than total raw activity count to ensure students complete activities across different paths.
13. **Bug 8 (`src/components/DocumentImporterModal.jsx:25–31, 126`)**: Document Importer `.docx` binary guard.
    - Scope file upload accepts to `.txt` and `.md`. If user selects a `.docx` file or file name ends with `.docx`, show clear user guidance instructing them to copy-paste the text directly into the Paste Text tab.
14. **Bug 9 (`src/components/RosterManager.jsx:340–352`)**: Bulk student upload single-column handling.
    - When a pasted line lacks a comma, default the PIN/password to `1234` or the class join code rather than silently dropping the student name.
15. **Shared Feedback Input Collision (`src/components/TeacherPortal.jsx:5491`)**:
    - Manage feedback state per submission ID (e.g., `feedbackMap[sub.id]`) rather than a single shared `newFeedback` string across all rows.

## Verification
- Run tests and builds to ensure no syntax errors, broken imports, or missing exports exist.
- Write your complete handoff report to `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1\handoff.md`.

## 2026-10-28T12:26:39Z
You are teamwork_worker for Milestone 1 (M1): Bug Remediation & Redundancy Removal.
Your working directory is: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1
Read your task assignment: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1\DISPATCH.md
MANDATORY: Read c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Read c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md for architecture, contracts, and code layout.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the objectives in DISPATCH.md:
1. Delete dead mockBackend.js.
2. Create and integrate src/utils/textUtils.js.
3. Create and integrate src/utils/gameUtils.js.
4. Centralize isAdminUser in AuthContext.jsx.
5. Clean dead exports.
6. Fix all 9 core bugs (useGameState dataLoaded guard, boss level-up, doubleXpActive/streakShield consumption, guild prop mutation, revocation desync, Path Masters calculation, document importer docx guard, bulk roster single-column handling, feedback input state collision).
7. Verify build and code integrity.

Write your structured handoff report to c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1\handoff.md.
Update progress.md in your working directory periodically as a heartbeat.
When finished, notify me using send_message.
