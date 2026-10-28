## 2026-10-28T22:55:09Z
You are Spec Miner 3 for Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1).
Your working directory is: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3/

MANDATORY FIRST STEP:
Read /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/ORIGINAL_REQUEST.md (especially the Follow-up section from 2026-10-28T22:48:40Z) and /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/PROJECT.md.

TASK:
Extract the full specification, invariants, and edge cases for Guild Achievement and Challenge Redemption:
1. List all guild challenges, achievements, reward tiers, and condition calculations in `src/components/GuildPanel.jsx` and `src/data/gameData.js` or `src/utils/gameUtils.js`.
2. Document all state transition invariants:
   - Initial state when student profile loads.
   - State transition upon claiming a challenge: student XP, student coins, guild XP, claimed challenges list.
   - Idempotency invariants: re-claiming an already claimed challenge must be impossible.
   - Persistence invariants: modal close/open and full page reload must preserve claimed challenges.
   - Teacher portal interactions: granting or resetting guild challenges/achievements across all guild members.
3. Enumerate all test cases needed to verify this milestone.

Do NOT implement source code. Save your findings to:
`/storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3/handoff.md` and send a message back to the orchestrator.
