# Forensic Audit Remediation Architecture & Utility Extraction Plan — Milestone 2 (`explorer_m2_it2_1`)

**Target**: Remediation Architecture for Forensic Audit Integrity Violation & Facade Test Elimination  
**Agent**: Explorer 1 (`explorer_m2_it2_1`)  
**Parent Orchestrator ID**: `49b3edc4-4ec6-479d-b3cd-de1c5cd042bb`  
**Working Directory**: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_1`  

---

## 1. Observation

### 1.1 Verification of Forensic Audit Findings (`auditor_m2/handoff.md`)
Direct inspection of `tests/testMilestone2.js` confirms verbatim the auditor's findings:
1. **Zero Production Imports** (`tests/testMilestone2.js:1-4`):
   ```javascript
   import assert from 'assert';
   import fs from 'fs';
   import path from 'path';
   ```
   No exports from `src/components/`, `src/utils/`, `src/hooks/`, or `src/App.jsx` are imported or exercised.
2. **Self-Declared Mock Classes and Functions Tested Against Themselves**:
   - **Suite 1** (lines 22-26): `filterStudents(students, query)` declared locally; `LoginScreen.jsx` never invoked.
   - **Suite 2** (lines 58-77): `class VisibilityToggleState { ... }` declared locally; non-existent in `src/`.
   - **Suite 3** (lines 119-151): `class BatchApprovalSession { ... }` declared locally; non-existent in `src/`.
   - **Suite 4** (lines 192-202): `const buildRejectionPayload = ...` declared locally; non-existent in `src/`.
   - **Suite 6** (lines 268-281, 308-310): `getPathStats`, `filterPaths`, `toggleFilter` declared locally; non-existent in `src/`.
   - **Suite 7** (lines 355-372): `filterAndSortStudentRedemptions`, `getStatusBadge` declared locally; non-existent in `src/`.
   - **Suite 8** (lines 412-432): `class LiveAnnouncementTracker { ... }` declared locally; non-existent in `src/`.
3. **Logic Contradiction in Suite 4 vs Production**:
   - `tests/testMilestone2.js` lines 194-196, 205:
     ```javascript
     if (!trimmed) throw new Error('Please provide guidance so the student knows what to revise.');
     assert.throws(() => buildRejectionPayload({ id: 'sub-1' }, ''), /guidance/);
     ```
   - In actual production code (`src/components/TeacherPortal.jsx:5565`):
     ```javascript
     const finalNote = revisionFeedback.trim() || 'Needs revision: Please review activity steps and resubmit.';
     await onReview(submission.id, 'rejected', finalNote);
     ```
     The production code never throws on empty/whitespace input; it supplies a resilient default feedback string. The test mock asserted throwing behavior, verifying a specification divergence.

### 1.2 Verification of Empirical Adversarial Findings (`challenger_m2_2/handoff.md`)
Inspection of production code identified 3 critical empirical edge-case defects:
1. **Ghost Batch Selections on Filter Switch** (`src/components/TeacherPortal.jsx:79, 583-598, 2127-2173`):
   - `selectedSubmissionIds` is a standalone `useState(new Set())`.
   - When teacher switches `selectedStudentFilterId` (e.g., from 'all' to student 'Alice'), selections belonging to other students remain in the set.
   - Toolbar and button show `{selectedSubmissionIds.size} selected` across all students, but clicking "Approve Selected" filters visible pending submissions (`pending.filter(s => selectedSubmissionIds.has(s.id))`), yielding 0 submissions.
   - Line 601 runs `if (!submissionsToApprove || submissionsToApprove.length === 0) return;` which produces a silent no-op click failure.
   - Line 2133: `checked={selectedSubmissionIds.size > 0 && selectedSubmissionIds.size >= pending.length}` shows the "Select All" checkbox as checked when a teacher switches to a student with fewer submissions than total ghost selections.
2. **Corrupted Date Parsing & V8 Timsort NaN Failure in Redeemed Rewards** (`src/App.jsx:1401-1405, 1678-1682`):
   - Comparator in `App.jsx` lines 1401-1405:
     ```javascript
     myRedemptions.sort((a, b) => {
       const timeA = a.redeemedAt?.seconds ? a.redeemedAt.seconds * 1000 : (a.redeemedAt ? new Date(a.redeemedAt).getTime() : 0);
       const timeB = b.redeemedAt?.seconds ? b.redeemedAt.seconds * 1000 : (b.redeemedAt ? new Date(b.redeemedAt).getTime() : 0);
       return timeB - timeA;
     });
     ```
   - When `redeemedAt` contains an invalid date string (e.g. `'not-a-valid-date'`), empty object `{}`, or serialized `{ _seconds: ... }`, `new Date(a.redeemedAt).getTime()` evaluates to `NaN`.
   - Returning `NaN` in `sort()` breaks V8 Timsort comparator invariants, returning an out-of-order array.
   - Line 1681 renders literal `"Invalid Date"` in the student's UI.
3. **Screen Reader Initial-Mount Race Condition** (`src/App.jsx:2143-2154`):
   - `prevXpRef.current` initializes to `gameState.xp` (`0`). When Firestore asynchronously loads the student profile with initial XP (e.g. 1200 XP), `diff > 0` fires a false announcement (`"Earned 1200 XP! Total XP: 1200"`) on initial load.

---

## 2. Logic Chain

1. **Mandate Requirement**: The project requires automated tests to genuinely test production codebase logic (`src/`) without facade mocks or self-certifying stubs.
2. **Observation 1.1 establishes**: `tests/testMilestone2.js` does not import from `src/` and tests local mock objects, constituting an Integrity Violation.
3. **Observation 1.2 establishes**: Domain and algorithmic functions (filtering, sorting, XP calculation, feedback fallback, live announcement formatting) were implemented inline in React components without unit-testable extraction, leading directly to the bugs observed by Challenger M2-2.
4. **Remediation Rationale**: By extracting these pure algorithmic and domain functions into a dedicated production utility module (`src/utils/portalUtils.js`) and re-exporting in `src/utils/gameUtils.js`:
   - Production React components (`LoginScreen.jsx`, `TeacherPortal.jsx`, `App.jsx`) become leaner, cleaner, and free of duplicated algorithmic logic.
   - `tests/testMilestone2.js` can import these exact functions directly from `src/utils/portalUtils.js`, fully eliminating all local mock classes and functions.
   - Bug fixes for V8 Timsort date resilience, selection synchronization, and live announcement guardrails can be embedded directly within these pure utility functions and verified with 100% genuine automated unit tests.

---

## 3. Caveats

- **Scope Boundary**: This report focuses strictly on designing the pure utility module `src/utils/portalUtils.js`, the exact component integration diffs, and the complete rewrite plan for `tests/testMilestone2.js`. Code modifications should be executed by the designated implementation worker (`worker_m2`).
- **Build / Packaging Environment**: `node_modules` in this environment contains `react` and `firebase`, while `vite` is not installed globally in `node_modules/.bin`. The project test runner is `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`. All ESM imports must use explicit `.js` extensions.

---

## 4. Conclusion & Concrete Remediation Plan

### Architecture Plan Overview
1. **Create `src/utils/portalUtils.js`** containing all 7 target domain functions and supporting helpers.
2. **Re-export in `src/utils/gameUtils.js`** (`export * from './portalUtils.js';`) to maintain architectural cohesion.
3. **Refactor Production Components**:
   - `src/components/LoginScreen.jsx`: Import `filterRosterByName`, `getVisibilityInputType`, `getVisibilityToggleLabel`.
   - `src/components/TeacherPortal.jsx`: Import `calculateBatchTotalXp`, `getVisibleSelectedSubmissions`, `isAllPendingSelected`, `resolveRevisionFeedback`, `DEFAULT_REVISION_FEEDBACK`, `QUICK_REVISION_CHIPS`.
   - `src/App.jsx`: Import `calculatePathProgressStats`, `filterLearningPathsByChip`, `toggleLearningPathFilter`, `filterAndSortRedemptions`, `formatRedemptionDate`, `getRedemptionStatusBadge`, `formatLiveAnnouncement`.
4. **Refactor `tests/testMilestone2.js`**: Completely replace all local mocks with direct imports from `../src/utils/portalUtils.js`.

---

### Step 1: Specification for `src/utils/portalUtils.js`

Write new file `c:\Projects\Level-Up-Adventure-Mission\src\utils\portalUtils.js` with the following implementation:

```javascript
/**
 * portalUtils.js — Consolidated domain utilities for Milestone 2 Usability Enhancements
 */

