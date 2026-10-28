# DISPATCH — 2026-10-28T14:38:00Z

## Mission Assignment: Explorer 1 for Milestone 2 Iteration 2 (`explorer_m2_it2_1`)
Role: `teamwork_explorer`
Target: Remediation Architecture for Forensic Audit Integrity Violation & Facade Test Elimination
Your Working Directory: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_1`

### Mandatory Inputs:
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read FIRST)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\auditor_m2\handoff.md` (Full Forensic Audit Evidence Report — MUST NOT OMIT)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m2_2\handoff.md` (Empirical State Desync Report)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m2\handoff.md`

### Testing Command:
`& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`

### Objectives:
1. Review the full Forensic Audit Evidence Report in `auditor_m2/handoff.md`. The auditor reported an **INTEGRITY VIOLATION** because `tests/testMilestone2.js` does NOT import from `src/`, defined local mock classes/functions, and tested those local definitions instead of genuine production code.
2. Formulate a concrete, step-by-step remediation plan to:
   - Extract pure domain & algorithmic functions into `src/utils/portalUtils.js` or `src/utils/gameUtils.js`:
     - `filterRosterByName(roster, query)`
     - `calculateBatchTotalXp(submissions, selectedIds)`
     - `resolveRevisionFeedback(feedbackText)`
     - `calculatePathProgressStats(path, completedActivities, approvedActivities)`
     - `filterLearningPathsByChip(learningPaths, selectedFilter)`
     - `filterAndSortRedemptions(redemptions, studentId, studentName)`
     - `formatLiveAnnouncement(type, payload)`
   - Import and use these in `LoginScreen.jsx`, `TeacherPortal.jsx`, and `App.jsx`.
   - Refactor `tests/testMilestone2.js` to **import and test these exact production utility functions directly from `src/utils/`**, completely eliminating all local mock definitions.
3. Write your report in `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_1\handoff.md`.
