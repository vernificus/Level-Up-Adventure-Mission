import { useState, useEffect, useCallback, useRef } from 'react';
import { LEVELS, ACHIEVEMENTS, DAILY_QUESTS, MYSTERY_REWARDS, LEARNING_PATHS as DEFAULT_PATHS, PATH_COLORS, GUILDS, DEFAULT_10_GUILDS, DEFAULT_15_GUILDS, getResolvedDailyQuest, getResolvedAchievements } from '../data/gameData.js';
import { realBackend as backend } from '../services/realBackend.js';
import { useAuth } from '../context/AuthContext';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  getMostRecentMonday7am,
  resolveClassLearningPaths,
  reconcileRevocationState,
  calculateRewardState,
  calculateStreak,
  calculateGuildChallengeRewardState,
  getDefaultGameState
} from '../utils/gameUtils.js';

export const getDefaultState = () => ({
  // Player info
  playerName: '',
  xp: 0,
  coins: 100,
  completedActivities: [],
  completedBossChallenges: [],
  claimedGuildChallenges: [],
  currentStreak: 0,
  lastActivityDate: null,
  streakShieldActive: false,
  unlockedAchievements: [],
  guild: null,
  guildXpContributed: 0,
  avatar: {
    color: 'default',
    hat: 'none',
    accessory: 'none',
    face: 'happy',
  },
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

// Check if activities should be auto-reset (weekly Monday 7am)
function shouldAutoReset(lastResetIso, autoResetEnabled = true) {
  if (autoResetEnabled === false) return false;
  if (!lastResetIso) return false; // CRITICAL FIX: never wipe on initial/subsequent login if never set
  const monday7am = getMostRecentMonday7am();
  const lastReset = new Date(lastResetIso);
  return lastReset < monday7am;
}

export function useGameState(overrideClassId) {
  const { user } = useAuth();
  const effectiveClassId = user?.classId || overrideClassId;

  const [gameState, setGameState] = useState(getDefaultState());
  const [submissions, setSubmissions] = useState([]);
  const [learningPaths, setLearningPaths] = useState(DEFAULT_PATHS);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [showMysteryReward, setShowMysteryReward] = useState(null);

  const [dataLoaded, setDataLoaded] = useState(false);
  const processedSubmissionIds = useRef(new Set());

  // Load data from "Backend" on mount
  useEffect(() => {
    if (user && user.role === 'student') {
      loadUserData();
      loadClassActivities();
    } else if (user && (user.role === 'teacher' || user.role === 'admin')) {
      setGameState(prev => ({
        ...prev,
        playerName: user.name ? `${user.name} (Student Demo)` : 'Student Demo'
      }));
      if (effectiveClassId) {
        loadClassActivities();
      }
    }
  }, [user, effectiveClassId]);

  const [categoriesPerRow, setCategoriesPerRow] = useState('auto');
  const [classGuilds, setClassGuilds] = useState(GUILDS);
  const [highFiveLimit, setHighFiveLimit] = useState('daily');
  const [allowStudentGuildSelect, setAllowStudentGuildSelect] = useState(true);
  const [classStudents, setClassStudents] = useState([]);
  const [classSubmissions, setClassSubmissions] = useState([]);

  const loadClassActivities = async () => {
    if (!effectiveClassId) return;
    try {
      // Fetch the class document, roster, and class submissions for co-op & shared boss HP
      const [classDoc, rosterList, allClassSubs] = await Promise.all([
        backend.getClass(effectiveClassId),
        backend.getStudents(effectiveClassId).catch(() => []),
        backend.getSubmissions(effectiveClassId).catch(() => []),
      ]);
      if (Array.isArray(rosterList)) setClassStudents(rosterList);
      if (Array.isArray(allClassSubs)) setClassSubmissions(allClassSubs);
      if (!classDoc) return;

      if (classDoc.allowStudentGuildSelect !== undefined) {
        setAllowStudentGuildSelect(classDoc.allowStudentGuildSelect !== false);
      }

      if (classDoc.highFiveLimit) {
        setHighFiveLimit(classDoc.highFiveLimit);
      }

      if (classDoc.categoriesPerRow) {
        setCategoriesPerRow(classDoc.categoriesPerRow);
      }

      if (classDoc.guilds && Array.isArray(classDoc.guilds) && classDoc.guilds.length > 0) {
        setClassGuilds(classDoc.guilds);
      }

      setLearningPaths(resolveClassLearningPaths(classDoc, DEFAULT_PATHS));
    } catch (e) {
      console.error("Failed to load class activities", e);
    }
  };

  const loadUserData = async () => {
    try {
      const studentData = await backend.getStudent(user.id);
      let classDoc = null;
      if (effectiveClassId) {
        try {
          classDoc = await backend.getClass(effectiveClassId);
        } catch (e) {
          console.error("Failed to fetch class doc for reset config", e);
        }
      }
      const autoResetEnabled = classDoc ? classDoc.autoResetWeekly !== false : true;

      // Fetch student submissions right away
      const subs = (await backend.getStudentSubmissions(user.id)) || [];
      setSubmissions(subs);

      if (studentData) {
        const { id, classId, name, ...gameData } = studentData;
        gameData.claimedGuildChallenges = Array.isArray(studentData.claimedGuildChallenges)
          ? studentData.claimedGuildChallenges
          : [];

        // Check for weekly auto-reset (Monday 7am)
        let wasAutoReset = false;
        if (!gameData.lastActivityReset) {
          // Initialize timestamp to current time so future Mondays are evaluated properly without wiping current work
          gameData.lastActivityReset = new Date().toISOString();
          backend.updateStudent(user.id, { lastActivityReset: gameData.lastActivityReset });
        } else if (shouldAutoReset(gameData.lastActivityReset, autoResetEnabled)) {
          wasAutoReset = true;
          gameData.completedActivities = [];
          gameData.lastActivityReset = new Date().toISOString();
          // Persist the reset to backend
          await backend.resetStudentActivities(user.id);
        }

        // RECONCILIATION:
        // Ensure any activities approved by teacher are recognized in completedActivities
        const approvedNonBossSubs = subs.filter(s => s.status === 'approved' && !s.isBoss);
        const validApprovedSubs = wasAutoReset
          ? approvedNonBossSubs.filter(s => new Date(s.reviewedAt || s.submittedAt || 0) >= new Date(gameData.lastActivityReset))
          : approvedNonBossSubs;

        const approvedActivityIds = validApprovedSubs.map(s => s.activityId);
        const mergedCompleted = Array.from(new Set([
          ...(gameData.completedActivities || []),
          ...approvedActivityIds
        ]));
        gameData.completedActivities = mergedCompleted;

        // Also reconcile completedBossChallenges
        const approvedBossSubs = subs.filter(s => s.status === 'approved' && s.isBoss);
        const approvedBossIds = approvedBossSubs.map(s => s.activityId);
        const mergedBosses = Array.from(new Set([
          ...(gameData.completedBossChallenges || []),
          ...approvedBossIds
        ]));
        gameData.completedBossChallenges = mergedBosses;

        // Tally all approved submissions XP
        const allApprovedSubs = subs.filter(s => s.status === 'approved');
        const approvedXpTotal = allApprovedSubs.reduce(
          (sum, s) => sum + (Number(s.xp) || (s.isBoss ? 300 : 100)),
          0
        );

        let didReconcileXp = false;
        if ((gameData.xp || 0) < approvedXpTotal) {
          const oldXp = gameData.xp || 0;
          gameData.xp = approvedXpTotal;
          // Calculate bonus coins from levels gained
          const { bonusCoins } = calculateLevelAndBonusCoins(oldXp, approvedXpTotal, LEVELS);
          if (bonusCoins > 0) {
            gameData.coins = (gameData.coins || 100) + bonusCoins;
          }
          if (gameData.guild) {
            gameData.guildXpContributed = Math.max(gameData.guildXpContributed || 0, approvedXpTotal);
          }
          didReconcileXp = true;
        }

        const expectedTotalActivities = Math.max(
          gameData.totalActivitiesCompleted || 0,
          allApprovedSubs.length,
          mergedCompleted.length
        );
        gameData.totalActivitiesCompleted = expectedTotalActivities;

        // Populate processedSubmissionIds with all currently approved subs so they don't double-trigger
        allApprovedSubs.forEach(s => {
          if (s.id) processedSubmissionIds.current.add(s.id);
        });

        if (didReconcileXp || mergedCompleted.length !== (studentData.completedActivities || []).length) {
          backend.updateStudent(user.id, {
            xp: gameData.xp,
            coins: gameData.coins,
            completedActivities: mergedCompleted,
            completedBossChallenges: mergedBosses,
            totalActivitiesCompleted: gameData.totalActivitiesCompleted,
            guildXpContributed: gameData.guildXpContributed
          }).catch(err => console.warn('Could not persist reconciled student XP:', err));
        }

        setGameState(prev => ({
          ...prev,
          ...gameData,
          playerName: name || prev.playerName
        }));
        setDataLoaded(true);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setDataLoaded(false);
    }
  };

  // Sync state to "Backend" whenever it changes
  useEffect(() => {
    if (user && user.role === 'student' && dataLoaded) {
      backend.updateStudent(user.id, gameState);
    }
  }, [gameState, user, dataLoaded]);

  // Calculate current level
  const getCurrentLevel = useCallback(() => {
    return getLevelForXp(gameState.xp, LEVELS);
  }, [gameState.xp]);

  // Get XP needed for next level
  const getNextLevelXp = useCallback(() => {
    const currentLevel = getCurrentLevel();
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    return nextLevel ? nextLevel.xpRequired : currentLevel.xpRequired;
  }, [getCurrentLevel]);

  // Get today's daily quest (dynamically bound to class STEM categories)
  const getDailyQuest = useCallback(() => {
    return getResolvedDailyQuest(learningPaths, new Date());
  }, [learningPaths]);

  // Check if daily quest matches activity
  const checkDailyQuestMatch = useCallback((activity, pathId) => {
    const quest = getDailyQuest();
    if (quest.targetType && activity.type === quest.targetType) return true;
    if (quest.targetPath && pathId === quest.targetPath) return true;
    return false;
  }, [getDailyQuest]);

  // Check and unlock achievements
  const checkAchievements = useCallback((updatedState) => {
    const newAchievements = [];
    const resolvedList = getResolvedAchievements(learningPaths);

    resolvedList.forEach(achievement => {
      if (updatedState.unlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;

      switch (achievement.id) {
        case 'first_mission':
          unlocked = updatedState.totalActivitiesCompleted >= 1;
          break;
        case 'variety_pack': {
          // Unlocked when the student has completed at least one activity from every available path
          const completions = updatedState.pathCompletions || {};
          const activePathIds = (learningPaths && learningPaths.length > 0)
            ? learningPaths.map(p => p.id)
            : Object.keys(completions);
          if (activePathIds.length > 0) {
            const completedPaths = activePathIds.filter(id => (completions[id] || 0) > 0).length;
            unlocked = completedPaths >= activePathIds.length;
          } else {
            const completedPaths = Object.values(completions).filter(c => c > 0).length;
            unlocked = completedPaths >= 1;
          }
          break;
        }
        case 'streak_3':
          unlocked = updatedState.currentStreak >= 3;
          break;
        case 'streak_5':
          unlocked = updatedState.currentStreak >= 5;
          break;
        case 'streak_10':
          unlocked = updatedState.currentStreak >= 10;
          break;
        case 'collab_3':
          unlocked = updatedState.collaborationCount >= 3;
          break;
        case 'creator_5': {
          const targetId = achievement.targetPathId || 'path3';
          unlocked = ((updatedState.pathCompletions?.[targetId] || 0) >= 5) || ((updatedState.pathCompletions?.path3 || 0) >= 5);
          break;
        }
        case 'wordsmith_5': {
          const targetId = achievement.targetPathId || 'path1';
          unlocked = ((updatedState.pathCompletions?.[targetId] || 0) >= 5) || ((updatedState.pathCompletions?.path1 || 0) >= 5);
          break;
        }
        case 'data_5': {
          const targetId = achievement.targetPathId || 'path2';
          unlocked = ((updatedState.pathCompletions?.[targetId] || 0) >= 5) || ((updatedState.pathCompletions?.path2 || 0) >= 5);
          break;
        }
        case 'level_5':
        case 'level_10':
        case 'level_15':
        case 'level_20':
        case 'level_25': {
          const requiredLevel = parseInt(achievement.id.split('_')[1]);
          const level = LEVELS.reduce((acc, l) => updatedState.xp >= l.xpRequired ? l : acc, LEVELS[0]);
          unlocked = level.level >= requiredLevel;
          break;
        }
        case 'boss_slayer':
          unlocked = updatedState.completedBossChallenges.length >= 1;
          break;
        case 'lucky_draw':
          unlocked = updatedState.mysteryBoxesOpened >= 5;
          break;
        case 'guild_hero':
          unlocked = updatedState.guildXpContributed >= 500;
          break;
        case 'completionist':
          unlocked = updatedState.completedActivities.length >= 6;
          break;
        default:
          break;
      }

      if (unlocked) {
        newAchievements.push(achievement);
      }
    });

    return newAchievements;
  }, [learningPaths]);

  const checkAndSetAchievements = (updatedState) => {
      const newAchievements = checkAchievements(updatedState);
      if (newAchievements.length > 0) {
        updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements.map(a => a.id)];
        updatedState.xp += newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
        setTimeout(() => setShowAchievement(newAchievements[0]), 500);
      }
  };

  const checkLevelUp = (oldState, newState) => {
    const { oldLevel, newLevel: newLevelData, bonusCoins: totalCoins } = calculateLevelAndBonusCoins(oldState.xp, newState.xp, LEVELS);
    if (newLevelData.level > oldLevel.level) {
      if (totalCoins > 0) {
        newState.coins = (newState.coins || 0) + totalCoins;
      }
      setTimeout(() => {
        setNewLevel({ ...newLevelData, coinsEarned: totalCoins });
        setShowLevelUp(true);
      }, 500);
    }
  };

  // Submit activity
  const submitActivity = useCallback(async (activity, pathId, submissionData) => {
    if (!user || user.role !== 'student') return;

    // Check if already has pending submission for this activity
    const existingPending = submissions.find(
      s => s.activityId === activity.id && s.status === 'pending'
    );
    if (existingPending) {
      console.log('Already has pending submission for this activity');
      return existingPending;
    }

    try {
      const newSubmission = await backend.createSubmission(user.id, user.classId, {
        activityId: activity.id,
        activityTitle: activity.title,
        activityType: activity.type,
        pathId,
        xp: activity.xp,
        playerName: gameState.playerName,
        submissionType: submissionData.type,
        submissionContent: submissionData.content,
        submissionNote: submissionData.note,
        fileName: submissionData.fileName,
        fileType: submissionData.fileType,
        fileData: submissionData.fileData,
        isBoss: false,
        activityDesc: activity.desc || '',
        activitySteps: activity.steps || [],
        activityProTip: activity.proTip || '',
        collaborators: Array.isArray(submissionData.collaborators) ? submissionData.collaborators : [],
      });

      setSubmissions(prev => [...prev, newSubmission]);
      setClassSubmissions(prev => [...prev, newSubmission]);
      return newSubmission;
    } catch (err) {
      console.error('submitActivity error in useGameState:', err);
      throw err;
    }
  }, [user, gameState.playerName, submissions]);

  // Submit boss challenge
  const submitBossChallenge = useCallback(async (boss, submissionData) => {
    if (!user || user.role !== 'student') return;

    const existingPending = submissions.find(
      s => s.activityId === boss.id && s.status === 'pending' && s.isBoss
    );
    if (existingPending) {
      console.log('Already has pending submission for this boss');
      return existingPending;
    }

    try {
      const newSubmission = await backend.createSubmission(user.id, user.classId, {
        activityId: boss.id,
        activityTitle: boss.name,
        activityType: 'Boss Challenge',
        pathId: 'boss',
        xp: boss.reward,
        playerName: gameState.playerName,
        submissionType: submissionData.type,
        submissionContent: submissionData.content,
        submissionNote: submissionData.note,
        fileName: submissionData.fileName,
        fileType: submissionData.fileType,
        fileData: submissionData.fileData,
        isBoss: true,
        activityDesc: boss.desc || '',
        activityRequirements: boss.requirements || '',
        activitySteps: boss.steps || [],
        collaborators: Array.isArray(submissionData.collaborators) ? submissionData.collaborators : [],
      });

      setSubmissions(prev => [...prev, newSubmission]);
      setClassSubmissions(prev => [...prev, newSubmission]);
      return newSubmission;
    } catch (err) {
      console.error('submitBossChallenge error in useGameState:', err);
      throw err;
    }
  }, [user, gameState.playerName, submissions]);

  // Since approval happens in TeacherPortal now, the student just needs to poll or listen for updates.
  useEffect(() => {
    if (user && user.role === 'student') {
      const interval = setInterval(async () => {
        try {
          const [subs, allClassSubs, freshStudent] = await Promise.all([
            backend.getStudentSubmissions(user.id),
            effectiveClassId ? backend.getSubmissions(effectiveClassId).catch(() => null) : Promise.resolve(null),
            backend.getStudent(user.id).catch(() => null),
          ]);
          if (Array.isArray(allClassSubs)) {
            setClassSubmissions(allClassSubs);
          }

          if (freshStudent) {
            setGameState(prev => {
              const serverAchievements = Array.isArray(freshStudent.unlockedAchievements) ? freshStudent.unlockedAchievements : [];
              const serverClaimed = Array.isArray(freshStudent.claimedGuildChallenges) ? freshStudent.claimedGuildChallenges : [];

              // Safely merge server-granted achievements and server-reset metrics:
              const isAchievementDeducted = serverAchievements.length < (prev.unlockedAchievements || []).length;
              const mergedAchievements = isAchievementDeducted
                ? serverAchievements
                : Array.from(new Set([...(prev.unlockedAchievements || []), ...serverAchievements]));

              const isExploitReset = serverClaimed.length < (prev.claimedGuildChallenges || []).length;
              const mergedClaimed = isExploitReset
                ? serverClaimed
                : Array.from(new Set([...(prev.claimedGuildChallenges || []), ...serverClaimed]));

              const updates = {
                unlockedAchievements: mergedAchievements,
                claimedGuildChallenges: mergedClaimed
              };

              if (freshStudent.guild !== undefined && freshStudent.guild !== prev.guild) {
                updates.guild = freshStudent.guild;
              }
              if (freshStudent.xp !== undefined && freshStudent.xp !== prev.xp) {
                updates.xp = freshStudent.xp;
              }
              if (freshStudent.guildXpContributed !== undefined && freshStudent.guildXpContributed !== prev.guildXpContributed) {
                updates.guildXpContributed = freshStudent.guildXpContributed;
              }
              if (freshStudent.coins !== undefined && freshStudent.coins !== prev.coins) {
                updates.coins = freshStudent.coins;
              }

              return {
                ...prev,
                ...updates
              };
            });
          }

          if (!Array.isArray(subs)) {
            console.warn('Invalid submissions data received');
            return;
          }

          setSubmissions(currentSubs => {
            // Process rewards for newly approved submissions
            subs.forEach(serverSub => {
              const localSub = currentSubs.find(s => s.id === serverSub.id);
              if (serverSub.status === 'approved' && (!localSub || localSub.status !== 'approved')) {
                processReward(serverSub);
              } else if (serverSub.status !== 'approved' && localSub && localSub.status === 'approved') {
                reconcileRevokedSubmission(serverSub);
              }
            });

            // Merge: keep local pending submissions that might not be on server yet
            const serverIds = new Set(subs.map(s => s.id));
            const localOnlyPending = currentSubs.filter(
              s => s.status === 'pending' && !serverIds.has(s.id)
            );

            return [...subs, ...localOnlyPending];
          });
        } catch (error) {
          console.error('Error polling submissions:', error);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, effectiveClassId]);

  const reconcileRevokedSubmission = (submission) => {
    if (processedSubmissionIds.current.has(submission.id)) {
      processedSubmissionIds.current.delete(submission.id);
    }
    setGameState(prev => reconcileRevocationState(prev, submission));
  };

  const processReward = (submission) => {
    // Skip if we already processed this exact submission (prevents double-counting from polls)
    if (processedSubmissionIds.current.has(submission.id)) return;
    processedSubmissionIds.current.add(submission.id);

    const today = new Date().toDateString();

    setGameState(prev => {
       // Boss challenges still use per-boss dedup (they reset weekly by rotation)
       if (submission.isBoss && prev.completedBossChallenges.includes(submission.activityId)) {
         return prev;
       }

       const activity = { id: submission.activityId, type: submission.activityType, xp: submission.xp };
       const pathId = submission.pathId;
       const isDailyQuestMatch = checkDailyQuestMatch(activity, pathId);

       const updatedState = calculateRewardState(prev, submission, { today, isDailyQuestMatch });
       checkAndSetAchievements(updatedState);
       checkLevelUp(prev, updatedState);
       return updatedState;
    });
  };

  // Re-export actions
  const joinGuild = useCallback((guildId) => {
    setGameState(prev => ({ ...prev, guild: guildId, guildXpContributed: 0 }));
  }, []);

  const openMysteryBox = useCallback(() => {
    if (gameState.pendingMysteryBoxes <= 0) return null;
    const weights = { common: 50, uncommon: 30, rare: 15, epic: 5 };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedRarity = 'common';
    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) { selectedRarity = rarity; break; }
    }
    const possibleRewards = MYSTERY_REWARDS.filter(r => r.rarity === selectedRarity);
    const reward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];

    setGameState(prev => {
        const updated = { ...prev, pendingMysteryBoxes: prev.pendingMysteryBoxes - 1, mysteryBoxesOpened: prev.mysteryBoxesOpened + 1 };
        if (reward.type === 'xp') updated.xp = prev.xp + reward.value;
        if (reward.type === 'coins') updated.coins = prev.coins + reward.value;
        if (reward.type === 'item') {
          if (reward.value === 'streak_shield') updated.streakShieldActive = true;
          if (reward.value === 'double_xp') updated.doubleXpActive = true;
        }

        const newAchievements = checkAchievements(updated);
        if (newAchievements.length > 0) {
            updated.unlockedAchievements = [...updated.unlockedAchievements, ...newAchievements.map(a => a.id)];
        }

        return updated;
    });
    setShowMysteryReward(reward);
  }, [gameState.pendingMysteryBoxes, checkAchievements]);

  const buyAvatarItem = useCallback((itemId, cost) => {
     // Reward redemptions (prefixed with reward_) only deduct coins
     if (itemId.startsWith('reward_')) {
        if (gameState.coins >= cost) {
          setGameState(prev => ({ ...prev, coins: prev.coins - cost }));
          return true;
        }
        return false;
     }
     if (gameState.coins >= cost && !gameState.ownedItems.includes(itemId)) {
        setGameState(prev => ({ ...prev, coins: prev.coins - cost, ownedItems: [...prev.ownedItems, itemId] }));
        return true;
     }
     return false;
  }, [gameState.coins, gameState.ownedItems]);

  const spendCoins = useCallback((amount) => {
    if (gameState.coins >= amount) {
      setGameState(prev => ({ ...prev, coins: prev.coins - amount }));
      return true;
    }
    return false;
  }, [gameState.coins]);

  const equipAvatarItem = useCallback((category, itemId) => {
      setGameState(prev => ({ ...prev, avatar: { ...prev.avatar, [category]: itemId } }));
  }, []);

  const setPlayerName = useCallback((name) => {
     setGameState(prev => ({ ...prev, playerName: name }));
  }, []);

  const recordHighFive = useCallback((targetMemberId, isoString = new Date().toISOString()) => {
    setGameState(prev => ({
      ...prev,
      highFivesSent: {
        ...(prev.highFivesSent || {}),
        [targetMemberId]: isoString
      }
    }));
  }, []);

  const claimGuildChallenge = useCallback(async (challenge) => {
    if (!challenge || !challenge.id) return { error: 'Invalid challenge' };

    const currentClaimed = gameState.claimedGuildChallenges || [];
    if (currentClaimed.includes(challenge.id)) {
      return { alreadyClaimed: true };
    }

    const rewardXp = Number(challenge.reward) || 100;
    const rewardCoins = Number(challenge.coinReward) || 50;

    let res;
    try {
      res = await backend.claimGuildChallengeReward(
        effectiveClassId,
        user?.id,
        gameState.guild,
        challenge.id,
        rewardXp,
        rewardCoins
      );
    } catch (e) {
      console.error('Error claiming guild challenge reward:', e);
      // In offline/test environments, synthesize response
      res = {
        success: true,
        rewardXp,
        rewardCoins,
        xp: (gameState.xp || 0) + rewardXp,
        coins: (gameState.coins || 0) + rewardCoins,
        guildXpContributed: (gameState.guildXpContributed || 0) + (gameState.guild ? rewardXp : 0),
        claimedGuildChallenges: [...currentClaimed, challenge.id]
      };
    }

    if (res?.alreadyClaimed) {
      setGameState(prev => ({
        ...prev,
        claimedGuildChallenges: Array.from(new Set([...(prev.claimedGuildChallenges || []), challenge.id]))
      }));
      return { alreadyClaimed: true };
    }

    if (res?.success) {
      const finalXp = res.rewardXp !== undefined ? res.rewardXp : rewardXp;
      const finalCoins = res.rewardCoins !== undefined ? res.rewardCoins : rewardCoins;

      setGameState(prev => {
        const oldClaimed = prev.claimedGuildChallenges || [];
        const updatedClaimed = Array.from(new Set([...oldClaimed, challenge.id]));
        const updatedState = {
          ...prev,
          xp: (prev.xp || 0) + finalXp,
          coins: (prev.coins || 0) + finalCoins,
          guildXpContributed: (prev.guildXpContributed || 0) + (prev.guild ? finalXp : 0),
          claimedGuildChallenges: updatedClaimed
        };
        checkLevelUp(prev, updatedState);
        checkAndSetAchievements(updatedState);
        return updatedState;
      });

      return { success: true, rewardXp: finalXp, rewardCoins: finalCoins };
    }

    return res;
  }, [user, effectiveClassId, gameState.guild, gameState.claimedGuildChallenges, gameState.xp, gameState.coins, gameState.guildXpContributed, checkAchievements]);

  return {
    gameState,
    dataLoaded, // True once the student's saved profile has been loaded from the backend
    submissions,
    learningPaths, // Export this
    categoriesPerRow, // Export this
    classGuilds, // Export this (supports up to 15 guilds)
    classStudents, // Export class roster for Co-Op Submissions
    classSubmissions, // Export class submissions for Shared Boss HP bar
    highFiveLimit, // High-five cooldown frequency limit ('daily' | 'weekly' | 'disabled')
    allowStudentGuildSelect, // Teacher toggle for student self-selection
    spendCoins, // Helper to spend coins on STEM supplies
    recordHighFive,
    claimGuildChallenge,
    getCurrentLevel,
    getNextLevelXp,
    getDailyQuest,
    submitActivity,
    submitBossChallenge,
    joinGuild,
    openMysteryBox,
    buyAvatarItem,
    equipAvatarItem,
    setPlayerName,

    showLevelUp,
    setShowLevelUp,
    newLevel,
    showAchievement,
    setShowAchievement,
    showMysteryReward,
    setShowMysteryReward,
  };
}

// Re-export pure calculation functions for direct consumer/testing use
export {
  reconcileRevocationState,
  calculateRewardState,
  calculateStreak,
  calculateLevelAndBonusCoins,
  calculateGuildChallengeRewardState
};