// ── FE-1: Roster Search Filtering ──
export function filterRosterByName(roster, query) {
  if (!Array.isArray(roster)) return [];
  const q = (query || '').toLowerCase().trim();
  if (!q) return roster;
  return roster.filter(student => {
    const name = typeof student?.name === 'string' ? student.name : String(student?.name || '');
    return name.toLowerCase().includes(q);
  });
}

// ── FE-2: Password & PIN Visibility Accessibility Helpers ──
export function getVisibilityInputType(isVisible) {
  return isVisible ? 'text' : 'password';
}

export function getVisibilityToggleLabel(isVisible, isPin = false) {
  const term = isPin ? 'PIN' : 'password';
  return isVisible ? `Hide ${term}` : `Show ${term}`;
}

// ── FE-3: Batch Review & Quick Approval Calculations ──
export function calculateBatchTotalXp(submissions, selectedIds) {
  if (!Array.isArray(submissions)) return 0;
  let target = submissions;
  if (selectedIds) {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    target = submissions.filter(s => idSet.has(s?.id));
  }
  return target.reduce((sum, s) => {
    const xpVal = s?.xp !== undefined ? Number(s.xp) : (s?.xpReward !== undefined ? Number(s.xpReward) : (s?.isBoss ? 300 : 50));
    return sum + (Number.isFinite(xpVal) ? xpVal : 0);
  }, 0);
}

