# Investigation & Remediation Proposal: TeacherPortal Batch Selection Synchronization, Filter Pruning & Live Region Stability

**Author**: Explorer 2 (`explorer_m2_it2_2`)  
**Mission**: Milestone 2 Iteration 2 (M2-IT2)  
**Target File**: `src/components/TeacherPortal.jsx`  
**Related Files**: `tests/challenger_m2_adversarial.js`, `tests/testMilestone2.js`, `src/utils/portalUtils.js`  
**Reference Handoffs**: `auditor_m2/handoff.md`, `challenger_m2_2/handoff.md`

---

## 1. Observation

### 1.1 Codebase Inspection in `src/components/TeacherPortal.jsx`

#### 1. Selection State Declaration & Unbounded Lifetime
Lines 72-82:
```javascript
72:   const [selectedStudentFilterId, setSelectedStudentFilterId] = useState('all');
...
79:   const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set());
80:   const [batchProcessing, setBatchProcessing] = useState(false);
81:   const [batchNotice, setBatchNotice] = useState(null);
82:   const [showConfirmApproveAllModal, setShowConfirmApproveAllModal] = useState(false);
```
- `selectedSubmissionIds` is stored as an independent React `Set` state.
- There are no `useEffect` hooks or change handlers observing `selectedStudentFilterId` or `selectedClass?.id` to reset or prune `selectedSubmissionIds`.
- There are no mechanisms observing `submissions` updates (via Firestore subscription at line 356) to remove approved, rejected, or deleted submission IDs from `selectedSubmissionIds`.

#### 2. Single Review Handler Leaking Stale IDs
Lines 571-581:
```javascript
571:   const handleReview = async (submissionId, status, feedback) => {
572:     await backend.reviewSubmission(submissionId, status, feedback);
573:     if (selectedClass?.id) {
574:       const updatedStudents = await backend.getStudents(selectedClass.id);
575:       setStudents(updatedStudents || []);
576:       if (inspectingStudentSubmissions) {
577:         const refreshed = (updatedStudents || []).find(s => s.id === inspectingStudentSubmissions.id);
578:         if (refreshed) setInspectingStudentSubmissions(refreshed);
579:       }
580:     }
581:   };
```
- When an individual submission is reviewed via card modal or quick button, `submissionId` is NOT removed from `selectedSubmissionIds`. If that card was selected in batch mode prior to opening the review modal, its ID remains in `selectedSubmissionIds` even after its status transitions to `approved` or `rejected`.

#### 3. Faulty "Select All" Toggle Logic
Lines 592-598:
```javascript
592:   const handleToggleSelectAllPending = () => {
593:     if (selectedSubmissionIds.size >= pending.length && pending.length > 0) {
594:       setSelectedSubmissionIds(new Set());
595:     } else {
596:       setSelectedSubmissionIds(new Set(pending.map(s => s.id)));
597:     }
598:   };
```
- Line 593 compares cardinality: `selectedSubmissionIds.size >= pending.length`.
- If a teacher has selected 2 submissions for Student A, and then switches the filter to Student B who has 1 pending submission, `selectedSubmissionIds.size` (2) is greater than or equal to `pending.length` (1).
- Clicking "Select All" executes line 594: `setSelectedSubmissionIds(new Set())`, which clears the selection rather than selecting Student B's submission.

