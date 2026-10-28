## 2026-10-28T23:11:18Z
You are Worker for Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1).
Your working directory is: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r2/

MANDATORY FIRST STEP:
Read /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/ORIGINAL_REQUEST.md (specifically the Follow-up section from 2026-10-28T22:48:40Z) and /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/PROJECT.md.

Read the 3 explorer reports in detail before writing any code:
1. /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/explorer_m1_fu_1_r2/handoff.md
2. /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/explorer_m1_fu_2_r2/handoff.md
3. /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3_r2/handoff.md

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

TASK IMPLEMENTATION REQUIREMENTS:
1. `src/hooks/useGameState.js`:
   - Add `claimedGuildChallenges: []` in `getDefaultState()`.
   - In `loadUserData()`, ensure `claimedGuildChallenges` is initialized from `studentData.claimedGuildChallenges || []`.
   - Implement and export `claimGuildChallenge(challenge)`:
     - Check client-side duplicate guard (`gameState.claimedGuildChallenges.includes(challenge.id)`).
     - Call `backend.claimGuildChallengeReward(...)`.
     - Update local state immediately (`xp`, `coins`, `guildXpContributed`, and `claimedGuildChallenges`).
     - Check level-up and achievements via `checkLevelUp` and `checkAndSetAchievements`.
     - Return `{ success: true, rewardXp, rewardCoins }` or `{ alreadyClaimed: true }`.
   - Reconcile student profile updates in the polling interval (so teacher changes/resets merge gracefully into student state rather than being wiped out).
2. `src/components/GuildPanel.jsx`:
   - Receive `onClaimGuildChallenge` prop.
   - Seed `claimedRewards` state from `gameState?.claimedGuildChallenges || []`, and update it when `gameState?.claimedGuildChallenges` changes.
   - Add in-flight claiming lock (`claimingChallengeId`) and disable button during active claim.
   - In `handleClaimReward`, use `onClaimGuildChallenge(challenge)` if provided.
   - If `res.alreadyClaimed`, set `claimedRewards[challenge.id] = true` and show toast.
   - Button renders `<Check className="w-4 h-4" /> Reward Claimed` when claimed.
3. `src/App.jsx`:
   - Pass `onClaimGuildChallenge={claimGuildChallenge}` to `<GuildPanel ... />`.
4. `src/services/realBackend.js`:
   - In `createStudent()`: include `claimedGuildChallenges: []`.
   - In `claimGuildChallengeReward()`: ensure atomic deduplication and return updated fields.
   - In `resetGuildMembersXp()`: fix return signature to `{ success: true, updatedCount: guildMembers.length }`, and support `{ resetChallenges = false }` to clear `claimedGuildChallenges: []` when requested.
   - In `rewardGuild()`: support achievement revocation/deduction when `rewardMode === 'deduct'`.
5. `src/components/TeacherPortal.jsx`:
   - Handle `{ updatedCount }` from `resetGuildMembersXp` so "undefined members" is fixed.
   - Support challenge reset alongside exploit XP reset.
   - Ensure student list/roster refreshes after guild reward actions.
6. Automated Tests:
   - Create `tests/guildChallengeReliability.test.js` implementing the 15 test cases defined in `specminer_m1_fu_3_r2/handoff.md`.
   - Wire the new suite into `tests/runAllTests.js`.
   - Run tests: `node tests/runAllTests.js` (must pass 100% with 0 failures).
   - Run build: `node ./node_modules/vite/bin/vite.js build` (must build cleanly with 0 errors).

Write your completion report to `/storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r2/handoff.md` and send a message back to the orchestrator.