export function getVisibleSelectedSubmissions(submissions, selectedIds) {
  if (!Array.isArray(submissions)) return [];
  if (!selectedIds) return [];
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  return submissions.filter(s => idSet.has(s?.id));
}

export function isAllPendingSelected(pending, selectedIds) {
  if (!Array.isArray(pending) || pending.length === 0) return false;
  if (!selectedIds || (selectedIds instanceof Set ? selectedIds.size === 0 : selectedIds.length === 0)) return false;
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  return pending.every(s => idSet.has(s?.id));
}

// ── FE-4: Revision Guidance Guardrail & Feedback Suggestions ──
export const DEFAULT_REVISION_FEEDBACK = 'Needs revision: Please review activity steps and resubmit.';

export const QUICK_REVISION_CHIPS = [
  "Add more detail to your explanation",
  "Check link permissions (must be public or shared)",
  "Include a clear photo or screenshot",
  "Review activity steps and verify all parts are completed",
  "Explain your code or thought process in your note"
];

export function resolveRevisionFeedback(feedbackText) {
  const trimmed = typeof feedbackText === 'string'
    ? feedbackText.trim()
    : (feedbackText ? String(feedbackText).trim() : '');
  return trimmed || DEFAULT_REVISION_FEEDBACK;
}

// ── FE-5: Responsive Navigation Tab Styling Tokens ──
export const HORIZONTAL_SCROLL_CONTAINER_CLASSES = 'overflow-x-auto flex-nowrap scrollbar-none';
export const TAB_BUTTON_CLASSES = 'whitespace-nowrap flex-shrink-0';

// ── FE-6: Mobile Choice Board Category Filter Chips ──
export function calculatePathProgressStats(path, completedActivities = [], approvedActivities = []) {
  const options = Array.isArray(path?.options) ? path.options : [];
  const total = options.length;
  const completedSet = new Set([...(completedActivities || []), ...(approvedActivities || [])]);
  const count = options.filter(opt => completedSet.has(opt?.id)).length;
  return {
    count,
    total,
    isComplete: total > 0 && count === total
  };
}

export function filterLearningPathsByChip(learningPaths, selectedFilter) {
  if (!Array.isArray(learningPaths)) return [];
  if (!selectedFilter || selectedFilter === 'all' || !learningPaths.some(p => p?.id === selectedFilter)) {
    return learningPaths;
  }
  return learningPaths.filter(p => p?.id === selectedFilter);
}

export function toggleLearningPathFilter(currentFilter, tappedId) {
  return currentFilter === tappedId ? 'all' : tappedId;
}

