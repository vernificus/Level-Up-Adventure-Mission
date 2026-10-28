# Task Assignment: Milestone 1 Challenger 2 (Adversarial State & Game Logic Testing)

## Working Directory
c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m1_2

## Mandatory References
1. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md` (Read first)
2. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md`
3. `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1\handoff.md`

## Objectives
1. Adversarially challenge the game state and logic bug remediations:
   - Bug 1: Simulate network/Firestore fetch throws in `useGameState`. Does it wipe student data?
   - Bug 2: Test Boss challenge completion with XP crossing multiple level boundaries (e.g. 500 XP). Does it trigger `checkLevelUp` correctly?
   - Bug 3: Verify that `doubleXpActive` doubles XP on normal activity and resets to false. What if daily quest matches simultaneously (4x XP)?
   - Bug 4: Test `streakShieldActive` when `diff = 7`, `diff = 8`, `diff = 9`, `diff = 30`. Does the shield consume once and only once?
   - Bug 6: Reconcile multiple revoked submissions. Does XP decrement safely without underflowing below 0?
2. Execute verification script:
   `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js`

## Output
Write your challenge report to `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m1_2\handoff.md`.
Explicitly declare your verdict: `APPROVE` or `REQUEST_CHANGES`.
Notify me via send_message when complete.

## 2026-10-28T13:06:48Z
[Message] timestamp=2026-10-28T13:06:48Z sender=49b3edc4-4ec6-479d-b3cd-de1c5cd042bb priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_challenger instance 2 for Milestone 1 (M1).
Your working directory is: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m1_2
Read your task assignment: c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m1_2\DISPATCH.md
MANDATORY: Read c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Read c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\PROJECT.md and c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\worker_m1\handoff.md.

Adversarially challenge the game state and logic bug remediations (progress wipe simulation, boss multi-level check, double XP + quest interaction, streak shield limits, submission revocation underflow).
Run tests with:
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tests/runAllTests.js
Write your report and clear verdict (APPROVE or REQUEST_CHANGES) to c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\challenger_m1_2\handoff.md.
Notify me using send_message when complete.