#### 4. Batch Review Toolbar State Desynchronization & Silent No-Op
Lines 2127-2173:
```javascript
2127:   {pending.length > 0 && (
2128:     <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
2129:       <div className="flex items-center gap-3">
2130:         <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
2131:           <input
2132:             type="checkbox"
2133:             checked={selectedSubmissionIds.size > 0 && selectedSubmissionIds.size >= pending.length}
2134:             onChange={handleToggleSelectAllPending}
2135:             disabled={batchProcessing}
2136:             className="w-4 h-4 rounded border-slate-600 text-green-600 focus:ring-green-400 cursor-pointer bg-slate-700"
2137:             aria-label="Select all pending submissions"
2138:           />
2139:           <span>Select All ({pending.length})</span>
2140:         </label>
2141: 
2142:         {selectedSubmissionIds.size > 0 && (
2143:           <span className="text-xs bg-green-950/60 text-green-300 border border-green-700/50 font-bold px-2 py-0.5 rounded-full">
2144:             {selectedSubmissionIds.size} selected
2145:           </span>
2146:         )}
2147:       </div>
2148: 
2149:       <div className="flex items-center gap-2 flex-wrap">
2150:         <button
2151:           type="button"
2152:           disabled={selectedSubmissionIds.size === 0 || batchProcessing}
2153:           onClick={() => {
2154:             const selectedSubs = pending.filter(s => selectedSubmissionIds.has(s.id));
2155:             handleBatchApprove(selectedSubs, 'Batch approved by teacher');
2156:           }}
2157:           className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
2158:         >
2159:           <Check className="w-3.5 h-3.5" />
2160:           <span>Approve Selected ({selectedSubmissionIds.size})</span>
2161:         </button>
...
```
- Line 2133: `checked={selectedSubmissionIds.size > 0 && selectedSubmissionIds.size >= pending.length}` visually checks the "Select All" checkbox for a student even when 0 of that student's cards are selected.
- Line 2144: Renders `{selectedSubmissionIds.size} selected` instead of counting visible selected cards.
- Line 2152: Enables the "Approve Selected" button whenever `selectedSubmissionIds.size > 0`, regardless of whether any of those selected IDs exist in `pending`.
- Line 2154 & 601: When clicked with 0 visible items, `selectedSubs` evaluates to `[]`. In line 601, `if (!submissionsToApprove || submissionsToApprove.length === 0) return;` aborts silently with zero user feedback.
- Line 2160: Displays `Approve Selected ({selectedSubmissionIds.size})`, displaying a non-zero count (e.g. 2) on a button that will approve 0 items.