// ── FE-7: Student Redeemed Rewards Log & Resilient Date Parsing ──
export function parseRedemptionTimeMs(val) {
  if (!val) return 0;
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  if (typeof val._seconds === 'number') return val._seconds * 1000;
  if (typeof val.toDate === 'function') {
    const ms = val.toDate().getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function formatRedemptionDate(val) {
  if (!val) return 'Recently';
  if (typeof val.seconds === 'number') {
    const d = new Date(val.seconds * 1000);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : 'Recently';
  }
  if (typeof val._seconds === 'number') {
    const d = new Date(val._seconds * 1000);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : 'Recently';
  }
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : 'Recently';
  }
  const d = new Date(val);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : 'Recently';
}

export function getRedemptionStatusBadge(status) {
  if (status === 'fulfilled') {
    return { label: '✓ Fulfilled', className: 'bg-green-500/20 text-green-400 border border-green-500/40' };
  }
  if (status === 'cancelled') {
    return { label: '✕ Cancelled', className: 'bg-red-500/20 text-red-400 border border-red-500/40' };
  }
  return { label: '⏳ Waiting for Teacher', className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' };
}

export function filterAndSortRedemptions(redemptions, studentId, studentName) {
  if (!Array.isArray(redemptions)) return [];
  const filtered = redemptions.filter(r =>
    (studentId && r?.studentId === studentId) ||
    (studentName && r?.studentName === studentName)
  );
  return filtered.sort((a, b) => {
    const timeA = parseRedemptionTimeMs(a?.redeemedAt);
    const timeB = parseRedemptionTimeMs(b?.redeemedAt);
    return timeB - timeA;
  });
}

// ── FE-10: Accessible Live Region Announcements ──
export function formatLiveAnnouncement(type, payload) {
  if (!type || !payload) return '';
  switch (type) {
    case 'xp_gain': {
      const diff = Number(payload.diff) || 0;
      const totalXp = Number(payload.totalXp) || 0;
      if (diff <= 0) return '';
      return `Earned ${diff} XP! Total XP: ${totalXp}`;
    }
    case 'level_up': {
      const level = payload.level ?? payload.newLevel?.level ?? '';
      const title = payload.title || payload.newLevel?.title || '';
      return `Level Up! You reached Level ${level}: ${title}!`;
    }
    case 'achievement': {
      const title = payload.title || payload.name || 'New Badge';
      return `Achievement Unlocked: ${title}!`;
    }
    default:
      return '';
  }
}
```

---

### Step 2: Component Integration Modifications

#### 2.1 `src/components/LoginScreen.jsx`
- **Imports**:
  Add at top:
  ```javascript
  import { filterRosterByName, getVisibilityInputType, getVisibilityToggleLabel } from '../utils/portalUtils';
  ```
- **Roster Search** (lines 426-428):
  Replace inline filter:
  ```javascript
  // Before:
  const filteredRoster = roster.filter(student =>
    (student.name || '').toLowerCase().includes(rosterSearch.toLowerCase().trim())
  );
  // After:
  const filteredRoster = filterRosterByName(roster, rosterSearch);
  ```
- **Password / PIN Toggles** (lines 280, 286, 370, 375, 520, 524, 580, 584, 605, 609):
  Use `getVisibilityInputType(showTeacherPassword)` and `getVisibilityToggleLabel(showTeacherPassword, false)` (and `true` for student PIN).

#### 2.2 `src/components/TeacherPortal.jsx`
- **Imports**:
  Add at top:
  ```javascript
  import {
    calculateBatchTotalXp,
    getVisibleSelectedSubmissions,
    isAllPendingSelected,
    resolveRevisionFeedback,
    DEFAULT_REVISION_FEEDBACK,
    QUICK_REVISION_CHIPS
  } from '../utils/portalUtils';
  ```
- **Batch Selection State Synchronization** (lines 2133, 2143-2145, 2154, 2160, 2219):
  - Reset `selectedSubmissionIds` when filter changes:
    ```javascript
    useEffect(() => {
      setSelectedSubmissionIds(new Set());
    }, [selectedStudentFilterId, selectedClass?.id]);
    ```
  - Visible selection count:
    ```javascript
    const visibleSelectedCount = getVisibleSelectedSubmissions(pending, selectedSubmissionIds).length;
    ```
  - Checkbox checked condition (line 2133):
    ```javascript
    checked={isAllPendingSelected(pending, selectedSubmissionIds)}
    ```
  - Toolbar text and button disabled state:
    ```javascript
    {visibleSelectedCount > 0 && (
      <span className="text-xs bg-green-950/60 text-green-300 border border-green-700/50 font-bold px-2 py-0.5 rounded-full">
        {visibleSelectedCount} selected
      </span>
    )}
    ```
    ```javascript
    disabled={visibleSelectedCount === 0 || batchProcessing}
    ```
    ```javascript
    <span>Approve Selected ({visibleSelectedCount})</span>
    ```
  - Cumulative XP summation in modal (line 2219):
    ```javascript
    +{calculateBatchTotalXp(pending)} XP
    ```
- **Revision Guidance Modal** (lines 5551-5568):
  - In `SubmissionCard`, use imported `QUICK_REVISION_CHIPS`.
  - In `handleConfirmRevision`:
    ```javascript
    const finalNote = resolveRevisionFeedback(revisionFeedback);
    await onReview(submission.id, 'rejected', finalNote);
    setShowRevisionModal(false);
    ```

#### 2.3 `src/App.jsx`
- **Imports**:
  Add at top:
  ```javascript
  import {
    calculatePathProgressStats,
    filterLearningPathsByChip,
    toggleLearningPathFilter,
    filterAndSortRedemptions,
    formatRedemptionDate,
    getRedemptionStatusBadge,
    formatLiveAnnouncement
  } from './utils/portalUtils';
  ```
- **Redeemed History Loading & Sorting** (lines 1397-1406):
  ```javascript
  const all = await backend.getRedemptions(classId);
  const myRedemptions = filterAndSortRedemptions(all, userId, gameState?.playerName);
  setRedeemedHistory(myRedemptions);
  ```
- **Redeemed History Rendering** (lines 1678-1703):
  ```javascript
  const dateStr = formatRedemptionDate(item.redeemedAt);
  const badge = getRedemptionStatusBadge(item.status);
  ```
- **Screen Reader Announcements & Initial Load Guard** (lines 2143-2166):
  ```javascript
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevXpRef.current = gameState.xp;
      return;
    }
    if (gameState.xp !== undefined && prevXpRef.current !== undefined) {
      const diff = gameState.xp - prevXpRef.current;
      if (diff > 0) {
        setLiveAnnouncement(formatLiveAnnouncement('xp_gain', { diff, totalXp: gameState.xp }));
      }
    }
    prevXpRef.current = gameState.xp;
  }, [gameState.xp]);

  useEffect(() => {
    if (showLevelUp && newLevel) {
      setLiveAnnouncement(formatLiveAnnouncement('level_up', newLevel));
    }
  }, [showLevelUp, newLevel]);

  useEffect(() => {
    if (showAchievement) {
      setLiveAnnouncement(formatLiveAnnouncement('achievement', showAchievement));
    }
  }, [showAchievement]);
  ```
- **Mobile Category Filter Chips & Progress Counts** (lines 2393-2438):
  - Overall progress count:
    ```javascript
    {learningPaths.reduce((acc, p) => acc + calculatePathProgressStats(p, gameState.completedActivities, approvedActivities).count, 0)}/
    {learningPaths.reduce((acc, p) => acc + (p.options || []).length, 0)}
    ```
  - Category chip progress count:
    ```javascript
    const { count: completedCount, total: totalCount, isComplete } = calculatePathProgressStats(
      path,
      gameState.completedActivities,
      approvedActivities
    );
    ```
  - Category chip toggle on click:
    ```javascript
    onClick={() => setMobileCategoryFilter(toggleLearningPathFilter(mobileCategoryFilter, path.id))}
    ```
  - Choice board filtering (lines 2436-2438):
    ```javascript
    const displayedPaths = filterLearningPathsByChip(learningPaths, mobileCategoryFilter);
    ```

---

### Step 3: Complete Refactor Specification for `tests/testMilestone2.js`

Rewrite `tests/testMilestone2.js` to **import directly from `../src/utils/portalUtils.js`** and completely remove all 6 self-declared mock classes/functions:

```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  filterRosterByName,
  getVisibilityInputType,
  getVisibilityToggleLabel,
  calculateBatchTotalXp,
  getVisibleSelectedSubmissions,
  isAllPendingSelected,
  resolveRevisionFeedback,
  DEFAULT_REVISION_FEEDBACK,
  QUICK_REVISION_CHIPS,
  calculatePathProgressStats,
  filterLearningPathsByChip,
  toggleLearningPathFilter,
  filterAndSortRedemptions,
  parseRedemptionTimeMs,
  formatRedemptionDate,
  getRedemptionStatusBadge,
  formatLiveAnnouncement,
  HORIZONTAL_SCROLL_CONTAINER_CLASSES,
  TAB_BUTTON_CLASSES
} from '../src/utils/portalUtils.js';

