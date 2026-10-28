# Specification Mining Report: Milestone 1 — Guild Achievement & Challenge Redemption Reliability (R1)

## Executive Summary
This document provides the authoritative specification, state invariants, edge cases, and automated test matrix for **Milestone 1: Guild Achievement & Challenge Redemption Reliability (R1)** across `src/components/GuildPanel.jsx`, `src/hooks/useGameState.js`, `src/services/realBackend.js`, `src/components/TeacherPortal.jsx`, `src/data/gameData.js`, and `src/utils/gameUtils.js`.

---

## 1. Observation
Codebase inspection reveals five critical state synchronization and persistence defects in the existing guild implementation:

1. **Uninitialized Local Claim State in `GuildPanel.jsx`**:
   `src/components/GuildPanel.jsx` line 48:
   ```javascript
   const [claimedRewards, setClaimedRewards] = useState({});
   ```
   `claimedRewards` initializes to an empty object `{}` every time `GuildPanel` mounts or remounts. It completely ignores `gameState?.claimedGuildChallenges`. Even if the student's profile in Firestore already records that challenges were claimed, `GuildPanel` treats them as unclaimed on every modal open or page refresh.

2. **Missing `claimedGuildChallenges` Field in Default State (`useGameState.js`)**:
   `src/hooks/useGameState.js` lines 15–45 (`getDefaultState`):
   ```javascript
   const getDefaultState = () => ({
     playerName: '',
     xp: 0,
     coins: 100,
     completedActivities: [],
     completedBossChallenges: [],
     currentStreak: 0,
     lastActivityDate: null,
     streakShieldActive: false,
     unlockedAchievements: [],
     guild: null,
     guildXpContributed: 0,
     ...
     highFivesSent: {},
   });
   ```
   `claimedGuildChallenges` is absent from `getDefaultState()`. If a new student profile is initialized or an existing profile lacks the property, `gameState.claimedGuildChallenges` is `undefined`, triggering errors on array operations (`.includes()`, `.map()`).

3. **Stale State Overwrite Race Condition (`useGameState.js` <-> `realBackend.js`)**:
   `src/components/GuildPanel.jsx` lines 169–191 (`handleClaimReward`):
   ```javascript
   const handleClaimReward = async (challenge) => {
     if (claimedRewards[challenge.id]) return;
     try {
       const res = await backend.claimGuildChallengeReward(
         classId,
         gameState?.id,
         currentGuild,
         challenge.id,
         challenge.reward,
         challenge.coinReward
       );
       if (res.alreadyClaimed) {
         showToast('You have already claimed this guild reward!');
       } else {
         setClaimedRewards(prev => ({ ...prev, [challenge.id]: true }));
         showToast(`🎉 Claimed +${challenge.reward} XP and +${challenge.coinReward} Coins for completing "${challenge.title}"!`);
         if (onStateUpdate) onStateUpdate();
         loadGuildData();
       }
     } catch (e) {
       alert('Error claiming reward: ' + e.message);
     }
   };
   ```
   `onStateUpdate` in `src/App.jsx` line 2357 is wired to `refreshClassData`, which only fetches `classSpotlight` and `activeBoss` (lines 2179–2191) — it does **NOT** refresh `gameState` or student XP/coins.
   Meanwhile, `useGameState.js` lines 247–250 runs:
   ```javascript
   useEffect(() => {
     if (user && user.role === 'student' && dataLoaded) {
       backend.updateStudent(user.id, gameState);
     }
   }, [gameState, user, dataLoaded]);
   ```
   Because `gameState` in `useGameState` was never updated with the new XP, coins, or `claimedGuildChallenges`, any subsequent state transition (e.g. buying an avatar item or earning a daily quest) calls `backend.updateStudent` with stale `gameState`, **overwriting Firestore and wiping out the newly earned XP, coins, and claimed challenge record!**