#### 5. Dynamic Insertion of ARIA Live Region Containers
Lines 2176-2189 (`batchNotice`):
```javascript
2176:   {batchNotice && (
2177:     <div
2178:       className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
2179:         batchNotice.type === 'error'
2180:           ? 'bg-rose-950/60 border-rose-800 text-rose-200'
2181:           : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
2182:       }`}
2183:       role="status"
2184:       aria-live="polite"
2185:     >
2186:       <span>{batchNotice.text}</span>
2187:       <button type="button" onClick={() => setBatchNotice(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
2188:     </div>
2189:   )}
```
Lines 5239-5248 (`rosterToast`):
```javascript
5239:   {rosterToast && (
5240:     <div
5241:       role="status"
5242:       aria-live="polite"
5243:       className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-yellow-400 text-yellow-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-bottom-3 backdrop-blur-md"
5244:     >
5245:       <Check className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
5246:       <span>{rosterToast}</span>
5247:     </div>
5248:   )}
```
- Both `batchNotice` and `rosterToast` conditionally mount their respective `<div role="status" aria-live="polite">` containers into the DOM at the exact moment their content is populated.
- W3C WAI-ARIA and WCAG 4.1.3 guidelines state that screen readers monitor DOM mutations within pre-existing live regions. When the live container itself is injected at the same time as its text content, major screen readers (NVDA, JAWS) routinely miss the announcement.

---

## 2. Logic Chain

1. **State Independence & Ghost Selections**:
   `selectedSubmissionIds` is maintained as a persistent React state while `pending` is dynamically computed from `activeSubmissions` based on `selectedStudentFilterId`. Changing the filter restricts the cards visible on screen, but leaves previously selected submission IDs in the Set.
2. **Cardinality Fallacy on "Select All"**:
   Using `.size >= pending.length` treats selection as a scalar count rather than a relational set. If set $S$ contains 2 IDs from Student A, and Student B has 1 pending item $x \notin S$, then $|S| \ge 1$ holds true, falsely marking "Select All" as checked while card $x$ is unchecked.
3. **Dead Click & UI Lie on "Approve Selected"**:
   Displaying `{selectedSubmissionIds.size}` on the button and using `selectedSubmissionIds.size === 0` for `disabled` creates a visual guarantee of action that the handler cannot fulfill. When `selectedSubs = pending.filter(s => selectedSubmissionIds.has(s.id))` is empty, `handleBatchApprove` executes line 601 (`if (!submissionsToApprove || submissionsToApprove.length === 0) return;`), silently swallowing the user's action.
4. **Stale Selection After Single-Item Review**:
   Because `handleReview` does not update `selectedSubmissionIds`, reviewing any selected item via its card modal or when updated by a co-teacher leaves an orphaned ID in `selectedSubmissionIds`. The count on the toolbar can exceed the total number of pending submissions in the queue.
5. **Screen Reader Announcement Failure**:
   Injecting `<div role="status" aria-live="polite">` dynamically on state change fails to notify assistive technologies because accessibility engines initialize live region listeners when the container enters the accessibility tree. Without a pre-mounted container, DOM mutations occurring during insertion are dropped.

---

## 3. Caveats

1. **Role Scope**:
   As `explorer_m2_it2_2`, this report provides a read-only architectural investigation and concrete code-level remediation proposal. No production files were modified.
2. **Coordination with Peer Explorers**:
   - `explorer_m2_it2_1` is responsible for extracting domain utility functions into `src/utils/portalUtils.js` and remediating `tests/testMilestone2.js`. The selection helper functions defined in Section 4 below are designed to be exported from `src/utils/portalUtils.js`.
   - `explorer_m2_it2_3` is responsible for `App.jsx` date parsing and live announcement queuing.
3. **Visual Layout Preservation**:
   Permanently mounting the live region containers must not introduce unwanted vertical margins or layout shifts when `batchNotice` or `rosterToast` is `null`. The outer wrapper `<div>` with zero height/padding perfectly achieves this.

---

## 4. Conclusion & Concrete Remediation Proposal

To resolve all observed defects, five targeted modifications are required in `src/components/TeacherPortal.jsx` and `src/utils/portalUtils.js`:

### 4.1 Pure Domain Utility Extraction (`src/utils/portalUtils.js`)

Add pure, testable selection helpers to `src/utils/portalUtils.js`:

```javascript
/**
 * Computes synchronized batch selection state for visible pending submissions.
 * @param {Array} pendingSubmissions - Visible pending submissions
 * @param {Set|Array} selectedSubmissionIds - Currently selected IDs
 * @returns {{ visibleSelectedSubs: Array, visibleSelectedCount: number, isAllSelected: boolean }}
 */
export function computeBatchSelectionState(pendingSubmissions = [], selectedSubmissionIds = new Set()) {
  const pending = Array.isArray(pendingSubmissions) ? pendingSubmissions : [];
  const selectedSet = selectedSubmissionIds instanceof Set
    ? selectedSubmissionIds
    : new Set(selectedSubmissionIds || []);
  const visibleSelectedSubs = pending.filter(s => selectedSet.has(s?.id));
  const isAllSelected = pending.length > 0 && visibleSelectedSubs.length === pending.length;
  return {
    visibleSelectedSubs,
    visibleSelectedCount: visibleSelectedSubs.length,
    isAllSelected
  };
}

/**
 * Toggles "Select All" on visible pending submissions.
 * If all visible items are selected, deselects all visible items.
 * Otherwise, selects all visible items.
 * @param {Array} pendingSubmissions
 * @param {Set} currentSelectedIds
 * @returns {Set} new Set with updated selection IDs
 */
export function toggleSelectAllPending(pendingSubmissions = [], currentSelectedIds = new Set()) {
  const pending = Array.isArray(pendingSubmissions) ? pendingSubmissions : [];
  const next = new Set(currentSelectedIds || []);
  const allSelected = pending.length > 0 && pending.every(s => next.has(s?.id));
  if (allSelected) {
    pending.forEach(s => next.delete(s?.id));
  } else {
    pending.forEach(s => next.add(s?.id));
  }
  return next;
}

