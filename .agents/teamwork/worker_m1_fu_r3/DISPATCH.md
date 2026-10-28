## 2026-10-28T23:18:49Z
You are Worker for Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1).
Your working directory is: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r3/

MANDATORY FIRST STEP:
Read /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/ORIGINAL_REQUEST.md and /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/PROJECT.md.

Read the explorer handoffs for exact code changes and tests:
- /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/explorer_m1_fu_1_r2/handoff.md (detailed code snippets in section 4)
- /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3_r2/handoff.md (15 test specifications in section 7)

FILE WRITE OWNERSHIP:
You have exclusive write ownership of:
- `src/hooks/useGameState.js`
- `src/components/GuildPanel.jsx`
- `src/services/realBackend.js`
- `src/components/TeacherPortal.jsx`
- `src/App.jsx`
- `tests/guildChallengeReliability.test.js`
- `tests/runAllTests.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK IMPLEMENTATION:
1. Apply the step-by-step changes from `explorer_m1_fu_1_r2/handoff.md` §4:
   - `useGameState.js`: initialize `claimedGuildChallenges: []` in `getDefaultState()`, load it defensively in `loadUserData()`, implement and export `claimGuildChallenge(challenge)` (updating XP, coins, guild XP, level progression, and achievements), and merge server updates in student polling.
   - `GuildPanel.jsx`: receive `onClaimGuildChallenge` prop, initialize `claimedRewards` from `gameState.claimedGuildChallenges`, sync on update, add `claimingChallengeId` in-flight lock, call `onClaimGuildChallenge` in `handleClaimReward`, render permanent `<Check className="w-4 h-4" /> Reward Claimed` when claimed.
   - `App.jsx`: pass `onClaimGuildChallenge={claimGuildChallenge}` to `<GuildPanel ... />`.
   - `realBackend.js`: ensure `createStudent` includes `claimedGuildChallenges: []`, `claimGuildChallengeReward` deduplicates and returns updated metrics, `resetGuildMembersXp` returns `{ success: true, updatedCount }` with `{ resetChallenges }` option, `rewardGuild` supports achievement revocation when deducting.
   - `TeacherPortal.jsx`: handle `{ updatedCount }` display fix, support guild challenge reset alongside exploit reset, refresh roster on update.
2. Create `tests/guildChallengeReliability.test.js` implementing the 15 test cases from `specminer_m1_fu_3_r2/handoff.md` §7, and wire it into `tests/runAllTests.js`.
3. Run tests via `node tests/runAllTests.js` and production build via `node ./node_modules/vite/bin/vite.js build`.
4. Save completion report to `/storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r3/handoff.md` and message the orchestrator.