4. **Return Signature Mismatch in Teacher Reset Exploit XP (`TeacherPortal.jsx` & `realBackend.js`)**:
   `src/services/realBackend.js` line 1712:
   ```javascript
   return guildMembers.length;
   ```
   `src/components/TeacherPortal.jsx` lines 3384–3385:
   ```javascript
   const res = await backend.resetGuildMembersXp(classId, guildId, { resetTotalXp: true });
   alert(`Exploit XP reset to 0 for ${res.updatedCount} members of ${guildName}!`);
   ```
   Because `backend.resetGuildMembersXp` returns a primitive number (`guildMembers.length`), `res.updatedCount` evaluates to `undefined`, presenting users with "Exploit XP reset to 0 for undefined members".

5. **Disconnection Between Backend Claim and Frontend Level/Achievement Triggers**:
   When `claimGuildChallengeReward` adds XP, neither `checkLevelUp` nor `checkAchievements` is invoked on the client. If claiming 200 XP crosses a level threshold (e.g., Level 2 at 200 XP), bonus coins and level-up congratulations are never evaluated or awarded.

---

## 2. Guild System Architecture & Specification

### 2.1 Guild Challenges (`GUILD_CHALLENGES` in `src/data/gameData.js`)

| ID | Title | Description | Target | Metric Type | Reward XP | Reward Coins | Emoji | Condition Calculation Source |
|---|---|---|---|---|---|---|---|---|
| `gc1` | Knowledge Blitz | Guild members complete 10 activities total this week | 10 | `activities` | 120 XP | 50 🪙 | ⚔️ | `g.members.reduce((acc, m) => acc + (m.completedActivities?.length \|\| 0), 0)` |
| `gc2` | Streak Squad | At least 3 guild members hold a 3+ day streak | 3 | `streakers` | 150 XP | 75 🪙 | 🔥 | `g.members.filter(m => (m.currentStreak \|\| 0) >= 3).length` |
| `gc3` | Path Masters | Guild members complete at least 2 activities from every learning path | 6 | `paths` | 140 XP | 60 🪙 | 🗺️ | `calculatePathMastersProgress(g.members, DEFAULT_PATHS, 2)`: Counts distinct paths where sum of member completions is $\ge 2$. |
| `gc4` | Boss Rush Squad | 2 or more guild members defeat the weekly boss challenge | 2 | `bosses` | 200 XP | 100 🪙 | 👹 | `g.members.reduce((acc, m) => acc + (m.completedBossChallenges?.length \|\| 0), 0)` |
| `gc5` | Collaboration Crusade | Guild members complete 5 Collaboration-type activities together | 5 | `collab` | 160 XP | 80 🪙 | 🤝 | `g.members.reduce((acc, m) => acc + (m.collaborationCount \|\| 0), 0)` |

#### Challenge Progress Formulas
In `src/services/realBackend.js` (`getGuildLeaderboard` lines 1443–1468):
- `currentVal`: Evaluated per challenge type from aggregated guild members.
- `target`: `ch.target` (fallback to 1).
- `percent`: $\min(100, \text{round}((\text{currentVal} / \text{target}) \times 100))$.
- `completed`: $\text{currentVal} \ge \text{target}$.

---

### 2.2 Guild Progression Tiers (`GUILD_LEVELS` in `src/data/gameData.js`)

Guild Level is calculated from the aggregate contributed XP of all guild members (`totalXp`):
`getGuildLevelInfo(totalXp)` iterates through `GUILD_LEVELS` in descending order:

| Level | Name | Min Contributed XP | Perk Description | Perk Icon | Castle Theme Unlock |
|---|---|---|---|---|---|
| 1 | Novice Clan | 0 XP | Basic Guild Hall & Emblems | 🛡️ | `default` |
| 2 | Iron Vanguard | 1,000 XP | +5% Coin Surge on Quests | 🪙 | `flames` |
| 3 | Bronze Sentinels | 2,500 XP | Daily Guild High-Five Boost (+15 XP) | ⚡ | `stars` |
| 4 | Silver Legion | 5,000 XP | Team Mystery Box Luck Surge | 🎁 | `forest` |
| 5 | Gold Crusaders | 8,000 XP | Exclusive Guild Avatar Cosmetics | 👑 | `ocean` |
| 6 | Platinum Titans | 12,000 XP | Guild Crest Aura & Banner Flair | ✨ | `crystal` |
| 7 | Emerald Phoenixes | 17,000 XP | +10% Collaboration Activity XP | 🤝 | `volcano` |
| 8 | Ruby Conquerors | 23,000 XP | Weekly Team Bonus Mystery Drop | 💎 | `cyber` |
| 9 | Diamond Apex | 30,000 XP | Celestial Castle Hall Theme | 🏰 | `celestial` |
| 10 | Mythic Immortals | 40,000 XP | Legendary Guild Crown & Immortal Banner | 🌟 | `mythic` |

---

### 2.3 STEM Supply Depot Tiers (`DEFAULT_STEM_SUPPLIES` in `src/data/gameData.js`)

Purchased with individual student coins for the benefit of the guild robot/team:

| ID | Item Name | Tier | Req Guild Level | Cost (Coins) | Category | Description |
|---|---|---|---|---|---|---|
| `stem_tier1` | Tier 1 STEM Supply Kit | 1 | Level 1 | 40 🪙 | `supplies` | Basic structural beams, shafts, connectors |
| `stem_vex_pitch_1` | Extra VEX Pitch Access (15 Mins) | 1 | Level 1 | 60 🪙 | `perk` | 15 min reserved pitch testing |
| `stem_tier2` | Tier 2 STEM Supply Pack | 2 | Level 3 | 90 🪙 | `supplies` | High-strength gears, chains, motor brackets |
| `stem_vex_pitch_2` | Extra VEX Pitch Access (30 Mins) | 2 | Level 3 | 120 🪙 | `perk` | 30 min autonomous calibration pitch block |
| `stem_tier3` | Tier 3 Advanced STEM Kit | 3 | Level 5 | 160 🪙 | `supplies` | Optical sensors, ultrasonic rangefinders |
| `stem_3d_print` | Custom 3D Print Priority Pass | 3 | Level 5 | 180 🪙 | `perk` | Front-of-line 3D printer queue pass |
| `stem_tier4` | Tier 4 Master STEM Depot | 4 | Level 7 | 240 🪙 | `supplies` | Pneumatic pistons, omni-directional wheels |
| `stem_tier5` | Tier 5 Mythic Engineering Cache | 5 | Level 9 | 350 🪙 | `supplies` | Competition alloy framing, high-speed flywheels |

---

### 2.4 Guild Hall Trophies (`GUILD_TROPHIES`) & Student Guild Achievements

- **Student Achievement**:
  - `guild_hero`: "Guild Hero", desc: "Contribute 500 XP to your guild", icon: 🛡️, reward: 150 XP. Triggered when `updatedState.guildXpContributed >= 500`.
- **Guild Hall Trophies**:
  `gt_teamwork` (🤝), `gt_knowledge` (📚), `gt_creativity` (🎨), `gt_streak` (🔥), `gt_champion` (🛡️), `gt_mvp` (👑), `gt_rising` (🌟), `gt_spirit` (💫), `gt_boss` (⚔️), `gt_level10` (🏰).
- **High-Five Interaction**:
  - Sender receives +10 XP, receiver receives +15 XP.
  - Cooldown governed by `getHighFiveCooldownStatus(lastSentIso, limit)`:
    - `'daily'`: Cooldown active if sent on the same calendar day OR within 16 hours.
    - `'weekly'`: Cooldown active if sent within 6 days ($6 \times 24 \times 3600 \times 1000$ ms).
    - `'disabled'`: Can never high-five.

---

## 3. State Transition Invariants

### 3.1 Initial State Loading Invariant
```
∀ student S:
  S.claimedGuildChallenges ∈ Array<string>
  default(S.claimedGuildChallenges) = []
```
- When `useGameState` boots or student logs in, `gameState.claimedGuildChallenges` must be initialized to `Array.isArray(studentData.claimedGuildChallenges) ? studentData.claimedGuildChallenges : []`.
- When `GuildPanel` mounts, its `claimedRewards` lookup map must be seeded:
  `claimedRewards = Object.fromEntries(gameState.claimedGuildChallenges.map(id => [id, true]))`.