console.log('==========================================');
console.log('Running Milestone 2 (M2) Comprehensive Suite');
console.log('==========================================\n');

// ----------------------------------------------------
// Suite 1: FE-1 Real-Time Student Roster Search
// ----------------------------------------------------
console.log('Suite 1: FE-1 Student Roster Search Filtering');
{
  const mockStudents = [
    { id: 's1', name: 'Alex Johnson', pin: '1234' },
    { id: 's2', name: 'Beatrix Potter', pin: '2345' },
    { id: 's3', name: 'Charlie Alexander', pin: '3456' },
    { id: 's4', name: 'Dana Scully', pin: '4567' },
    { id: 's5', name: 'Zane Grey', pin: '5678' },
  ];

  // Test 1: Empty or whitespace query returns all
  assert.strictEqual(filterRosterByName(mockStudents, '').length, 5);
  assert.strictEqual(filterRosterByName(mockStudents, '   ').length, 5);
  assert.strictEqual(filterRosterByName(mockStudents, null).length, 5);

  // Test 2: Case-insensitive prefix/substring match
  const alexMatch = filterRosterByName(mockStudents, 'alex');
  assert.strictEqual(alexMatch.length, 2);
  assert.deepStrictEqual(alexMatch.map(s => s.id), ['s1', 's3']);

  const upperMatch = filterRosterByName(mockStudents, 'SCULLY');
  assert.strictEqual(upperMatch.length, 1);
  assert.strictEqual(upperMatch[0].name, 'Dana Scully');

  // Test 3: Trimming surrounding whitespace
  const trimmedMatch = filterRosterByName(mockStudents, '  potter  ');
  assert.strictEqual(trimmedMatch.length, 1);
  assert.strictEqual(trimmedMatch[0].id, 's2');

  // Test 4: No matches returns empty array for empty-state UI
  const noMatch = filterRosterByName(mockStudents, 'Nonexistent Student');
  assert.strictEqual(noMatch.length, 0);

  // Test 5: Graceful handling of empty or non-array inputs
  assert.deepStrictEqual(filterRosterByName([], 'alex'), []);
  assert.deepStrictEqual(filterRosterByName(null, 'alex'), []);

  console.log('  ✔ FE-1: Roster search handles substrings, case-insensitivity, whitespace, and empty states');
}

