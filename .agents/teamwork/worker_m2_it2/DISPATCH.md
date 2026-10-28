# DISPATCH — 2026-10-28T14:48:00Z

## Mission Assignment: Milestone 2 Remediation Worker (worker_m2_it2)
Role: `teamwork_worker`
Target Scope: Milestone 2 Iteration 2 (Remediation of Forensic Audit Integrity Violation & Challenger Edge Cases)
Your Working Directory: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m2_it2`

### Mandatory Inputs:
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read FIRST)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\auditor_m2\handoff.md` (FULL AUDIT REPORT — ZERO TOLERANCE)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m2_2\handoff.md` (Empirical State Desync Report)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_1\handoff.md` (Remediation Architecture)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_2\handoff.md` (TeacherPortal State Remediation)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_3\handoff.md` (Date Parsing & A11y Remediation)

### Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Your Objectives:
1. **Create `src/utils/portalUtils.js`**:
   Implement all pure utility functions designed by Explorer 1 (`explorer_m2_it2_1/handoff.md`), Explorer 2 (`explorer_m2_it2_2/handoff.md`), and Explorer 3 (`explorer_m2_it2_3/handoff.md`):
   - `filterRosterByName(roster, query)`
   - `getVisibilityInputType(isVisible)` & `getVisibilityToggleLabel(isVisible, isPin)`
   - `calculateBatchTotalXp(submissions, selectedIds)`
   - `getVisibleSelectedSubmissions(submissions, selectedIds)`
   - `isAllPendingSelected(pending, selectedIds)`
   - `computeBatchSelectionState(pending, selectedIds)`
   - `toggleSelectAllPending(pending, currentSelectedIds)`
   - `pruneSelectedSubmissionIds(submissions, currentSelectedIds)`
   - `resolveRevisionFeedback(feedbackText)` with `DEFAULT_REVISION_FEEDBACK` & `QUICK_REVISION_CHIPS`
   - `calculatePathProgressStats(path, completedActivities, approvedActivities)`
   - `filterLearningPathsByChip(learningPaths, selectedFilter)`
   - `toggleLearningPathFilter(currentFilter, tappedId)`
   - `parseRedemptionTimeMs(val)`: robust timestamp parser checking `Number.isFinite()`, never returning `NaN`
   - `filterAndSortRedemptions(redemptions, studentId, studentName)`: guaranteed descending chronological order
   - `formatRedemptionDate(val)`: checks finite positive milliseconds, never renders `"Invalid Date"`, defaulting to `'Recently'`
   - `getRedemptionStatusBadge(status)`
   - `formatLiveAnnouncement(type, payload)`

2. **Re-export in `src/utils/gameUtils.js`**:
   Add `export * from './portalUtils.js';` to `src/utils/gameUtils.js`.

3. **Integrate into Production Components**:
   - In `src/components/LoginScreen.jsx`: Import and use `filterRosterByName`, `getVisibilityInputType`, `getVisibilityToggleLabel`.
   - In `src/components/TeacherPortal.jsx`:
     - Import and use `calculateBatchTotalXp`, `getVisibleSelectedSubmissions`, `isAllPendingSelected`, `computeBatchSelectionState`, `toggleSelectAllPending`, `pruneSelectedSubmissionIds`, `resolveRevisionFeedback`, `DEFAULT_REVISION_FEEDBACK`, `QUICK_REVISION_CHIPS`.
     - Reset `selectedSubmissionIds` on `selectedStudentFilterId` or `selectedClass?.id` change via `useEffect`.
     - Prune reviewed submission IDs from `selectedSubmissionIds` in `handleReview`.
     - Maintain ARIA live region containers (`batchNotice`, `rosterToast`) continuously in the DOM.
   - In `src/App.jsx`:
     - Import and use `calculatePathProgressStats`, `filterLearningPathsByChip`, `toggleLearningPathFilter`, `filterAndSortRedemptions`, `formatRedemptionDate`, `getRedemptionStatusBadge`, `formatLiveAnnouncement`.
     - Add `isInitialMountRef.current` guard in the XP announcement `useEffect` to prevent false positive XP announcements on initial profile load.

4. **Completely Refactor `tests/testMilestone2.js`**:
   - **IMPORT ALL FUNCTIONS DIRECTLY FROM `../src/utils/portalUtils.js`**.
   - **DELETE ALL 6 LOCAL MOCK CLASSES AND FUNCTIONS** (`filterStudents`, `VisibilityToggleState`, `BatchApprovalSession`, `buildRejectionPayload`, `getPathStats`, `filterPaths`, `toggleFilter`, `filterAndSortStudentRedemptions`, `getStatusBadge`, `LiveAnnouncementTracker`).
   - Ensure all 8 test suites directly test genuine production code.

5. **Run the Full Test Suite**:
   Execute `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`.
   Verify all M1 and M2 test suites pass with exit code 0.

6. **Write Completion Report**:
   Write `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m2_it2\handoff.md` and send completion message to orchestrator.