- If `gameState.claimedGuildChallenges` updates while `GuildPanel` is open, `claimedRewards` must sync via `useEffect`.

### 3.2 State Transition Upon Claiming a Challenge
Given a challenge $C = (\text{id}, \text{rewardXp}, \text{coinReward})$ and current student state $S_t$:

**Pre-conditions**:
1. $S_t.\text{guild} \neq \text{null}$ (student belongs to a guild).
2. $C.\text{completed} = \text{true}$ (the guild reached the challenge target).
3. $C.\text{id} \notin S_t.\text{claimedGuildChallenges}$ (not previously claimed).

**Transition Function**:
$$S_{t+1} = \text{claimChallenge}(S_t, C)$$
$$\begin{aligned}
S_{t+1}.\text{xp} &= S_t.\text{xp} + C.\text{rewardXp} \\
S_{t+1}.\text{coins} &= S_t.\text{coins} + C.\text{coinReward} + \Delta\text{LevelCoins} \\
S_{t+1}.\text{guildXpContributed} &= S_t.\text{guildXpContributed} + C.\text{rewardXp} \\
S_{t+1}.\text{claimedGuildChallenges} &= S_t.\text{claimedGuildChallenges} \cup \{ C.\text{id} \} \\
S_{t+1}.\text{unlockedAchievements} &= S_t.\text{unlockedAchievements} \cup \text{CheckAchievements}(S_{t+1})
\end{aligned}$$
Where $\Delta\text{LevelCoins}$ is calculated via `calculateLevelAndBonusCoins(S_t.xp, S_{t+1}.xp, LEVELS)`.

**Post-conditions**:
1. UI: The claim button for challenge $C.\text{id}$ instantly transitions from `<button>Claim Reward!</button>` to `<span className="..."><Check /> Reward Claimed</span>`.
2. Immediate Consistency: Local state in `useGameState` reflects $S_{t+1}$ synchronously before any background persistence effect runs, preventing stale overwrites.
3. Level Progression: If $S_{t+1}.\text{xp}$ crosses a level boundary, `showLevelUp` triggers with level reward coins.

### 3.3 Idempotency Invariants (Duplicate Claim Prevention)
For any claim invocation $\text{claimChallenge}(S, C)$:
1. **Client Guard**: If $C.\text{id} \in S.\text{claimedGuildChallenges}$ or `claimedRewards[C.id] === true`, the action aborts immediately with no network request, no state mutation, and no UI flicker.
2. **Backend Guard**: In `realBackend.js` (`claimGuildChallengeReward`), the Firestore student document is inspected:
   ```javascript
   if (claimed.includes(challengeId)) {
     return { alreadyClaimed: true };
   }
   ```
   If already present, the backend rejects further mutations and returns `{ alreadyClaimed: true }`.
3. **Idempotence Property**:
   $$\forall k \ge 1, \quad \text{claimChallenge}^k(S_t, C) \equiv \text{claimChallenge}(S_t, C)$$
   Multiple simultaneous or sequential claim clicks produce the exact same XP, coin, and claimed array state as a single click.

### 3.4 Persistence Invariants
1. **Modal Lifecycle Invariant**: Closing `GuildPanel` (`showGuildDetails = false`) and reopening it (`showGuildDetails = true`) in the same session preserves the claimed status of all challenges.
2. **Reload Lifecycle Invariant**: Calling `window.location.reload()` or restarting the browser preserves all claimed challenges, student XP, coins, and guild XP. On subsequent mount, `loadUserData()` populates `claimedGuildChallenges` from Firestore.
3. **Weekly Reset Invariant**:
   - `completedActivities` are reset to `[]` on weekly Monday 7am resets (`shouldAutoReset`).
   - If weekly guild challenges are reset for a new week/season, `claimedGuildChallenges` must be reset to `[]` in coordinated sync with the challenge reset so students can re-earn rewards for the new cycle.

