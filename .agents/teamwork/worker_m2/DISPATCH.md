# DISPATCH — 2026-10-28T13:55:00Z

## Mission Assignment: Milestone 2 Worker (`worker_m2`)
Role: `teamwork_worker`
Target Scope: Milestone 2 (M2: Ease of Use & Usability Enhancements — R2)
Your Working Directory: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m2`

### Mandatory Inputs:
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read FIRST)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\specminer_survey_3\handoff.md` (Sections 5 & 8 for exact specs FE-1 through FE-10)

### Node.js & Testing Environment:
- Node executable: `"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"`
- Run test suites command:
  `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`

### Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Your Objectives:
Implement the 8 core usability enhancements specified in `PROJECT.md` and `specminer_survey_3/handoff.md`:

1. **FE-1: Real-Time Student Roster Search in Login** (`src/components/LoginScreen.jsx`)
   - Add search input above roster buttons when `mode === 'student-select'`.
   - Filters roster dynamically by `name.toLowerCase().includes(search.toLowerCase())`.
   - Show clear message if no students match.

2. **FE-2: Password & PIN Visibility Toggle** (`src/components/LoginScreen.jsx`)
   - Add show/hide password toggle button with `Eye` and `EyeOff` icons from `lucide-react`.
   - Wire into student PIN input, student self-signup password input, and teacher login password input.
   - Set accessible `aria-label` ("Show password" / "Hide password") and preserve input value.

3. **FE-3: Batch Review & Quick Approval for Teachers** (`src/components/TeacherPortal.jsx`)
   - In Submissions tab, add a batch approval toolbar with:
     - Checkboxes for selecting individual pending submissions.
     - "Select All" toggle checkbox.
     - "Approve Selected ({count})" button.
     - "Approve All Pending ({count})" button with quick confirmation dialog.
   - Batch approval updates all selected submissions to 'approved', credits student XP, and updates guild challenge.

4. **FE-4: Revision Guidance Guardrail on Submissions Rejection** (`src/components/TeacherPortal.jsx`)
   - Intercept clicking "Reject". If the feedback text is blank, prompt with quick revision chips ("Add more detail", "Check link permissions", "Include a photo / screenshot", "Review activity steps") or allow typing custom feedback before finalizing rejection.
   - Ensures students always receive actionable feedback for "Needs revision".

5. **FE-5: Responsive Horizontal Scrolling for Portal Tabs** (`src/components/TeacherPortal.jsx` & `src/components/AdminPortal.jsx`)
   - Add `overflow-x-auto flex-nowrap scrollbar-none` (and custom styling) to the navigation tablist container in both portals so tabs smoothly scroll horizontally on screens <1024px without layout breakage or awkward wrapping.

6. **FE-6: Mobile Choice Board Category Filter Chips** (`src/App.jsx`)
   - On screens <768px, render horizontal category filter chips ("All", plus each class category with color/title) above the activity cards.
   - Clicking a chip filters the board view to that category's activities, eliminating the 2500px single-column scroll fatigue.
   - Include completion counters on the chips (e.g. "Coding 1/3").

7. **FE-7: Student Redeemed Rewards Log & Inventory History** (`src/App.jsx` in `AvatarBuilder`)
   - In the Rewards tab of the student customization/rewards panel, provide a toggle between "Available Rewards" and "Redeemed History".
   - Shows chronological list of redeemed items (item title, cost in coins, timestamp/date, and status) as verifiable proof of redemption for teachers.

8. **FE-10: Accessible Focus Rings & Live Region Announcements** (`src/index.css` & `src/App.jsx`)
   - Add global focus-visible styling in `src/index.css`: `focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none`.
   - Add accessible `aria-live="polite"` region for student XP gains and level-up celebrations.

### Verification Requirements:
- Run the full test suite using `"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"` to verify zero regressions on existing tests.
- Add or update test coverage in `tests/` for the new functionality.
- Write your completion report in `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m2\handoff.md`.
