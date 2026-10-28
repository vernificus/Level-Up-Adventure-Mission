# Handoff Report: Milestone 1 (R1) Guild Achievement & Challenge Redemption Reliability

## 1. Observation

### Observation 1: Firestore Student & Guild Data Structures & Missing Initialization
- In `src/services/realBackend.js` lines 154-194 (`createStudent`):
  ```javascript
  const newStudent = {
    classId,
    name,
    password,
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
    avatar: { color: 'default', hat: 'none', accessory: 'none', face: 'happy' },
    ownedItems: ['default', 'none', 'happy'],
    dailyQuestCompleted: false,
    lastDailyQuestDate: null,
    mysteryBoxesOpened: 0,
    pendingMysteryBoxes: 0,
    doubleXpActive: false,
    totalActivitiesCompleted: 0,
    collaborationCount: 0,
    pathCompletions: {},
    lastActivityReset: new Date().toISOString(),
    createdAt: serverTimestamp()
  };
  ```
  `claimedGuildChallenges: []` is completely omitted when student accounts are created.
- In `src/hooks/useGameState.js` lines 17-43 (`getDefaultState`):
  `claimedGuildChallenges` is absent from the initial student state dictionary.
- In `src/hooks/useGameState.js` lines 130-243 (`loadUserData`):
  `studentData` is fetched and spread (`const { id, classId, name, ...gameData } = studentData;`), but if `studentData.claimedGuildChallenges` does not exist in Firestore, `gameState.claimedGuildChallenges` remains `undefined`.
- In `src/services/realBackend.js` line 1409 (`getGuildLeaderboard`):
  `claimedGuildChallenges: s.claimedGuildChallenges || []` is read into `memberObj`, indicating that the field is expected to be an Array of challenge IDs.
- In `src/data/gameData.js` lines 450-501:
  5 static `GUILD_CHALLENGES` exist: `gc1` (Knowledge Blitz), `gc2` (Streak Squad), `gc3` (Path Masters), `gc4` (Boss Rush Squad), and `gc5` (Collaboration Crusade). Each has an `id`, `reward` (XP), `coinReward` (coins), and `target`.

### Observation 2: Flow in `GuildPanel.jsx` vs `useGameState.js`
- In `src/components/GuildPanel.jsx` line 48:
  ```javascript
  const [claimedRewards, setClaimedRewards] = useState({});
  ```
  `claimedRewards` is an isolated local component state initialized to `{}` on every mount of `GuildPanel.jsx`. It is never initialized or populated from `gameState.claimedGuildChallenges`.
- In `src/components/GuildPanel.jsx` line 1004 & 1037-1049:
  ```javascript
  const isClaimed = claimedRewards[ch.id];
  ...
  {isComplete && !isClaimed && (
    <button
      onClick={() => handleClaimReward(ch)}
      className="..."
    >
      Claim Reward!
    </button>
  )}
  {isClaimed && (
    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
      <Check className="w-4 h-4" /> Reward Claimed
    </span>
  )}
  ```
  `isClaimed` relies exclusively on the component's uninitialized `claimedRewards` map.
- In `src/components/GuildPanel.jsx` lines 169-191 (`handleClaimReward`):
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
  `handleClaimReward` calls `backend.claimGuildChallengeReward` directly.
- In `src/App.jsx` lines 2351-2363:
  ```jsx
  <GuildPanel
    currentGuild={gameState.guild}
    onJoinGuild={joinGuild}
    guildXp={gameState.guildXpContributed}
    classId={effectiveClassId}
    gameState={{ id: user?.id, name: gameState.playerName, ...gameState }}
    onStateUpdate={refreshClassData}
    onRecordHighFive={recordHighFive}
    guilds={classGuilds}
    spendCoins={spendCoins}
    highFiveLimit={highFiveLimit}
    allowStudentGuildSelect={allowStudentGuildSelect}
  />
  ```
  `onStateUpdate` is bound to `refreshClassData`. In `App.jsx` lines 2179-2191, `refreshClassData` only re-fetches `classSpotlight` and `activeBoss`. It does NOT update `gameState.xp`, `gameState.coins`, or `gameState.claimedGuildChallenges`.
