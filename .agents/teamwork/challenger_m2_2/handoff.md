# Empirical Challenge Report & Handoff — Milestone 2 (`challenger_m2_2`)

## 1. Observation
- Baseline verification: executed `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js` which passed cleanly across M1 suites and M2 test files (`testMilestone2.js`, `challengerMilestone2Stress.test.js`).
- Created and executed empirical adversarial test harness in `tests/challenger_m2_adversarial.js` using project Node runtime, and integrated into `tests/runAllTests.js`.
- Direct codebase observations:
  1. **Batch Submission Selection State Desync** (`src/components/TeacherPortal.jsx:79, 583-598, 2127-2173`):
     - `selectedSubmissionIds` is a standalone `useState(new Set())`.
     - When switching student filter (`selectedStudentFilterId`), `selectedSubmissionIds` is NOT reset or pruned.
     - In line 2144, toolbar displays `{selectedSubmissionIds.size} selected` across all students even when viewing a single student who has 0 selected items.
     - In line 2160, button displays `Approve Selected ({selectedSubmissionIds.size})` and is enabled (`disabled={selectedSubmissionIds.size === 0 || batchProcessing}`).
     - When clicked, line 2154 runs:
       `const selectedSubs = pending.filter(s => selectedSubmissionIds.has(s.id));`
       `handleBatchApprove(selectedSubs, 'Batch approved by teacher');`
       When `selectedSubs` is empty, line 601 executes: `if (!submissionsToApprove || submissionsToApprove.length === 0) return;` — resulting in a **silent no-op failure** where the user clicks an enabled action button and nothing happens.
     - In line 2133: `checked={selectedSubmissionIds.size > 0 && selectedSubmissionIds.size >= pending.length}`. When teacher selects 2 items from Student B and switches filter to Student C (who has 1 item), `2 >= 1` is true. The "Select All" checkbox is visually checked for Charlie even though Charlie's card is unchecked. Clicking "Select All" invokes line 593: `selectedSubmissionIds.size >= pending.length` which CLEARS the selection to `new Set()` instead of selecting Charlie's card.
     - When individual submissions are approved via modal review (`handleReview`) or co-teacher real-time synchronization, `selectedSubmissionIds` retains stale IDs, causing the selection count to exceed total pending submissions in the queue.
  2. **Corrupted Date Parsing & Broken V8 Timsort in Redeemed Rewards** (`src/App.jsx:1401-1405, 1678-1682`):
     - Comparator in `App.jsx` line 1401-1405:
       ```javascript
       myRedemptions.sort((a, b) => {
         const timeA = a.redeemedAt?.seconds ? a.redeemedAt.seconds * 1000 : (a.redeemedAt ? new Date(a.redeemedAt).getTime() : 0);
         const timeB = b.redeemedAt?.seconds ? b.redeemedAt.seconds * 1000 : (b.redeemedAt ? new Date(b.redeemedAt).getTime() : 0);
         return timeB - timeA;
       });
       ```
       If a single record contains an invalid date string (`"bad-date"`, `""`, `"corrupted"`), empty object `{}`, or non-conforming timestamp, `new Date(a.redeemedAt).getTime()` evaluates to `NaN`.
       Evaluating `timeB - timeA` with `NaN` violates V8 Timsort comparator invariants, causing `sort()` to fail and return an out-of-order array where recent items are placed after older items (empirically confirmed in `tests/challenger_m2_adversarial.js` test 1.1).
     - Line 1678-1682:
       ```javascript
       const dateStr = item.redeemedAt?.seconds
         ? new Date(item.redeemedAt.seconds * 1000).toLocaleDateString()
         : item.redeemedAt
         ? new Date(item.redeemedAt).toLocaleDateString()
         : 'Recently';
       ```
       Renders literal string `"Invalid Date"` in the student's UI instead of falling back to `'Recently'`.
  3. **Screen Reader Live Region Race Conditions & WCAG Container Mounting** (`src/App.jsx:2146-2166`, `src/components/TeacherPortal.jsx:2176, 5239`):
     - In `App.jsx`, `prevXpRef.current` initializes to `gameState.xp` (`0`). When Firestore asynchronously loads the student's profile (e.g. 1200 XP), `diff > 0` triggers `setLiveAnnouncement('Earned 1200 XP! Total XP: 1200')` on every initial page load.
     - When XP gain, Level-Up, and Achievement occur simultaneously, all three `useEffect` hooks fire in the same commit. React overwrites `liveAnnouncement` sequentially without queueing, starving earlier screen reader announcements.
     - In `TeacherPortal.jsx:2176` (`batchNotice`) and `TeacherPortal.jsx:5239` (`rosterToast`), live region containers (`<div role="status" aria-live="polite">`) are conditionally rendered into the DOM at the exact moment content is populated. According to W3C ARIA guidelines, screen readers only reliably observe DOM mutation events within pre-existing live containers.