### 3.5 Teacher Portal Interaction Invariants
1. **Multi-Member Reward Invariant**:
   `backend.rewardGuild(classId, guildId, rewardType, rewardValue)` operates on all students where $s.\text{guild} = \text{guildId}$:
   - If `rewardType === 'xp'`: $\forall s, s.\text{xp} = \max(0, s.\text{xp} + v)$ and $s.\text{guildXpContributed} = \max(0, s.\text{guildXpContributed} + v)$.
   - If `rewardType === 'coins'`: $\forall s, s.\text{coins} = \max(0, s.\text{coins} + v)$.
   - If `rewardType === 'achievement'`: $\forall s$, if $v \notin s.\text{unlockedAchievements}$, append $v$.
   - Returns `{ updatedCount: count }` or `count` consistently.
2. **Multi-Member Exploit Reset Invariant**:
   `backend.resetGuildMembersXp(classId, guildId, { resetTotalXp, xpDeduction })`:
   - Clamps all values at $\ge 0$ (prevents underflow).
   - Returns standard `{ success: true, updatedCount: guildMembers.length }`.
   - `TeacherPortal.jsx` handles `{ updatedCount }` without displaying `undefined`.
3. **Guild Challenge Reset Invariant**:
   When a teacher resets guild challenges for a class or guild, each member's `claimedGuildChallenges` is cleared (`[]`), and guild challenge progress counters reset.

---

## 4. Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Guild Challenges | Live Team Quests | Weekly collaborative quests calculating aggregate activities, streaks, paths, bosses, and collabs | `classId`, `guildId` | `challenges: Array<{ id, title, target, current, percent, completed }>` | Returns default 0 progress if no members | `GuildPanel.jsx:992`, `realBackend.js:1443` |
| 2 | Challenge Claim | Guild Reward Redemption | Students claim XP and coins for completed guild quests | `classId`, `studentId`, `guildId`, `challengeId`, `reward`, `coinReward` | `{ success: true, rewardXp, rewardCoins }` | Returns `{ alreadyClaimed: true }` if duplicate | `GuildPanel.jsx:169`, `realBackend.js:1573` |
| 3 | State Persistence | Profile Claim Storage | Persistent storage of claimed challenge IDs in student profile | `studentId`, `challengeId` | `claimedGuildChallenges: string[]` in Firestore | Missing property defaulted to `[]` | `realBackend.js:1580`, `useGameState.js:148` |
| 4 | Guild Progression | 10-Tier Level System | Guild levels 1–10 based on cumulative member contributed XP | `totalXp: number` | `{ level, name, perk, currentXp, nextLevelXp, progress, isMax, unlockedThemes }` | Clamps at level 10 (40,000 XP) | `gameData.js:370`, `GuildPanel.jsx:735` |
| 5 | STEM Supply Depot | Tiered STEM Shop | Purchasing hardware and pitch access using individual student coins | `classId`, `studentId`, `itemId` | Purchase logged, student coins deducted | Rejects if insufficient coins or guild level < required | `GuildPanel.jsx:815`, `realBackend.js:2415` |
| 6 | High-Fives | Teammate Cheers | Send peer cheers giving +10 XP to sender and +15 XP to receiver with daily/weekly limits | `senderId`, `receiverId`, `guildId` | `{ success: true, senderXpEarned, receiverXpEarned, nowIso }` | Rejects with reason string if cooldown active or disabled | `GuildPanel.jsx:130`, `gameData.js:796` |
| 7 | Guild Customization | Castle Theme & Bot Picture | Custom battle cry, noticeboard, banner gradients, and compressed bot photo | `hallDescription`, `noticeText`, `bannerId`, `botPictureUrl` | Updated `guildHall` document in Firestore | File compressed to <500x500 webp or validated URL | `GuildPanel.jsx:103`, `GuildPanel.jsx:213` |
| 8 | Teacher Guild Ops | Guild Rewards & Penalties | Teachers grant or deduct XP, coins, or achievements for all guild members | `classId`, `guildId`, `rewardType`, `rewardValue`, `rewardMode` | Count of affected students | Clamps numeric values at $\ge 0$ | `TeacherPortal.jsx:3393`, `realBackend.js:1658` |
| 9 | Teacher Guild Ops | Guild Exploit XP Reset | Teachers zero out or deduct exploit XP for all members of a specific guild | `classId`, `guildId`, `options` | Count of affected students | Clamps at 0, fixes `res.updatedCount` | `TeacherPortal.jsx:3380`, `realBackend.js:1689` |
| 10 | Teacher Guild Ops | Guild Auto-Balancing | Automatic fair distribution of unassigned (or all) students across active guilds | `classId`, `mode: 'unassigned' \| 'all'` | `{ updatedCount: number }` | Shuffles and balances evenly across active guilds | `TeacherPortal.jsx:3443`, `realBackend.js:1613` |

