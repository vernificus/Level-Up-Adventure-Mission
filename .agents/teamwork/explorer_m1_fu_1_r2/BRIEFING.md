# BRIEFING — 2026-10-28T23:07:00Z

## Mission
Investigate state synchronization and persistence bugs for guild achievement & challenge redemption across useGameState.js, GuildPanel.jsx, realBackend.js, and TeacherPortal.jsx.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/explorer_m1_fu_1_r2
- Original parent: e251ed7d-bcb2-4628-a3cf-8e23bc04471c
- Milestone: Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Base all claims on verified observations with file paths and line numbers
- Deliver structured handoff.md with 5 components

## Current Parent
- Conversation ID: e251ed7d-bcb2-4628-a3cf-8e23bc04471c
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/GuildPanel.jsx` (lines 1-1412, esp 48, 169-191, 1002-1050)
  - `src/hooks/useGameState.js` (lines 1-658, esp 15-45, 130-250, 367-387, 460-505)
  - `src/services/realBackend.js` (lines 1-2604, esp 1355-1475, 1573-1598, 1658-1715)
  - `src/components/TeacherPortal.jsx` (lines 1-6060, esp 872-900, 3380-3420, 4300-4330, 5090-5185)
  - `src/App.jsx` (lines 50-95, 2130-2200, 2351-2365)
  - `tests/runAllTests.js` (verified existing 7 test suites pass)
  - `node ./node_modules/vite/bin/vite.js build` (verified production build transforms 1617 modules and succeeds)
- **Key findings**:
  1. `claimedGuildChallenges` is completely absent from `getDefaultState()` in `useGameState.js`.
  2. `GuildPanel.jsx` defines local `claimedRewards = useState({})` which is NEVER initialized from `gameState.claimedGuildChallenges` or backend.
  3. Reopening the modal or reloading resets `claimedRewards` to `{}`.
  4. Claiming a reward in `GuildPanel.jsx` calls `backend.claimGuildChallengeReward`, which updates Firestore directly but NEVER updates `gameState` in `useGameState.js`.
  5. The `onStateUpdate` prop passed to `GuildPanel` is `refreshClassData`, which only updates class spotlight and boss, NOT student XP/coins/level.
  6. Catastrophic overwrite bug: `useGameState.js` line 248 has an unconditional sync `backend.updateStudent(user.id, gameState)`. Since `gameState` holds stale XP, coins, and missing `claimedGuildChallenges`, any student action causes `useGameState` to overwrite Firestore with stale state.
  7. Teacher granting achievements or resetting exploit XP in `TeacherPortal.jsx` is not listened to by active student sessions, leading to active sessions overwriting teacher changes.
  8. Missing in-flight claim lock allows rapid double-click race conditions.
  9. Backend `alreadyClaimed` branch in `GuildPanel.jsx` doesn't lock the button to claimed state.
- **Unexplored areas**: None for M1 task scope.

## Key Decisions Made
- Formulated comprehensive 5-component root-cause analysis and step-by-step fix strategy in `handoff.md`.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- progress.md — liveness heartbeat
- BRIEFING.md — working memory
- handoff.md — completed investigation and fix strategy report