- In `src/hooks/useGameState.js` lines 617-649:
  `useGameState` exports `joinGuild`, `recordHighFive`, `spendCoins`, but exports NO function for claiming guild rewards (`claimGuildReward` is completely missing).

### Observation 3: Auto-Sync Overwrite Defect in `useGameState.js`
- In `src/hooks/useGameState.js` lines 246-250:
  ```javascript
  // Sync state to "Backend" whenever it changes
  useEffect(() => {
    if (user && user.role === 'student' && dataLoaded) {
      backend.updateStudent(user.id, gameState);
    }
  }, [gameState, user, dataLoaded]);
  ```
  Every time `gameState` changes, the entire `gameState` object is written to Firestore via `updateDoc(doc(db, "students", studentId), updates)`.
- When `backend.claimGuildChallengeReward` updates the student document in Firestore directly from `GuildPanel.jsx`, `useGameState`'s React state remains on old `xp`, old `coins`, old `guildXpContributed`, and stale/undefined `claimedGuildChallenges`.
- As soon as any other state update occurs in `useGameState.js` (e.g., equipping an avatar accessory, purchasing an item, or streak update), the sync effect writes `gameState` to Firestore, silently reverting `xp`, `coins`, and clobbering `claimedGuildChallenges`.

### Observation 4: Concurrency & Duplicate Protection Vulnerabilities
- In `src/components/GuildPanel.jsx`:
  The "Claim Reward!" button has no `disabled` attribute, no loading spinner, and no in-flight promise tracker. Rapid clicks before the first async request completes trigger multiple simultaneous executions of `handleClaimReward`.
- In `src/services/realBackend.js` lines 1573-1598 (`claimGuildChallengeReward`):
  ```javascript
  const studentRef = doc(db, "students", studentId);
  const studentDoc = await getDoc(studentRef);
  if (!studentDoc.exists()) throw new Error('Student not found');

  const sData = studentDoc.data();
  const claimed = sData.claimedGuildChallenges || [];
  if (claimed.includes(challengeId)) {
    return { alreadyClaimed: true };
  }

  const updates = {
    xp: (sData.xp || 0) + (rewardXp || 100),
    coins: (sData.coins || 0) + (rewardCoins || 50),
    guildXpContributed: (sData.guildXpContributed || 0) + (rewardXp || 100),
    claimedGuildChallenges: [...claimed, challengeId]
  };

  await updateDoc(studentRef, updates);
  ```
  The read-modify-write cycle is not wrapped in a Firestore transaction (`runTransaction`) and does not use `arrayUnion` or `increment`. Two concurrent requests will read before either writes, resulting in race conditions and duplicate rewards.
- If `claimGuildChallengeReward` returns `{ alreadyClaimed: true }`, `GuildPanel.jsx` line 180 shows a toast but does NOT set `claimedRewards[challenge.id] = true`. The button remains "Claim Reward!" and can be clicked repeatedly.

### Observation 5: Teacher Controls in `TeacherPortal.jsx`
- In `src/components/TeacherPortal.jsx` line 3380-3391 (`handleResetGuildExploit`) & `realBackend.js` lines 1689-1717 (`resetGuildMembersXp`):
  `resetGuildMembersXp` sets `guildXpContributed = 0` and (optionally) `xp = 0`. It does NOT touch `claimedGuildChallenges`. If a teacher resets a guild for a new cycle or due to an exploit, students cannot reclaim challenges because their records remain marked as claimed.