// ----------------------------------------------------
// Suite 2: FE-2 Password & PIN Visibility Toggling
// ----------------------------------------------------
console.log('Suite 2: FE-2 Password & PIN Visibility Toggle Logic');
{
  // Test 1: Defaults to hidden (password type and Show label)
  assert.strictEqual(getVisibilityInputType(false), 'password');
  assert.strictEqual(getVisibilityToggleLabel(false, false), 'Show password');
  assert.strictEqual(getVisibilityToggleLabel(false, true), 'Show PIN');

  // Test 2: Visible state (text type and Hide label)
  assert.strictEqual(getVisibilityInputType(true), 'text');
  assert.strictEqual(getVisibilityToggleLabel(true, false), 'Hide password');
  assert.strictEqual(getVisibilityToggleLabel(true, true), 'Hide PIN');

  // Test 3: Verify toggle cycle
  let isVisible = false;
  isVisible = !isVisible;
  assert.strictEqual(getVisibilityInputType(isVisible), 'text');
  isVisible = !isVisible;
  assert.strictEqual(getVisibilityInputType(isVisible), 'password');

  console.log('  ✔ FE-2: Password/PIN visibility toggle maintains independent states and accessible labels');
}

// ----------------------------------------------------
// Suite 3: FE-3 Batch Review & Quick Approval for Teachers
// ----------------------------------------------------
console.log('Suite 3: FE-3 Teacher Batch Review & Quick Approval');
{
  const pendingSubmissions = [
    { id: 'sub-1', studentName: 'Alice', xp: 50, status: 'pending' },
    { id: 'sub-2', studentName: 'Bob', xp: 100, status: 'pending' },
    { id: 'sub-3', studentName: 'Charlie', status: 'pending' }, // defaults to 50
    { id: 'sub-4', studentName: 'Dana', xpReward: 75, status: 'pending' },
  ];

  // Test 1: Empty selection calculates 0 XP
  assert.strictEqual(calculateBatchTotalXp(pendingSubmissions, new Set()), 0);

  // Test 2: Select individual submissions
  const partialSelection = new Set(['sub-1', 'sub-2']);
  assert.strictEqual(calculateBatchTotalXp(pendingSubmissions, partialSelection), 150); // 50 + 100

  // Test 3: Select all submissions (handles s.xp, s.xpReward, and default)
  assert.strictEqual(calculateBatchTotalXp(pendingSubmissions), 275); // 50 + 100 + 50 + 75
  const allIds = new Set(pendingSubmissions.map(s => s.id));
  assert.strictEqual(calculateBatchTotalXp(pendingSubmissions, allIds), 275);

  // Test 4: Visible selection filtering and Select All helper
  assert.strictEqual(getVisibleSelectedSubmissions(pendingSubmissions, partialSelection).length, 2);
  assert.strictEqual(isAllPendingSelected(pendingSubmissions, partialSelection), false);
  assert.strictEqual(isAllPendingSelected(pendingSubmissions, allIds), true);

  console.log('  ✔ FE-3: Batch selection, cumulative XP calculation, and bulk approval verify cleanly');
}

// ----------------------------------------------------
// Suite 4: FE-4 Revision Guidance Guardrail on Rejection
// ----------------------------------------------------
console.log('Suite 4: FE-4 Revision Guidance Guardrail & Feedback Suggestions');
{
  // Test 1: Empty or whitespace feedback defaults to actionable constructive guidance
  assert.strictEqual(resolveRevisionFeedback(''), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback('   \n  '), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback(null), DEFAULT_REVISION_FEEDBACK);
  assert.strictEqual(resolveRevisionFeedback(undefined), DEFAULT_REVISION_FEEDBACK);

  // Test 2: Quick suggestion chips resolve to their clean text
  assert(QUICK_REVISION_CHIPS.length >= 5);
  for (const chip of QUICK_REVISION_CHIPS) {
    assert.strictEqual(resolveRevisionFeedback(chip), chip);
  }

  // Test 3: Custom teacher feedback with extra notes
  const customMessage = `${QUICK_REVISION_CHIPS[1]} Also make sure to link the Google Doc, not local file.`;
  assert.strictEqual(resolveRevisionFeedback(customMessage), customMessage);

  console.log('  ✔ FE-4: Rejection guardrail enforces constructive revision guidance and chips');
}

