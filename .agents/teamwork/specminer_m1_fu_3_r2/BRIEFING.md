# BRIEFING — 2026-10-28T23:02:30Z

## Mission
Extract full specification, invariants, edge cases, and test requirements for Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1).

## 🔒 My Identity
- Archetype: specification-miner
- Roles: External domain expert / Teamwork specialist
- Working directory: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3_r2/
- Original parent: e251ed7d-bcb2-4628-a3cf-8e23bc04471c
- Milestone: Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1)

## 🔒 Key Constraints
- Read-only: Do NOT implement source code
- Prioritize authoritative sources over LLM prior knowledge
- Thoroughly discover and document all guild challenges, achievements, reward calculations, state transitions, idempotency, persistence, teacher portal interactions, and test cases
- Save findings to /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/specminer_m1_fu_3_r2/handoff.md and notify orchestrator via send_message

## Current Parent
- Conversation ID: e251ed7d-bcb2-4628-a3cf-8e23bc04471c
- Updated: not yet

## Task Summary
- **What to build**: Specification discovery report for Guild Achievement & Challenge Redemption Reliability
- **Success criteria**: Comprehensive spec document with GuildPanel challenges/achievements, reward tiers, condition calculations, state transitions (initial, claim, idempotency, persistence, teacher portal), edge cases, and test case suite.
- **Interface contracts**: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/PROJECT.md
- **Code layout**: /storage/emulated/10/Projects/Level-Up-Adventure-Mission-main/.agents/teamwork/PROJECT.md

## Key Decisions Made
- Audited `GuildPanel.jsx`, `useGameState.js`, `realBackend.js`, `TeacherPortal.jsx`, `gameData.js`, `gameUtils.js`, `App.jsx`, and existing test suites.
- Pinpointed critical bugs:
  1. `GuildPanel.jsx` line 48 initializes `claimedRewards` as empty object `{}` on every mount, ignoring student profile `claimedGuildChallenges`.
  2. `useGameState.js` omits `claimedGuildChallenges: []` from `getDefaultState()`.
  3. `useGameState.js` does not provide an immediate state updater or action for claiming guild challenges, causing a race condition where subsequent Firestore syncs can overwrite newly claimed rewards with stale local state.
  4. `TeacherPortal.jsx` line 3385 assumes `res.updatedCount` from `resetGuildMembersXp`, whereas `realBackend.js` returns a raw count `guildMembers.length`.
  5. Multi-member teacher reset and granting functions need clear specifications for handling `claimedGuildChallenges` and immediate guild member state updates.
- Drafted test matrix with 15 granular unit and adversarial stress test cases covering initial load, claim transition, duplicate guards, persistence across modal/page reloads, and teacher portal controls.

## Artifact Index
- DISPATCH.md — Incoming dispatch message
- BRIEFING.md — Working memory
- progress.md — Liveness heartbeat and milestone progress
- handoff.md — Spec mining report with Features Discovered and Edge Cases tables
