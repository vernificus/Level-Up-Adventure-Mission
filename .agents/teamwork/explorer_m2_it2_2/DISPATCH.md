# DISPATCH — 2026-10-28T14:38:00Z

## Mission Assignment: Explorer 2 for Milestone 2 Iteration 2 (`explorer_m2_it2_2`)
Role: `teamwork_explorer`
Target: TeacherPortal Batch Selection Synchronization & State Fix Strategy
Your Working Directory: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_2`

### Mandatory Inputs:
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read FIRST)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\auditor_m2\handoff.md` (Full Forensic Audit Evidence Report)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m2_2\handoff.md` (Empirical State Desync Report)

### Objectives:
1. Deeply investigate the batch selection filter desync in `src/components/TeacherPortal.jsx` reported in `challenger_m2_2/handoff.md`:
   - Pruning/resetting `selectedSubmissionIds` when `selectedStudentFilterId` or `selectedClass?.id` changes.
   - Counting selection only for visible pending submissions.
   - Fixing "Select All" checked state: `pending.length > 0 && pending.every(s => selectedSubmissionIds.has(s.id))`.
   - Continuous DOM mounting for live region containers (`batchNotice`, `rosterToast`).
2. Design the precise code changes and state setters for `TeacherPortal.jsx`.
3. Write your report in `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_2\handoff.md`.