## 2. Logic Chain
1. Observations in `TeacherPortal.jsx` prove that `selectedSubmissionIds` is decoupled from both the active filter (`selectedStudentFilterId`) and the underlying submission list (`submissions`).
2. When a user changes the filter, selections made under prior views are orphaned into ghost IDs that corrupt displayed counts, cause enabled buttons to perform silent no-ops, and produce inverted states on "Select All".
3. Observations in `App.jsx` show that `new Date(x).getTime()` without `Number.isFinite()` checking produces `NaN` on invalid date strings and objects.
4. Because JavaScript's `Array.prototype.sort()` comparator returns `NaN`, sorting invariants fail completely, leading to corrupted chronological display of redeemed rewards.
5. Observations in `App.jsx` and `TeacherPortal.jsx` demonstrate that live announcements falsely trigger on initial load, clobber simultaneous progression events, and dynamically mount live region containers in violation of screen reader standards.

## 3. Caveats
- No caveats regarding reproducibility: all 11 test scenarios in `tests/challenger_m2_adversarial.js` were directly verified and execute deterministically in Node.
- Review-only role was strictly maintained: no implementation code was altered.

## 4. Conclusion & Explicit Verdict

**Verdict**: **`REQUEST_CHANGES`**

### Summary of Required Fixes
1. **Teacher Batch Review Selection Synchronization (`src/components/TeacherPortal.jsx`)**:
   - Reset or prune `selectedSubmissionIds` whenever `selectedStudentFilterId` or `selectedClass?.id` changes.
   - Compute selection counts and button labels based strictly on visible pending submissions (`pending.filter(s => selectedSubmissionIds.has(s.id)).length`).
   - Fix "Select All" checked condition to verify `pending.length > 0 && pending.every(s => selectedSubmissionIds.has(s.id))`.
2. **Resilient Redeemed Rewards Date Parsing (`src/App.jsx`)**:
   - Normalize date parsing using `Number.isFinite()`:
     ```javascript
     const parseTimeMs = (val) => {
       if (!val) return 0;
       if (typeof val.seconds === 'number') return val.seconds * 1000;
       if (typeof val._seconds === 'number') return val._seconds * 1000;
       if (typeof val.toDate === 'function') {
         const ms = val.toDate().getTime();
         return Number.isFinite(ms) ? ms : 0;
       }
       const ms = new Date(val).getTime();
       return Number.isFinite(ms) ? ms : 0;
     };
     ```
   - In UI rendering, ensure `Number.isFinite(date.getTime())` before calling `toLocaleDateString()`, defaulting to `'Recently'`.
3. **Screen Reader Announcement Stabilization (`src/App.jsx` & `src/components/TeacherPortal.jsx`)**:
   - Guard against initial load false announcements using an initial mount ref (`isInitialMountRef.current`).
   - In `TeacherPortal.jsx`, maintain live region container continuously in the DOM rather than mounting conditionally.

## 5. Verification Method
Run the consolidated test suite using the project Node runtime:
```powershell
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
```
Or execute the standalone empirical adversarial suite:
```powershell
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/challenger_m2_adversarial.js
```
Both exit with code 0 and confirm exact empirical reproduction across all 11 adversarial stress scenarios.
