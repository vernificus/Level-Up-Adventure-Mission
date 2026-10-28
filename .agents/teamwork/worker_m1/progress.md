# Progress — Milestone 1 (M1): Bug Remediation & Redundancy Removal

**Last visited**: 2026-10-28T13:05:00Z  
**Status**: COMPLETED

## Planned Steps
- [x] Step 1: Delete dead `src/services/mockBackend.js` and verify no references exist.
- [x] Step 2: Create `src/utils/textUtils.js` with `renderFormattedText`, `normalizeStep`, `normalizeSteps`. Integrate into `App.jsx`, `ActivityDirectionsCard.jsx`, `ActivityEditor.jsx`.
- [x] Step 3: Create `src/utils/gameUtils.js` with `resolveClassLearningPaths`, `getLevelForXp`, `calculateLevelAndBonusCoins`, `getMostRecentMonday7am`. Integrate into `useGameState.js`, `ActivityEditor.jsx`, `ChoiceBoardExport.jsx`, `Leaderboard.jsx`, `ClubArenaModal.jsx`, `realBackend.js`, `App.jsx`.
- [x] Step 4: Centralize `isAdminUser` in `src/utils/authUtils.js` & `src/context/AuthContext.jsx` and adopt across `App.jsx`, `TeacherPortal.jsx`, `ActivityEditor.jsx`, `realBackend.js`.
- [x] Step 5: Clean dead exports (`approveSubmission`, `rejectSubmission`, `clearReviewedSubmissions`, `validateTeacherPin` in `useGameState.js`, `joinClassAsStudent` in `AuthContext.jsx`).
- [x] Step 6: Fix Core Bugs:
  - [x] Bug 1 (`useGameState.js`): `setDataLoaded(true)` guard against state wipe on load failure.
  - [x] Bug 2 (`useGameState.js`): Boss Challenge level-up check & celebration.
  - [x] Bug 3 (`useGameState.js`): Consume & apply `doubleXpActive`.
  - [x] Bug 4 (`useGameState.js`): Consume `streakShieldActive`.
  - [x] Bug 5 (`GuildPanel.jsx` & `useGameState.js`): Remove direct prop mutation for `highFivesSent`.
  - [x] Bug 6 (`useGameState.js`): Submission revocation state sync downward.
  - [x] Bug 7 (`realBackend.js`): Path Masters guild challenge distinct paths calculation.
  - [x] Bug 8 (`DocumentImporterModal.jsx`): `.docx` binary upload guard & paste guidance.
  - [x] Bug 9 (`RosterManager.jsx`): Bulk student upload single-column handling.
  - [x] Shared Feedback Input Collision (`TeacherPortal.jsx`): Per-submission ID feedback state.
- [x] Step 7: Verify all modified files with Node syntax checks and write verification test suite.
- [x] Step 8: Complete handoff report `handoff.md` and notify parent.
