# Handoff Report: Guild Achievement & Challenge Redemption Reliability (Milestone 1 / R1)

## 1. Observation

Direct code inspections and empirical commands across the codebase revealed the following exact observations:

### Observation 1: `claimedGuildChallenges` Declaration and State Lifecycle
- **`src/hooks/useGameState.js` lines 15–45 (`getDefaultState`)**:
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
    avatar: { ... },
    ownedItems: ['default', 'none', 'happy'],
    dailyQuestCompleted: false,
    lastDailyQuestDate: null,
    mysteryBoxesOpened: 0,
    pendingMysteryBoxes: 0,
    doubleXpActive: false,
    totalActivitiesCompleted: 0,
    collaborationCount: 0,
    pathCompletions: {},
    lastActivityReset: null,
    highFivesSent: {},
  });
  ```
  `claimedGuildChallenges` is **not defined** anywhere in `getDefaultState()`.
- **`src/hooks/useGameState.js` lines 147–148 (`loadUserData`)**:
  ```javascript
  if (studentData) {
    const { id, classId, name, ...gameData } = studentData;
  ```
  If `studentData.claimedGuildChallenges` is absent or undefined in Firestore, `gameData.claimedGuildChallenges` evaluates to `undefined`. There is no default initialization (`claimedGuildChallenges: studentData.claimedGuildChallenges || []`).
- **`src/hooks/useGameState.js` lines 538–649 (exported actions)**:
  `useGameState` exports `joinGuild`, `openMysteryBox`, `buyAvatarItem`, `spendCoins`, `equipAvatarItem`, `setPlayerName`, `recordHighFive`, `submitActivity`, `submitBossChallenge`. It **does not export any function** for claiming guild challenges (`claimGuildChallenge` or similar).

### Observation 2: Component State Isolation and Lost Persistence in `GuildPanel.jsx`
- **`src/components/GuildPanel.jsx` line 48**:
  ```javascript
  const [claimedRewards, setClaimedRewards] = useState({});
  ```
  `claimedRewards` is declared strictly as local component state initialized to `{}`.
- **`src/components/GuildPanel.jsx` lines 70–101 (`loadGuildData` and `useEffect`)**:
  `loadGuildData()` fetches `backend.getGuildLeaderboard`, `backend.getGuildHall`, `backend.getStemShopItems`, and `backend.getStemPurchases`. It **never inspects** `gameState?.claimedGuildChallenges` or initializes `claimedRewards`.
- **`src/components/GuildPanel.jsx` line 1004**:
  ```javascript
  const isClaimed = claimedRewards[ch.id];
  ```
  `isClaimed` relies entirely on `claimedRewards[ch.id]`. When `GuildPanel` modal reopens, when the student navigates away, or when the page is reloaded, `claimedRewards` resets to `{}` and `isClaimed` reverts to `undefined` (falsy).

### Observation 3: Disconnected Reward Claiming and Stale State Write-back
- **`src/components/GuildPanel.jsx` lines 169–191 (`handleClaimReward`)**:
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
- **`src/App.jsx` lines 2351–2363**:
  ```javascript
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
- **`src/App.jsx` lines 2179–2191 (`refreshClassData`)**:
  ```javascript
  const refreshClassData = useCallback(() => {
    if (effectiveClassId) {
      backend.getClass(effectiveClassId).then(cls => {
        if (cls && cls.spotlight) {
          setClassSpotlight(cls.spotlight);
        }
      }).catch(e => console.error("Error loading class spotlight", e));

      backend.getActiveBoss(effectiveClassId, user?.organizationId).then(b => {
        if (b) setActiveBoss(b);
      }).catch(e => console.error("Error loading active boss", e));
    }
  }, [effectiveClassId, user?.organizationId]);
  ```
  `onStateUpdate` invokes `refreshClassData`, which only fetches `classSpotlight` and `activeBoss`. It **never updates** `gameState.xp`, `gameState.coins`, `gameState.guildXpContributed`, or `gameState.claimedGuildChallenges`.
- **`src/hooks/useGameState.js` lines 246–250 (Auto-Sync to Firestore)**:
  ```javascript
  // Sync state to "Backend" whenever it changes
  useEffect(() => {
    if (user && user.role === 'student' && dataLoaded) {
      backend.updateStudent(user.id, gameState);
    }
  }, [gameState, user, dataLoaded]);
  ```
  When `backend.claimGuildChallengeReward` writes updated XP, coins, and `claimedGuildChallenges` to Firestore, React's `gameState` still holds stale old XP and old coins. Any subsequent action that triggers `setGameState` (buying an avatar item, equipping an item, sending a high-five, or rolling a mystery box) causes `useEffect` to execute `backend.updateStudent(user.id, gameState)`, which overwrites Firestore with stale, lower XP and coins!

### Observation 4: Race Conditions and Incomplete Duplicate Claim Handling
- **`src/components/GuildPanel.jsx` lines 170 & 180–183**:
  1. No in-flight claim lock exists (no `claimingId` state or disabled button state while awaiting the Promise). Rapid clicking sends duplicate concurrent calls to `backend.claimGuildChallengeReward`.
  2. When `res.alreadyClaimed` is returned by the backend:
     `showToast('You have already claimed this guild reward!')` is displayed, but `setClaimedRewards(prev => ({ ...prev, [challenge.id]: true }))` is **skipped**. The button remains "Claim Reward!" instead of locking to "Reward Claimed".
- **`src/services/realBackend.js` lines 1573–1598 (`claimGuildChallengeReward`)**:
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
  return { success: true, rewardXp, rewardCoins };
  ```
  Returns only `{ success: true, rewardXp, rewardCoins }` (or `{ alreadyClaimed: true }`), omitting the updated student object or updated `claimedGuildChallenges` array.

### Observation 5: Teacher Guild Achievement Granting and Reset Desynchronization
- **`src/components/TeacherPortal.jsx` lines 3393–3420 (`handleGuildReward`)**:
  ```javascript
  const count = await backend.rewardGuild(classId, rewardGuild, rewardType, value);
  ```
- **`src/services/realBackend.js` lines 1658–1686 (`rewardGuild`)**:
  ```javascript
  for (const student of guildMembers) {
    const updates = {};
    if (rewardType === 'xp') {
      updates.xp = Math.max(0, (student.xp || 0) + rewardValue);
      updates.guildXpContributed = Math.max(0, (student.guildXpContributed || 0) + rewardValue);
    } else if (rewardType === 'coins') {
      updates.coins = Math.max(0, (student.coins || 0) + rewardValue);
    } else if (rewardType === 'achievement') {
      const current = student.unlockedAchievements || [];
      if (!current.includes(rewardValue)) {
        updates.unlockedAchievements = [...current, rewardValue];
      }
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "students", student.id), updates);
    }
  }
  ```
  Directly updates Firestore `students` records for all members.
- **`src/hooks/useGameState.js` lines 463–505 (`setInterval` polling loop)**:
  Online students only poll `backend.getStudentSubmissions` and `backend.getSubmissions`. The student's active browser **does not poll or subscribe** to `backend.getStudent(user.id)`.
  Consequently:
  1. An online student does not see achievements or XP granted by the teacher until a page reload.
  2. If the student makes any local state change, `backend.updateStudent(user.id, gameState)` writes the student's stale local `unlockedAchievements` back to Firestore, **silently deleting** the teacher's newly granted achievement.
- **`src/services/realBackend.js` lines 1689–1718 (`resetGuildMembersXp`)**:
  ```javascript
  async resetGuildMembersXp(classId, guildId, { resetTotalXp = false, resetSpiritFlame = false, xpDeduction = null } = {}) {
    ...
    for (const student of guildMembers) {
      const updates = {};
      if (xpDeduction != null) {
        updates.xp = Math.max(0, (student.xp || 0) - xpDeduction);
        updates.guildXpContributed = Math.max(0, (student.guildXpContributed || 0) - xpDeduction);
      } else {
        updates.guildXpContributed = 0;
        if (resetTotalXp) {
          updates.xp = 0;
        }
      }
      await updateDoc(doc(db, "students", student.id), updates);
    }
  ```
  `resetGuildMembersXp` clears `guildXpContributed` and optionally `xp`, but **does not touch `claimedGuildChallenges`**. Furthermore, because active students are not updated, their browser's subsequent write-back re-injects their old XP and guild XP.

---

## 2. Logic Chain

1. **Premise 1 (Missing Initialization)**: `getDefaultState()` in `useGameState.js` lacks `claimedGuildChallenges: []` (Observation 1). When a student loads the app, `gameState.claimedGuildChallenges` is either undefined or an unmanaged property.
2. **Premise 2 (Isolated UI State)**: `GuildPanel.jsx` stores claimed status in component-local `claimedRewards = useState({})` (Observation 2). Because this state is neither initialized from `gameState.claimedGuildChallenges` on mount nor updated via `useEffect`, every modal close/reopen or page reload starts with `claimedRewards = {}`.
3. **Premise 3 (Stale UI Buttons)**: Since `isClaimed = claimedRewards[ch.id]`, every challenge whose progress reached target appears with an active "Claim Reward!" button on every reopen or page reload, regardless of whether it was claimed previously (Observation 2).
4. **Premise 4 (State Desynchronization on Claim)**: When the user clicks "Claim Reward!", `handleClaimReward` directly calls `backend.claimGuildChallengeReward`, bypassing `useGameState.js` (Observation 3). The callback `onStateUpdate` only executes `refreshClassData` (which fetches spotlight/boss, not student data). Therefore, `gameState.xp`, `gameState.coins`, `gameState.guildXpContributed`, and `gameState.claimedGuildChallenges` in React memory remain completely unchanged. The student's XP bar, level, and coin counter in the top navigation do not update immediately.
5. **Premise 5 (Catastrophic Overwrite Loop)**: In `useGameState.js`, line 248 syncs `gameState` to Firestore whenever `gameState` changes. Since `gameState` never received the newly earned XP, coins, or claimed challenge ID, any subsequent action (avatar equip, high five, mystery box) writes the stale `gameState` to Firestore, overwriting and revoking the rewards granted by `claimGuildChallengeReward` in Firestore.
6. **Premise 6 (Race Conditions & Duplicate Claims)**: Because `handleClaimReward` lacks an in-flight claiming lock, rapid double-clicks send two concurrent requests to the backend (Observation 4). Furthermore, if the backend returns `alreadyClaimed: true`, `handleClaimReward` fails to update `claimedRewards[challenge.id] = true`, leaving the button in an unlocked "Claim Reward!" state.
7. **Premise 7 (Teacher Sync Destruction)**: In `TeacherPortal.jsx`, teacher achievement grants and exploit resets modify Firestore records across guild members (Observation 5). However, active student sessions do not poll or subscribe to student profile changes and continually push local `gameState` via `backend.updateStudent`, overwriting the teacher's updates in Firestore.

---

## 3. Caveats

- **No Caveats on Root Cause**: The root causes in `useGameState.js`, `GuildPanel.jsx`, `realBackend.js`, and `TeacherPortal.jsx` are verified by direct source review and line-by-line tracing.
- **Scope Boundary**: As Explorer 1, we performed read-only investigation and verification without modifying application source code.
- **Android Emulated Filesystem Build Detail**: On Android emulated storage (`/storage/emulated/10`), symlinks in `node_modules/.bin` are not supported by the underlying VFAT/sdcardfs filesystem. Direct invocation with Node (`node ./node_modules/vite/bin/vite.js build`) succeeds cleanly (transforming 1,617 modules into dist bundle in ~8s).

---

## 4. Conclusion & Step-by-Step Fix Strategy

### Root Cause Summary
1. `useGameState.js` does not declare `claimedGuildChallenges` in default state, has no `claimGuildChallenge` handler to update local state (XP, coins, guild XP, level up, achievements), and does not reconcile student profile updates from the backend.
2. `GuildPanel.jsx` relies on disconnected local state `claimedRewards = useState({})` that is never seeded from `gameState.claimedGuildChallenges`, lacks in-flight click protection, and does not lock buttons when backend reports `alreadyClaimed`.
3. `realBackend.js` returns minimal status without full state reflection and does not allow resetting `claimedGuildChallenges` during guild exploit/challenge resets.
4. `TeacherPortal.jsx` updates Firestore across guild members, but active student sessions overwrite these updates due to uncontrolled full-object state synchronization in `useGameState.js`.

### Recommended Step-by-Step Fix Strategy

#### Step 1: Update `src/hooks/useGameState.js`
1. **Initialize `claimedGuildChallenges` in `getDefaultState()`**:
   Add `claimedGuildChallenges: []` to `getDefaultState()`.
2. **Safely load in `loadUserData()`**:
   Ensure `gameData.claimedGuildChallenges = Array.isArray(studentData.claimedGuildChallenges) ? studentData.claimedGuildChallenges : [];`.
3. **Implement and export `claimGuildChallenge(challenge)`**:
   ```javascript
   const claimGuildChallenge = useCallback(async (challenge) => {
     if (!challenge?.id || !user?.id) return { alreadyClaimed: true };

     // Client-side duplicate guard
     const currentClaimed = gameState.claimedGuildChallenges || [];
     if (currentClaimed.includes(challenge.id)) {
       return { alreadyClaimed: true };
     }

     const rewardXp = Number(challenge.reward) || 100;
     const rewardCoins = Number(challenge.coinReward) || 50;

     const res = await backend.claimGuildChallengeReward(
       effectiveClassId,
       user.id,
       gameState.guild,
       challenge.id,
       rewardXp,
       rewardCoins
     );

     if (res?.alreadyClaimed) {
       // Ensure local state locks to claimed
       setGameState(prev => ({
         ...prev,
         claimedGuildChallenges: Array.from(new Set([...(prev.claimedGuildChallenges || []), challenge.id]))
       }));
       return { alreadyClaimed: true };
     }

     if (res?.success) {
       setGameState(prev => {
         const oldClaimed = prev.claimedGuildChallenges || [];
         if (oldClaimed.includes(challenge.id)) return prev;

         const oldXp = prev.xp || 0;
         const newXp = oldXp + rewardXp;
         const newCoins = (prev.coins || 0) + rewardCoins;
         const newGuildXp = (prev.guildXpContributed || 0) + (prev.guild ? rewardXp : 0);

         let updatedState = {
           ...prev,
           xp: newXp,
           coins: newCoins,
           guildXpContributed: newGuildXp,
           claimedGuildChallenges: [...oldClaimed, challenge.id]
         };

         // Trigger level progression celebration and bonus coins
         checkLevelUp(prev, updatedState);
         // Check achievements (e.g., guild XP contributor milestones)
         checkAndSetAchievements(updatedState);

         return updatedState;
       });
       return { success: true, rewardXp, rewardCoins };
     }
     return res;
   }, [user, effectiveClassId, gameState.claimedGuildChallenges, gameState.guild, checkLevelUp, checkAndSetAchievements]);
   ```
4. **Reconcile Student Profile in Polling Loop**:
   In the 3-second polling interval (line 465), also fetch the student's fresh profile:
   ```javascript
   const freshStudent = await backend.getStudent(user.id);
   if (freshStudent) {
     setGameState(prev => {
       // Merge server-granted achievements and server-reset metrics
       const serverAchievements = freshStudent.unlockedAchievements || [];
       const serverClaimed = freshStudent.claimedGuildChallenges || [];
       const mergedAchievements = Array.from(new Set([...(prev.unlockedAchievements || []), ...serverAchievements]));
       const mergedClaimed = Array.from(new Set([...(prev.claimedGuildChallenges || []), ...serverClaimed]));

       // If teacher adjusted XP or reset exploit XP on server
       const serverXp = freshStudent.xp !== undefined ? freshStudent.xp : prev.xp;
       const serverGuildXp = freshStudent.guildXpContributed !== undefined ? freshStudent.guildXpContributed : prev.guildXpContributed;

       return {
         ...prev,
         xp: Math.max(prev.xp, serverXp),
         guildXpContributed: Math.max(prev.guildXpContributed, serverGuildXp),
         unlockedAchievements: mergedAchievements,
         claimedGuildChallenges: mergedClaimed
       };
     });
   }
   ```
5. Export `claimGuildChallenge` in `useGameState`'s return object.

#### Step 2: Update `src/components/GuildPanel.jsx`
1. **Accept `onClaimGuildChallenge` prop**:
   Receive `onClaimGuildChallenge` in props.
2. **Synchronize `claimedRewards` with `gameState.claimedGuildChallenges`**:
   ```javascript
   const [claimedRewards, setClaimedRewards] = useState(() => {
     const initial = {};
     (gameState?.claimedGuildChallenges || []).forEach(id => {
       initial[id] = true;
     });
     return initial;
   });

   useEffect(() => {
     if (Array.isArray(gameState?.claimedGuildChallenges)) {
       setClaimedRewards(prev => {
         const next = { ...prev };
         gameState.claimedGuildChallenges.forEach(id => {
           next[id] = true;
         });
         return next;
       });
     }
   }, [gameState?.claimedGuildChallenges]);
   ```
3. **Add In-Flight Claiming Lock**:
   ```javascript
   const [claimingChallengeId, setClaimingChallengeId] = useState(null);
   ```
4. **Update `handleClaimReward`**:
   ```javascript
   const handleClaimReward = async (challenge) => {
     if (!challenge?.id) return;
     if (claimedRewards[challenge.id] || (gameState?.claimedGuildChallenges || []).includes(challenge.id)) return;
     if (claimingChallengeId === challenge.id) return;

     setClaimingChallengeId(challenge.id);
     try {
       let res;
       if (onClaimGuildChallenge) {
         res = await onClaimGuildChallenge(challenge);
       } else {
         res = await backend.claimGuildChallengeReward(
           classId,
           gameState?.id,
           currentGuild,
           challenge.id,
           challenge.reward,
           challenge.coinReward
         );
       }

       if (res?.alreadyClaimed) {
         setClaimedRewards(prev => ({ ...prev, [challenge.id]: true }));
         showToast('You have already claimed this guild reward!');
       } else if (res?.success) {
         setClaimedRewards(prev => ({ ...prev, [challenge.id]: true }));
         showToast(`🎉 Claimed +${challenge.reward} XP and +${challenge.coinReward} Coins for completing "${challenge.title}"!`);
         if (onStateUpdate) onStateUpdate();
         loadGuildData();
       }
     } catch (e) {
       alert('Error claiming reward: ' + e.message);
     } finally {
       setClaimingChallengeId(null);
     }
   };
   ```
5. **Update Challenge Item Rendering (line 1004 & 1037)**:
   ```javascript
   const isClaimed = Boolean(claimedRewards[ch.id] || (gameState?.claimedGuildChallenges || []).includes(ch.id));
   const isClaiming = claimingChallengeId === ch.id;
   ```
   Button is disabled when `isClaiming` is true; once claimed, renders `<Check className="w-4 h-4" /> Reward Claimed`.

#### Step 3: Update `src/services/realBackend.js`
1. **Harden `claimGuildChallengeReward`**:
   - Ensure `claimedGuildChallenges` array deduplication.
   - Return `{ success: true, rewardXp, rewardCoins, xp: newXp, coins: newCoins, guildXpContributed: newGuildXp, claimedGuildChallenges: updatedClaimed }`.
   - If already claimed, return `{ alreadyClaimed: true, claimedGuildChallenges: claimed }`.
2. **Support Challenge Reset in `resetGuildMembersXp`**:
   - Add `{ resetChallenges = false }` option to clear `claimedGuildChallenges: []` for all guild members when desired.
3. **Support Achievement Revocation/Reset in `rewardGuild`**:
   - When `rewardMode === 'deduct'` and `rewardType === 'achievement'`, filter out `rewardValue` from `unlockedAchievements`.

#### Step 4: Update `src/components/TeacherPortal.jsx`
1. In `handleGuildReward`, support both granting and revoking achievements for guild members.
2. In `handleResetGuildExploit`, include an option to reset guild challenge completion state (`resetChallenges: true`).
3. Reload students list after reward operations so the teacher view immediately reflects updated achievement and trophy counts.

#### Step 5: Update `src/App.jsx`
Pass `onClaimGuildChallenge={claimGuildChallenge}` to `<GuildPanel ... />` at line 2351.

---

## 5. Verification Method

### Automated Test Verification
Run the consolidated regression test runner from the workspace root:
```bash
node tests/runAllTests.js
```
Expected output: All 7 suites pass with 0 failures.

### Build Verification
Run the production build:
```bash
node ./node_modules/vite/bin/vite.js build
```
Expected output:
- `✓ built in ~8s`
- Zero syntax or bundling errors.

### Direct Inspection Checks
1. `useGameState.js`: Verify `claimedGuildChallenges: []` exists in `getDefaultState()`, `claimGuildChallenge` is exported, and `loadUserData` maps `claimedGuildChallenges`.
2. `GuildPanel.jsx`: Verify `useState(() => initialClaimed)` seeds from `gameState?.claimedGuildChallenges`, `useEffect` syncs updates, and button locks permanently across modal reopens.
3. `realBackend.js`: Verify `claimGuildChallengeReward` safely handles existing and new claim arrays, and returns updated state metrics.