/**
 * Prunes selected submission IDs against active pending submissions in the class.
 * @param {Set} selectedSubmissionIds
 * @param {Array} submissions
 * @returns {Set} pruned Set containing only active pending submission IDs
 */
export function pruneSelectedSubmissionIds(selectedSubmissionIds = new Set(), submissions = []) {
  if (!selectedSubmissionIds || selectedSubmissionIds.size === 0) return new Set();
  const validPendingIds = new Set(
    (Array.isArray(submissions) ? submissions : [])
      .filter(s => s?.status === 'pending')
      .map(s => s?.id)
  );
  let changed = false;
  for (const id of selectedSubmissionIds) {
    if (!validPendingIds.has(id)) {
      changed = true;
      break;
    }
  }
  if (!changed) return selectedSubmissionIds;
  return new Set([...selectedSubmissionIds].filter(id => validPendingIds.has(id)));
}
```

---

### 4.2 State Lifecycle & Pruning in `src/components/TeacherPortal.jsx`

#### Addition A: Reset Selections on Filter / Class Change (after line 88)
```javascript
  // Reset selected submission IDs when student filter or class changes
  useEffect(() => {
    setSelectedSubmissionIds(new Set());
  }, [selectedStudentFilterId, selectedClass?.id]);

  // Prune any stale IDs from selectedSubmissionIds if submissions change
  useEffect(() => {
    setSelectedSubmissionIds(prev => pruneSelectedSubmissionIds(prev, submissions));
  }, [submissions]);
```

#### Addition B: Prune Individual Reviewed Submissions in `handleReview` (lines 571-581)
```javascript
  const handleReview = async (submissionId, status, feedback) => {
    // Immediately prune from selectedSubmissionIds
    setSelectedSubmissionIds(prev => {
      if (!prev.has(submissionId)) return prev;
      const next = new Set(prev);
      next.delete(submissionId);
      return next;
    });

    await backend.reviewSubmission(submissionId, status, feedback);
    if (selectedClass?.id) {
      const updatedStudents = await backend.getStudents(selectedClass.id);
      setStudents(updatedStudents || []);
      if (inspectingStudentSubmissions) {
        const refreshed = (updatedStudents || []).find(s => s.id === inspectingStudentSubmissions.id);
        if (refreshed) setInspectingStudentSubmissions(refreshed);
      }
    }
  };
```

#### Addition C: Refactor `handleToggleSelectAllPending` (lines 592-598)
```javascript
  const handleToggleSelectAllPending = () => {
    setSelectedSubmissionIds(prev => toggleSelectAllPending(pending, prev));
  };
```

---

### 4.3 Derived Selection Computation & Toolbar Fix (lines 890 & 2127-2173)

#### Addition D: Derived Selection State (around line 891)
```javascript
  const pending = activeSubmissions.filter(s => s.status === 'pending');
  const reviewed = activeSubmissions.filter(s => s.status !== 'pending');

  // Derive visible selection state strictly scoped to current pending submissions
  const { visibleSelectedSubs, visibleSelectedCount, isAllSelected } = useMemo(() => {
    return computeBatchSelectionState(pending, selectedSubmissionIds);
  }, [pending, selectedSubmissionIds]);
