## 2026-10-28T23:25:30Z
You are Worker for Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1).
Your working directory is: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r4/

MANDATORY FIRST STEP:
Read /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/ORIGINAL_REQUEST.md.

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

EXECUTION INSTRUCTIONS:
Proceed IMMEDIATELY to applying the verified changes to the codebase:

1. `src/hooks/useGameState.js`:
   - In `getDefaultState()`, add `claimedGuildChallenges: [],`.
   - In `loadUserData()`, ensure `gameData.claimedGuildChallenges = Array.isArray(studentData.claimedGuildChallenges) ? studentData.claimedGuildChallenges : [];`.
   - Implement `claimGuildChallenge(challenge)`:
     - Check `(gameState.claimedGuildChallenges || []).includes(challenge.id)`. If so, return `{ alreadyClaimed: true }`.
     - Call `await backend.claimGuildChallengeReward(effectiveClassId, user.id, gameState.guild, challenge.id, rewardXp, rewardCoins)`.
     - If `res?.alreadyClaimed`, add `challenge.id` to local `claimedGuildChallenges` and return `{ alreadyClaimed: true }`.
     - If `res?.success`, update state: `xp += rewardXp`, `coins += rewardCoins`, `guildXpContributed += (guild ? rewardXp : 0)`, `claimedGuildChallenges: [...oldClaimed, challenge.id]`.
     - Run `checkLevelUp(prev, updatedState)` and `checkAndSetAchievements(updatedState)`.
     - Return `{ success: true, rewardXp, rewardCoins }`.
   - In student polling loop, merge server-granted achievements and server-reset metrics safely.
   - Export `claimGuildChallenge` in the return object of `useGameState`.

2. `src/components/GuildPanel.jsx`:
   - Receive `onClaimGuildChallenge` prop.
   - Initialize `claimedRewards` state from `gameState?.claimedGuildChallenges || []`.
   - In `useEffect([gameState?.claimedGuildChallenges])`, keep `claimedRewards` in sync.
   - Add `const [claimingChallengeId, setClaimingChallengeId] = useState(null);`
   - In `handleClaimReward`, guard against duplicate/in-flight, call `onClaimGuildChallenge(challenge)` (or fallback to backend call).
   - If `res?.alreadyClaimed` or `res?.success`, set `claimedRewards[challenge.id] = true`.
   - In challenge render: `const isClaimed = Boolean(claimedRewards[ch.id] || (gameState?.claimedGuildChallenges || []).includes(ch.id));`
     Disable button if `claimingChallengeId === ch.id`, show `<Check className="w-4 h-4" /> Reward Claimed` if `isClaimed`.

3. `src/App.jsx`:
   - Pass `onClaimGuildChallenge={claimGuildChallenge}` to `<GuildPanel ... />`.

4. `src/services/realBackend.js`:
   - In `createStudent()`: include `claimedGuildChallenges: []`.
   - In `claimGuildChallengeReward()`: deduplicate and return `{ success: true, rewardXp, rewardCoins, xp: newXp, coins: newCoins, guildXpContributed: newGuildXp, claimedGuildChallenges: updatedClaimed }` or `{ alreadyClaimed: true }`.
   - In `resetGuildMembersXp()`: return `{ success: true, updatedCount: guildMembers.length }`. Support `{ resetChallenges = false }` which sets `updates.claimedGuildChallenges = []`.
   - In `rewardGuild()`: if `rewardMode === 'deduct'` and `rewardType === 'achievement'`, remove `rewardValue` from `unlockedAchievements`.

5. `src/components/TeacherPortal.jsx`:
   - Handle `{ updatedCount: res?.updatedCount ?? res }` so alert does not say "undefined members".
   - Support guild challenge reset option.
   - Call `onStudentsUpdated?.()` after guild reward operations.

6. `tests/guildChallengeReliability.test.js` & `tests/runAllTests.js`:
   - Write comprehensive tests verifying: initial default state with `claimedGuildChallenges: []`, claim transition (XP, coins, guild XP), duplicate prevention (client and backend), level-up bonus coins crossing, multi-member teacher operations, and sync safety.
   - Add test suite into `tests/runAllTests.js`.
   - Run tests: `node tests/runAllTests.js` (must pass 100%).
   - Run production build: `node ./node_modules/vite/bin/vite.js build`.

Save completion report to `/storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/worker_m1_fu_r4/handoff.md` and message the orchestrator.