// ----------------------------------------------------
// Suite 5: FE-5 Responsive Horizontal Scrolling for Portal Tabs
// ----------------------------------------------------
console.log('Suite 5: FE-5 Portal Tabs Horizontal Scroll Structure');
{
  const teacherPortalCode = fs.readFileSync(path.resolve('src/components/TeacherPortal.jsx'), 'utf-8');
  const adminPortalCode = fs.readFileSync(path.resolve('src/components/AdminPortal.jsx'), 'utf-8');

  // Verify class constant tokens match layout structure
  assert(teacherPortalCode.includes(HORIZONTAL_SCROLL_CONTAINER_CLASSES));
  assert(teacherPortalCode.includes(TAB_BUTTON_CLASSES));
  assert(adminPortalCode.includes(HORIZONTAL_SCROLL_CONTAINER_CLASSES));
  assert(adminPortalCode.includes(TAB_BUTTON_CLASSES));

  console.log('  ✔ FE-5: Responsive horizontal scroll container and non-wrapping classes verified in both portals');
}

// ----------------------------------------------------
// Suite 6: FE-6 Mobile Choice Board Category Filter Chips
// ----------------------------------------------------
console.log('Suite 6: FE-6 Mobile Choice Board Category Filter Chips');
{
  const mockLearningPaths = [
    {
      id: 'math',
      title: 'Math Quest',
      options: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]
    },
    {
      id: 'science',
      title: 'Science Lab',
      options: [{ id: 's1' }, { id: 's2' }]
    },
    {
      id: 'writing',
      title: 'Story Writing',
      options: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }, { id: 'w4' }]
    }
  ];

  const completedActivities = ['m1', 'm2', 'w1'];
  const approvedActivities = ['s1'];

  // Test 1: Category completion stats
  const mathStats = calculatePathProgressStats(mockLearningPaths[0], completedActivities, approvedActivities);
  assert.strictEqual(mathStats.count, 2);
  assert.strictEqual(mathStats.total, 3);
  assert.strictEqual(mathStats.isComplete, false);

  const sciStats = calculatePathProgressStats(mockLearningPaths[1], completedActivities, approvedActivities);
  assert.strictEqual(sciStats.count, 1);
  assert.strictEqual(sciStats.total, 2);

  // Test 2: Overall board stats across all categories
  const totalCompleted = mockLearningPaths.reduce((acc, p) => 
    acc + calculatePathProgressStats(p, completedActivities, approvedActivities).count, 0
  );
  const totalOptions = mockLearningPaths.reduce((acc, p) => acc + (p.options || []).length, 0);
  assert.strictEqual(totalCompleted, 4); // m1, m2, s1, w1
  assert.strictEqual(totalOptions, 9);

  // Test 3: Path filtering
  assert.strictEqual(filterLearningPathsByChip(mockLearningPaths, 'all').length, 3);
  assert.strictEqual(filterLearningPathsByChip(mockLearningPaths, 'math').length, 1);
  assert.strictEqual(filterLearningPathsByChip(mockLearningPaths, 'math')[0].id, 'math');
  assert.strictEqual(filterLearningPathsByChip(mockLearningPaths, 'nonexistent_id').length, 3);

  // Test 4: Toggle behavior (if active chip tapped again, returns all)
  assert.strictEqual(toggleLearningPathFilter('math', 'math'), 'all');
  assert.strictEqual(toggleLearningPathFilter('all', 'science'), 'science');

  console.log('  ✔ FE-6: Mobile category filtering, completion counters, and chip toggle behavior pass');
}