```

#### Modification E: Batch Toolbar Replacement (`src/components/TeacherPortal.jsx:2127-2173`)
```jsx
                            {/* ── BATCH REVIEW TOOLBAR (FE-3) ── */}
                            {pending.length > 0 && (
                              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isAllSelected}
                                      onChange={handleToggleSelectAllPending}
                                      disabled={batchProcessing}
                                      className="w-4 h-4 rounded border-slate-600 text-green-600 focus:ring-green-400 cursor-pointer bg-slate-700"
                                      aria-label="Select all pending submissions"
                                    />
                                    <span>Select All ({pending.length})</span>
                                  </label>

                                  {visibleSelectedCount > 0 && (
                                    <span className="text-xs bg-green-950/60 text-green-300 border border-green-700/50 font-bold px-2 py-0.5 rounded-full">
                                      {visibleSelectedCount} selected
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={visibleSelectedCount === 0 || batchProcessing}
                                    onClick={() => {
                                      handleBatchApprove(visibleSelectedSubs, 'Batch approved by teacher');
                                    }}
                                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve Selected ({visibleSelectedCount})</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={pending.length === 0 || batchProcessing}
                                    onClick={() => setShowConfirmApproveAllModal(true)}
                                    className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Approve All Pending ({pending.length})</span>
                                  </button>
                                </div>
                              </div>
                            )}
```

---

### 4.4 Continuously Mounted Live Regions (`TeacherPortal.jsx:2176-2189` and `5239-5248`)

#### Modification F: Continuously Mounted `batchNotice` Live Region (lines 2176-2189)
```jsx
                            {/* Screen reader live region - continuously mounted in DOM (WCAG 4.1.3) */}
                            <div role="status" aria-live="polite" aria-atomic="true">
                              {batchNotice && (
                                <div
                                  className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
                                    batchNotice.type === 'error'
                                      ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                                  }`}
                                >
                                  <span>{batchNotice.text}</span>
                                  <button
                                    type="button"
                                    onClick={() => setBatchNotice(null)}
                                    className="text-slate-400 hover:text-white ml-2"
                                    aria-label="Dismiss notice"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
```

#### Modification G: Continuously Mounted `rosterToast` Live Region (lines 5239-5248)
```jsx
      {/* Floating Action Toast - continuously mounted live region (WCAG 4.1.3) */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {rosterToast && (
          <div
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-yellow-400 text-yellow-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-bottom-3 backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
            <span>{rosterToast}</span>
          </div>
        )}
      </div>
```

---

## 5. Verification Method

### 5.1 Automated Unit & Adversarial Tests
Run the test suite using the project Node runtime:
```powershell
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
```

### 5.2 Verification Scenarios for Challenger Suite (`tests/challenger_m2_adversarial.js`)
1. **Scenario 2.1 (Ghost Selection)**:
   - Select 2 submissions from Student B in "All Students".
   - Switch filter to Student A (who has 1 submission, unselected).
   - Verify `visibleSelectedCount === 0`.
   - Verify "Approve Selected" button is `disabled`.
   - Verify clicking "Approve Selected" cannot execute with empty array.
2. **Scenario 2.2 ("Select All" Inversion)**:
   - Select 2 submissions from Student A in "All Students".
   - Switch filter to Student C (who has 1 submission, unselected).
   - Verify `isAllSelected === false` ("Select All" checkbox is unchecked).
   - Toggle "Select All".
   - Verify Student C's submission becomes selected (`isAllSelected === true`).
3. **Scenario 2.3 (Stale Selection Cleanup)**:
   - Select submissions `sub-1` and `sub-2`.
   - Transition `sub-1` to `approved` via `handleReview` or external update.
   - Verify `pruneSelectedSubmissionIds` removes `sub-1`.
   - Verify `visibleSelectedCount` updates immediately to 1.
4. **Scenario 3.3 (Continuously Mounted Live Regions)**:
   - Verify `<div role="status" aria-live="polite" aria-atomic="true">` exists in the rendered DOM even when `batchNotice === null` and `rosterToast === null`.
   - Verify that when `batchNotice` or `rosterToast` is set, content is rendered as a child of the pre-existing container.

### 5.3 Invalidation Conditions
- Any code where `selectedSubmissionIds.size` is used to determine button enablement, checked state, or approval payload instead of visible pending items.
- Any conditional rendering where `role="status"` or `aria-live="polite"` is removed from the DOM when notice/toast state is `null`.