---

## 5. Edge Cases
| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---|---|---|
| 1 | Profile Initial Load | Student profile in Firestore has `claimedGuildChallenges: undefined` | Must safely default to `[]`. No `TypeError: Cannot read properties of undefined (reading 'includes')`. |
| 2 | Profile Initial Load | Student profile in Firestore has `claimedGuildChallenges: ['gc1', 'gc3']` | `useGameState` populates array; `GuildPanel` mounts with `claimedRewards: { gc1: true, gc3: true }`. |
| 3 | Incomplete Challenge Claim | User tries to claim challenge `gc1` when `current = 8, target = 10` (`completed: false`) | Button is hidden or disabled. If manually triggered, claim function rejects without state mutation. |
| 4 | Rapid Double Claim | Student rapidly double-clicks "Claim Reward!" on completed challenge `gc1` | First click executes; second click blocked by client-side guard. Backend rejects with `{ alreadyClaimed: true }`. XP/coins credited exactly once. |
| 5 | Level Boundary Crossing on Claim | Student at 150 XP claims `gc1` (+120 XP -> 270 XP). Level 2 boundary is 200 XP (reward: 25 coins) | Level increases from 1 to 2; student receives 50 coins (challenge) + 25 coins (level bonus) = 75 coins total; level-up modal triggers. |
| 6 | Achievement Trigger on Claim | Student with 400 guild XP claims `gc1` (+120 XP -> 520 guild XP) | `guild_hero` achievement triggers (requires 500 guild XP), awarding an extra +150 XP. |
| 7 | Modal Close & Reopen | Student claims `gc1`, closes Guild modal, reopens Guild modal 5 seconds later | `gc1` immediately displays as "Reward Claimed" with green Check icon; claim button does not reappear. |
| 8 | Full Page Refresh (F5) | Student claims `gc1`, refreshes page in browser | Page reloads from backend; `gc1` persists as claimed; XP and coin balance remain intact. |
| 9 | Subsequent State Sync Safety | Student claims `gc1`, then immediately buys an avatar item (changing `gameState.coins`) | `useGameState` syncs updated state without wiping `claimedGuildChallenges` or reverting XP in Firestore. |
| 10 | Unassigned Student | Student with `guild = null` opens dashboard | Shows "Join a Guild" banner (if allowed) or "Teacher Assigned" notice (if `allowStudentGuildSelect = false`). |
| 11 | Teacher Deducts Exploit Penalty | Teacher deducts 500 XP from a student who only has 200 XP | Student XP and guild contributed XP clamp at 0; never negative. |
| 12 | Teacher Resets Exploit XP | Teacher runs `handleResetGuildExploit` on guild with 5 members | Prompt executes; alert displays "Exploit XP reset to 0 for 5 members of Fire Dragons!" (not `undefined members`). |
| 13 | Path Masters Calculation | Guild members complete 10 activities, but all are on `path1` | Progress evaluates to 1 path (target is 6); challenge remains incomplete. |
| 14 | Path Masters Calculation | Guild members complete 2 activities on `path1`, 2 on `path2`, 2 on `path3` | Progress evaluates to 3 distinct paths. |
| 15 | Weekly Reset Cycle | Monday 7:00 AM reset triggers | Student weekly activity lists reset, and if challenges reset, claimed challenge state allows re-earning for the new week. |

