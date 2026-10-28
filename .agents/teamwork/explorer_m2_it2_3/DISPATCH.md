# DISPATCH — 2026-10-28T14:38:00Z

## Mission Assignment: Explorer 3 for Milestone 2 Iteration 2 (`explorer_m2_it2_3`)
Role: `teamwork_explorer`
Target: App.jsx Date Parsing Resiliency & Live Region Stabilization Strategy
Your Working Directory: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_3`

### Mandatory Inputs:
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read FIRST)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\auditor_m2\handoff.md` (Full Forensic Audit Evidence Report)
- `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m2_2\handoff.md` (Empirical State Desync Report)

### Objectives:
1. Deeply investigate the date parsing / V8 Timsort NaN issue and live announcement race conditions in `src/App.jsx` reported in `challenger_m2_2/handoff.md`:
   - Safe timestamp parser `parseTimestampMs(val)` handling Firestore Timestamp (`.seconds`), objects, ISO strings, invalid dates, and `NaN`.
   - Fixing student UI date formatting to prevent `"Invalid Date"`.
   - Guarding against initial mount false positive XP announcements (`isInitialMountRef.current` or `dataLoaded`).
   - Monotonic queuing of simultaneous progression announcements.
2. Design the precise code changes for `App.jsx` and utility extraction.
3. Write your report in `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_m2_it2_3\handoff.md`.