- In `src/components/TeacherPortal.jsx` line 3393-3420 (`handleGuildReward`) & line 5169-5184:
  `handleGuildReward` only supports granting personal `ACHIEVEMENTS` (from `gameData.js`), not guild challenge redemptions, and has no option to revoke or reset achievements when in `rewardMode === 'deduct'`.
- In `src/hooks/useGameState.js` lines 463-505:
  Student clients poll every 3 seconds for `getStudentSubmissions(user.id)` and `getSubmissions(effectiveClassId)`. They NEVER poll or listen to `students/{studentId}`. Consequently, changes made by teachers (guild moves, exploit resets, reward grants) are never reflected in the active student session until page refresh, and subsequent student state syncs overwrite the teacher's edits in Firestore.

---

## 2. Logic Chain

1. **Premise (from Obs 1 & 2)**: `GuildPanel.jsx` initializes `claimedRewards` as `{}` and does not read `gameState.claimedGuildChallenges`.
   - *Inference*: Whenever a student refreshes the page or reopens the Guild HQ modal, all completed challenges appear unclaimed ("Claim Reward!" button is active).
2. **Premise (from Obs 2 & 3)**: When a student clicks "Claim Reward!", `GuildPanel.jsx` directly calls `backend.claimGuildChallengeReward` and completely bypasses `useGameState.js`.
   - *Inference*: In React memory, `useGameState.js` is unaware of the reward. The player's XP bar, level, and coin balance at the top of the screen (`PlayerStats`) do not update.
3. **Premise (from Obs 3)**: `useGameState.js` has an auto-sync effect (`useEffect`) that runs on every `gameState` mutation and calls `backend.updateStudent(user.id, gameState)`.
   - *Inference*: As soon as the student alters any local state (avatar, mystery box, activity submission), `useGameState.js` transmits its stale `gameState` (with old XP, old coins, and stale `claimedGuildChallenges`), overwriting Firestore and undoing the claimed reward.
4. **Premise (from Obs 4)**: Neither `GuildPanel.jsx` nor `claimGuildChallengeReward` implements atomic in-flight locking or transactional execution.
   - *Inference*: A student rapidly double-clicking the claim button can fire duplicate requests that pass the non-atomic check, potentially double-awarding XP and coins.
5. **Premise (from Obs 5)**: `useGameState.js` does not listen to or poll student document changes from Firestore.
   - *Inference*: When a teacher awards XP or resets an exploit in `TeacherPortal.jsx`, active student sessions remain desynchronized and will clobber the teacher's changes upon their next state sync.

---

## 3. Caveats

1. **Network Disconnection During Claim**: If a student claims a reward during an offline blip, an optimistic UI lock should gracefully revert if Firestore throws a network error, alerting the student to retry.
2. **Backward Compatibility**: Existing student documents in Firestore that lack `claimedGuildChallenges` must be handled defensively with fallback to `[]` across all readers (`getStudent`, `loadUserData`, `claimGuildChallengeReward`, and `getGuildLeaderboard`).
3. **Teacher Portal Scope**: While teachers can grant personal `ACHIEVEMENTS` to all members of a guild, `GUILD_CHALLENGES` are team-based objectives evaluated dynamically from guild members' submissions and streaks. Teacher controls should support resetting guild challenge redemptions (`resetChallenges: true`) alongside exploit XP resets.

---

## 4. Conclusion

The guild achievement redemption state synchronization bug is caused by a **broken architectural boundary**:
`GuildPanel.jsx` performs unmanaged, direct mutations against Firestore while maintaining isolated component state, while `useGameState.js` acts as an uncoordinated second writer that overwrites Firestore with stale data.

### Architectural Solution & Required Implementation Steps:

1. **Unify State Management in `useGameState.js`**:
   - Add `claimedGuildChallenges: []` to `getDefaultState()`.
   - In `loadUserData()`, ensure `claimedGuildChallenges` is always initialized from `studentData.claimedGuildChallenges || []`.
   - Implement and export a clean action in `useGameState.js`:
     `claimGuildReward(challengeId, rewardXp, rewardCoins)`
     - Verifies locally if `gameState.claimedGuildChallenges.includes(challengeId)`.
     - Calls `backend.claimGuildChallengeReward(...)`.
     - Immediately and immutably updates `gameState`:
       `xp += rewardXp`, `coins += rewardCoins`, `guildXpContributed += rewardXp`, and `claimedGuildChallenges = [...new Set([...prev.claimedGuildChallenges, challengeId])]`.
     - Runs `checkAndSetAchievements(updatedState)` and `checkLevelUp(prev, updatedState)` to trigger level-up dialogs and bonus coins immediately.
     - Returns `{ success: true }` or `{ alreadyClaimed: true }`.

2. **Wire Action Through `App.jsx` to `GuildPanel.jsx`**:
   - Pass `claimGuildReward` to `GuildPanel` as `onClaimGuildChallenge={claimGuildReward}`.

3. **Harden `GuildPanel.jsx`**:
   - Replace isolated `claimedRewards` check with:
     `const isClaimed = Boolean(claimedRewards[ch.id] || (Array.isArray(gameState?.claimedGuildChallenges) && gameState.claimedGuildChallenges.includes(ch.id)));`
   - Synchronize `gameState.claimedGuildChallenges` to `claimedRewards` on mount and update.
   - Introduce an in-flight claiming lock (`claimingIds` state and `inFlightClaimsRef` ref) to prevent duplicate button clicks.
   - When a claim is triggered, display a "Claiming..." state and disable the button.
   - If the action returns `alreadyClaimed: true` or `success: true`, lock the button permanently to `<Check /> Reward Claimed`.

4. **Harden Backend Persistence in `src/services/realBackend.js`**:
   - In `createStudent()`: explicitly include `claimedGuildChallenges: []`.
   - In `claimGuildChallengeReward()`: use atomic read-check-update logic or Firestore transaction semantics, returning `{ alreadyClaimed: true }` if already present, or updating `xp`, `coins`, `guildXpContributed`, and `claimedGuildChallenges` via `arrayUnion(challengeId)`.
   - In `resetGuildMembersXp()`: support an optional `{ resetChallenges = false }` flag so teachers can reset `claimedGuildChallenges: []` across all members of a guild.

5. **Enhance Teacher Controls in `src/components/TeacherPortal.jsx`**:
   - Provide a reset option in the Guild Standings / Exploit modal to clear claimed challenge statuses for the guild.
   - Ensure `onStudentsUpdated()` is triggered to update all cached rosters.

---

## 5. Verification Method

To independently verify these findings and validate the forthcoming implementation:

1. **Automated Unit & Regression Tests**:
   - Run the full test suite in the Linux VM:
     ```bash
     node tests/runAllTests.js
     ```
     Ensure all 7 existing suites pass with 0 failures.
   - Create and run a new test suite (e.g. `tests/guildRedemption.test.js`) verifying:
     - `claimedGuildChallenges` initialization and state immutability.
     - State calculation: XP, coins, guild XP, and level-up bonus cross-level calculation when claiming a guild challenge.
     - Duplicate claim rejection: verifying that calling claim on an already claimed challenge ID is rejected and does not mutate XP/coins.
     - Revocation / reset behavior across guild members.

2. **Production Bundle Verification**:
   - Execute production Vite build:
     ```bash
     node node_modules/vite/bin/vite.js build
     ```
     Must build cleanly with exit code 0 and zero compilation errors.

3. **Invalidation Conditions**:
   - If `claimedRewards` in `GuildPanel.jsx` remains decoupled from `gameState.claimedGuildChallenges`, the fix is invalid.
   - If claiming a challenge fails to immediately update the top player bar (`PlayerStats`) XP and coins without page refresh, the fix is invalid.
   - If multiple rapid clicks on the claim button fire multiple network requests or result in duplicate rewards, the fix is invalid.