---

## 6. Logic Chain
1. **From Observation 1 & 2**: `GuildPanel.jsx` line 48 creates `claimedRewards` as a standalone React state initialized to `{}` with zero props or context inputs. `useGameState.js` line 15 defines `getDefaultState` without `claimedGuildChallenges`.
   - **Deduction**: On fresh mount, page reload, or modal reopen, any previously claimed challenge is lost in the UI, leaving the "Claim Reward!" button clickable.
2. **From Observation 3**: When `handleClaimReward` calls `backend.claimGuildChallengeReward`, Firestore is updated, but `useGameState`'s in-memory `gameState` is never updated because `onStateUpdate` only calls `refreshClassData` (which fetches class spotlight and boss, not student profile).
   - **Deduction**: `useGameState`'s auto-sync effect (`useEffect` on `gameState`) still holds the stale pre-claim XP, coins, and lack of `claimedGuildChallenges`. Any future state change in the student session will write stale data back to Firestore, wiping the student's claimed challenge record.
3. **From Observation 4**: In `realBackend.js` line 1712, `resetGuildMembersXp` returns `guildMembers.length` (a number). In `TeacherPortal.jsx` line 3385, the code accesses `res.updatedCount`.
   - **Deduction**: Accessing `.updatedCount` on a number returns `undefined`, creating a user-visible UI bug.
4. **Resolution Strategy**:
   - Provide a pure state transition helper `calculateGuildChallengeClaimState(prev, challenge)` in `src/utils/gameUtils.js` (or `useGameState.js`) that computes new XP, coins, level bonus, and updates `claimedGuildChallenges`.
   - Add `claimedGuildChallenges: []` to `getDefaultState()` and ensure `loadUserData()` populates it.
   - Export a `claimGuildChallenge` handler from `useGameState` and pass it to `GuildPanel` so both local React state and Firestore are updated atomically and in lockstep.
   - In `GuildPanel.jsx`, initialize `claimedRewards` from `gameState.claimedGuildChallenges` and synchronize via `useEffect`.
   - Standardize `resetGuildMembersXp` in `realBackend.js` to return `{ success: true, updatedCount: guildMembers.length }`.

---

## 7. Concrete Test Matrix

To guarantee 100% test pass with zero regressions, the following test cases must be added in a dedicated test suite (e.g. `tests/guildChallengeReliability.test.js`) and wired into `tests/runAllTests.js`:

### Suite 1: Pure State Reducer & Calculation Tests (`gameUtils.js` / `useGameState.js`)
- `TEST-M1-01`: **Initial State Fallback** — `getDefaultState()` includes `claimedGuildChallenges: []`. Verifies empty array default and non-null guarantees.
- `TEST-M1-02`: **Single Challenge Claim Transition** — Given student with 100 XP, 50 coins, 0 guild XP: claiming `gc1` (120 XP, 50 coins) transitions to 220 XP, 100 coins, 120 guild XP, `claimedGuildChallenges: ['gc1']`.
- `TEST-M1-03`: **Multi-Challenge Accumulation** — Claiming `gc2` (150 XP, 75 coins) after `gc1` results in 370 XP, 175 coins, 270 guild XP, `claimedGuildChallenges: ['gc1', 'gc2']`.
- `TEST-M1-04`: **Level-Up Boundary Trigger on Guild Claim** — Student with 180 XP (Level 1) claims `gc1` (+120 XP -> 300 XP, crossing Level 2 at 200 XP). Verifies bonus coins (25 coins) are awarded and `newLevel.level === 2`.
- `TEST-M1-05`: **Multi-Level Boundary Crossing on Guild Claim** — Student with 0 XP claims `gc4` (+200 XP -> crosses Level 2 at 200 XP) and `gc1` (+120 XP -> crosses Level 3 at 500 XP if base was 380 XP). Cumulative bonus coins awarded correctly.
- `TEST-M1-06`: **Guild Hero Achievement Trigger** — Student with 400 guild XP claims `gc1` (+120 XP -> 520 guild XP). Verifies `checkAchievements` triggers `guild_hero` and awards +150 XP.