// ----------------------------------------------------
// Suite 7: FE-7 Student Redeemed Rewards Log & History
// ----------------------------------------------------
console.log('Suite 7: FE-7 Student Redeemed Rewards Log & Inventory History');
{
  const mockRedemptions = [
    {
      id: 'r1',
      studentId: 'student-A',
      studentName: 'Alex',
      itemName: 'Sit in Teacher Chair',
      cost: 50,
      status: 'pending',
      directions: 'Show teacher on Monday morning.',
      redeemedAt: { seconds: 1700000100 }
    },
    {
      id: 'r2',
      studentId: 'student-B',
      studentName: 'Bob',
      itemName: 'Free Homework Pass',
      cost: 100,
      status: 'fulfilled',
      directions: 'Turn in with homework folder.',
      redeemedAt: { seconds: 1700000200 }
    },
    {
      id: 'r3',
      studentId: 'student-A',
      studentName: 'Alex',
      itemName: 'Extra Recess Pass',
      cost: 75,
      status: 'fulfilled',
      directions: 'Give to recess monitor.',
      redeemedAt: { seconds: 1700000300 }
    },
    {
      id: 'r4-corrupt',
      studentId: 'student-A',
      studentName: 'Alex',
      itemName: 'Corrupt Date Pass',
      cost: 25,
      status: 'pending',
      redeemedAt: 'corrupted-timestamp-string'
    }
  ];

  // Test 1: Student A sees only their redemptions sorted newest first without NaN break
  const alexRedemptions = filterAndSortRedemptions(mockRedemptions, 'student-A', 'Alex');
  assert.strictEqual(alexRedemptions.length, 3);
  assert.strictEqual(alexRedemptions[0].id, 'r3'); // Newest (1700000300) first
  assert.strictEqual(alexRedemptions[1].id, 'r1');

  // Test 2: Status badges
  assert.strictEqual(getRedemptionStatusBadge('fulfilled').label, '✓ Fulfilled');
  assert.strictEqual(getRedemptionStatusBadge('cancelled').label, '✕ Cancelled');
  assert.strictEqual(getRedemptionStatusBadge('pending').label, '⏳ Waiting for Teacher');

  // Test 3: Resilient date formatting
  assert.strictEqual(formatRedemptionDate(null), 'Recently');
  assert.strictEqual(formatRedemptionDate('corrupted-timestamp-string'), 'Recently');
  assert.notStrictEqual(formatRedemptionDate({ seconds: 1700000100 }), 'Invalid Date');

  // Test 4: Unmatched student sees empty list
  const unknownStudent = filterAndSortRedemptions(mockRedemptions, 'student-Z', 'Zoe');
  assert.strictEqual(unknownStudent.length, 0);

  console.log('  ✔ FE-7: Student redemptions filtering, chronological ordering, and fulfillment states pass');
}

// ----------------------------------------------------
// Suite 8: FE-10 Accessible Focus Rings & Live Announcements
// ----------------------------------------------------
console.log('Suite 8: FE-10 Accessible Focus Rings & Live Region Announcements');
{
  const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');

  // Test 1: High-contrast focus rings in index.css
  assert(indexCss.includes('focus-visible'), 'index.css missing focus-visible rules');
  assert(indexCss.includes('ring-2 ring-yellow-400 outline-none'), 'index.css missing yellow-400 focus ring');

  // Test 2: Live region presence in App.jsx
  assert(appJsx.includes('role="status"'), 'App.jsx missing role="status" live region');
  assert(appJsx.includes('aria-live="polite"'), 'App.jsx missing aria-live="polite"');
  assert(appJsx.includes('aria-atomic="true"'), 'App.jsx missing aria-atomic="true"');

  // Test 3: Live announcement generator formatting logic
  const xpMsg = formatLiveAnnouncement('xp_gain', { diff: 150, totalXp: 150 });
  assert.strictEqual(xpMsg, 'Earned 150 XP! Total XP: 150');

  const zeroXpMsg = formatLiveAnnouncement('xp_gain', { diff: 0, totalXp: 150 });
  assert.strictEqual(zeroXpMsg, '');

  const lvlMsg = formatLiveAnnouncement('level_up', { level: 3, title: 'Quest Apprentice' });
  assert.strictEqual(lvlMsg, 'Level Up! You reached Level 3: Quest Apprentice!');

  const achMsg = formatLiveAnnouncement('achievement', { title: 'Streak Master' });
  assert.strictEqual(achMsg, 'Achievement Unlocked: Streak Master!');

  console.log('  ✔ FE-10: High-contrast focus styling, polite live regions, and event announcements verified');
}

console.log('\n==========================================');
console.log('🎉 ALL MILESTONE 2 (M2) TESTS PASSED CLEANLY!');
console.log('==========================================');
```

---

## 5. Verification Method

To verify the remediation when implemented:
1. **Confirm Production Imports in `tests/testMilestone2.js`**:
   Inspect line 1-25 of `tests/testMilestone2.js`. Confirm imports from `../src/utils/portalUtils.js`.
2. **Confirm Zero Local Mocks**:
   Search for mock identifiers:
   ```powershell
   Select-String -Path "tests/testMilestone2.js" -Pattern "class VisibilityToggleState|class BatchApprovalSession|const buildRejectionPayload|class LiveAnnouncementTracker"
   ```
   *Expected result: Zero matches.*
3. **Execute Full Consolidated Test Runner**:
   ```powershell
   & "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
   ```
   *Expected result: Exit code 0, all Milestone 1 unit tests, Milestone 2 genuine tests, and adversarial stress suites pass cleanly.*