### Suite 2: Idempotency & Defense Tests
- `TEST-M1-07`: **Client-Side Deduplication Guard** — Attempting to claim an already-claimed challenge (`claimedGuildChallenges.includes(ch.id)`) returns previous state without altering XP, coins, or array length.
- `TEST-M1-08`: **Backend-Side Deduplication Guard** — Simulating `claimGuildChallengeReward` against a student record with `claimedGuildChallenges: ['gc1']` returns `{ alreadyClaimed: true }` and makes zero database updates.
- `TEST-M1-09`: **Concurrent Claim Simulation** — Three rapid sequential claim calls for `gc1` result in exactly one execution; final `claimedGuildChallenges` has length 1 with no duplicates.
- `TEST-M1-10`: **Incomplete Challenge Guard** — Attempting to claim a challenge where `completed === false` is rejected.

### Suite 3: Persistence & Sync Safety
- `TEST-M1-11`: **Modal Reopen Simulation** — Converting `claimedGuildChallenges: ['gc1', 'gc3']` to `claimedRewards` map produces `{ gc1: true, gc3: true }`.
- `TEST-M1-12`: **State Sync Overwrite Defense** — Simulating subsequent state sync (`backend.updateStudent`) retains `claimedGuildChallenges`, preventing Firestore wipe.

### Suite 4: Teacher Portal Multi-Member Tests
- `TEST-M1-13`: **Teacher Multi-Member Reward XP/Coins** — `rewardGuild` updates all members in guild, clamps values at $\ge 0$, and leaves other guilds untouched.
- `TEST-M1-14`: **Teacher Multi-Member Achievement Grant** — `rewardGuild` with `achievement` updates `unlockedAchievements` for all guild members without creating duplicates.
- `TEST-M1-15`: **Teacher Exploit Reset Output Format** — `resetGuildMembersXp` returns `{ success: true, updatedCount: N }` matching `TeacherPortal.jsx` expectations.

---

## 8. Caveats
- No changes to `firestore.rules` are required since `claimedGuildChallenges` is stored within the student document which students have update rights to.
- While the UI provides bot picture uploading and customization, that functionality is already working and is independent of challenge redemption.
- No source code has been modified in this specification turn.

---

## 9. Conclusion
The specification for Milestone 1: Guild Achievement & Challenge Redemption Reliability is completely defined, grounded in existing codebase contracts, and backed by a comprehensive 15-test verification matrix. Implementation can proceed with surgical precision across `GuildPanel.jsx`, `useGameState.js`, `realBackend.js`, and `TeacherPortal.jsx`.

---

## 10. Verification Method
To independently verify the baseline and new specifications:
1. **Run Current Test Suite**:
   ```bash
   node tests/runAllTests.js
   ```
   (Must output `ALL 7 TEST SUITES PASSED` with 0 failures).
2. **Inspect Core Files**:
   - `src/components/GuildPanel.jsx` (lines 48, 169–191, 1002–1055)
   - `src/hooks/useGameState.js` (lines 15–45, 148–238, 247–250)
   - `src/services/realBackend.js` (lines 1409, 1573–1598, 1658–1717)
   - `src/components/TeacherPortal.jsx` (lines 3380–3420)
3. **Invalidation Conditions**:
   - If `claimedGuildChallenges` does not survive page refresh or modal close/reopen.
   - If claiming a challenge fails to update local XP or coins immediately.
   - If double-clicking "Claim Reward!" awards duplicate XP or coins.
   - If `resetGuildMembersXp` displays "undefined members" in the teacher portal.
