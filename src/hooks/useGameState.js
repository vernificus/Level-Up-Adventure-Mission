import { useState, useEffect, useCallback } from 'react';
import { LEVELS, ACHIEVEMENTS, DAILY_QUESTS, MYSTERY_REWARDS, LEARNING_PATHS as DEFAULT_PATHS } from '../data/gameData';
import { realBackend as backend } from '../services/realBackend';
import { useAuth } from '../context/AuthContext';

const getDefaultState = () => ({
  // Player info
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
  pathCompletions: { path1: 0, path2: 0, path3: 0 },
});

export function useGameState() {
  const { user } = useAuth();

  const [gameState, setGameState] = useState(getDefaultState());
  const [submissions, setSubmissions] = useState([]);
  const [learningPaths, setLearningPaths] = useState(DEFAULT_PATHS);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [showMysteryReward, setShowMysteryReward] = useState(null);

  // Load data from "Backend" on mount
  useEffect(() => {
    if (user && user.role === 'student') {
      loadUserData();
      loadClassActivities();
    }
  }, [user]);

  const loadClassActivities = async () => {
    if (!user.classId) return;
    try {
      const customPaths = await backend.getClassActivities(user.classId);
      if (customPaths && customPaths.length > 0) {
        setLearningPaths(customPaths);
      }
    } catch (e) {
      console.error("Failed to load class activities", e);
    }
  };

  const loadUserData = async () => {
    const studentData = await backend.getStudent(user.id);
    if (studentData) {
      const { id, classId, name, ...gameData } = studentData;
      setGameState(prev => ({
        ...prev,
        ...gameData,
        playerName: name || prev.playerName
      }));
    }

    const subs = await backend.getStudentSubmissions(user.id);
    setSubmissions(subs);
  };

  // Sync state to "Backend" whenever it changes
  useEffect(() => {
    if (user && user.role === 'student') {
      backend.updateStudent(user.id, gameState);
    }
  }, [gameState, user]);

  // Calculate current level
  const getCurrentLevel = useCallback(() => {
    let currentLevel = LEVELS[0];
    for (const level of LEVELS) {
      if (gameState.xp >= level.xpRequired) {
        currentLevel = level;
      } else {
        break;
      }
    }
    return currentLevel;
  }, [gameState.xp]);

  // Get XP needed for next level
  const getNextLevelXp = useCallback(() => {
    const currentLevel = getCurrentLevel();
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    return nextLevel ? nextLevel.xpRequired : currentLevel.xpRequired;
  }, [getCurrentLevel]);

  // Get today's daily quest
  const getDailyQuest = useCallback(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length];
  }, []);

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

    ACHIEVEMENTS.forEach(achievement => {
      if (updatedState.unlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;

      switch (achievement.id) {
        case 'first_mission':
          unlocked = updatedState.totalActivitiesCompleted >= 1;
          break;
        case 'variety_pack':
          unlocked = updatedState.pathCompletions.path1 > 0 &&
                     updatedState.pathCompletions.path2 > 0 &&
                     updatedState.pathCompletions.path3 > 0;
          break;
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
        case 'creator_5':
          unlocked = updatedState.pathCompletions.path3 >= 5;
          break;
        case 'wordsmith_5':
          unlocked = updatedState.pathCompletions.path1 >= 5;
          break;
        case 'data_5':
          unlocked = updatedState.pathCompletions.path2 >= 5;
          break;
        case 'level_5':
          const level = LEVELS.reduce((acc, l) => updatedState.xp >= l.xpRequired ? l : acc, LEVELS[0]);
          unlocked = level.level >= 5;
          break;
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
  }, []);

  const checkAndSetAchievements = (updatedState) => {
      const newAchievements = checkAchievements(updatedState);
      if (newAchievements.length > 0) {
        updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements.map(a => a.id)];
        updatedState.xp += newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
        setTimeout(() => setShowAchievement(newAchievements[0]), 500);
      }
  };

  const checkLevelUp = (oldState, newState) => {
      const oldLevel = LEVELS.reduce((acc, l) => oldState.xp >= l.xpRequired ? l : acc, LEVELS[0]);
      const newLevelData = LEVELS.reduce((acc, l) => newState.xp >= l.xpRequired ? l : acc, LEVELS[0]);
      if (newLevelData.level > oldLevel.level) {
        setTimeout(() => {
          setNewLevel(newLevelData);
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
      isBoss: false
    });

    setSubmissions(prev => [...prev, newSubmission]);
    return newSubmission;
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
      isBoss: true
    });

    setSubmissions(prev => [...prev, newSubmission]);
    return newSubmission;
  }, [user, gameState.playerName, submissions]);

  // Since approval happens in TeacherPortal now, the student just needs to poll or listen for updates.
  useEffect(() => {
    if (user && user.role === 'student') {
      const interval = setInterval(async () => {
        try {
          const subs = await backend.getStudentSubmissions(user.id);

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
  }, [user]);

  const processReward = (submission) => {
    const today = new Date().toDateString();

    setGameState(prev => {
       if (prev.completedActivities.includes(submission.activityId) && !submission.isBoss) {
         return prev;
       }
       if (submission.isBoss && prev.completedBossChallenges.includes(submission.activityId)) {
         return prev;
       }

       const activity = { id: submission.activityId, type: submission.activityType, xp: submission.xp };
       const pathId = submission.pathId;
       const isDailyQuestMatch = checkDailyQuestMatch(activity, pathId);
       let xpEarned = submission.xp || 100;

       if (submission.isBoss) {
          const updatedState = {
            ...prev,
            xp: prev.xp + xpEarned,
            completedBossChallenges: [...prev.completedBossChallenges, submission.activityId],
            guildXpContributed: prev.guild ? prev.guildXpContributed + xpEarned : prev.guildXpContributed,
            pendingMysteryBoxes: prev.pendingMysteryBoxes + 1,
          };
          checkAndSetAchievements(updatedState);
          return updatedState;
       } else {
          let newStreak = prev.currentStreak;
          if (prev.lastActivityDate !== today) {
             const diff = (new Date(today) - new Date(prev.lastActivityDate || 0)) / 86400000;
             if (diff <= 1) newStreak++;
             else if (diff > 1 && !prev.streakShieldActive) newStreak = 1;
          }

          if (isDailyQuestMatch && !prev.dailyQuestCompleted) {
             xpEarned *= 2;
          }

          const newTotal = prev.totalActivitiesCompleted + 1;
          const earnedMysteryBox = newTotal % 3 === 0;

          const updatedState = {
             ...prev,
             xp: prev.xp + xpEarned,
             completedActivities: [...new Set([...prev.completedActivities, submission.activityId])],
             totalActivitiesCompleted: newTotal,
             currentStreak: newStreak,
             lastActivityDate: today,
             dailyQuestCompleted: isDailyQuestMatch ? true : prev.dailyQuestCompleted,
             pendingMysteryBoxes: earnedMysteryBox ? prev.pendingMysteryBoxes + 1 : prev.pendingMysteryBoxes,
             collaborationCount: submission.activityType === 'Collaboration' ? prev.collaborationCount + 1 : prev.collaborationCount,
             pathCompletions: {
               ...prev.pathCompletions,
               [pathId]: (prev.pathCompletions[pathId] || 0) + 1,
             },
          };

          checkAndSetAchievements(updatedState);
          checkLevelUp(prev, updatedState);
          return updatedState;
       }
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
     if (gameState.coins >= cost && !gameState.ownedItems.includes(itemId)) {
        setGameState(prev => ({ ...prev, coins: prev.coins - cost, ownedItems: [...prev.ownedItems, itemId] }));
        return true;
     }
     return false;
  }, [gameState.coins, gameState.ownedItems]);

  const equipAvatarItem = useCallback((category, itemId) => {
      setGameState(prev => ({ ...prev, avatar: { ...prev.avatar, [category]: itemId } }));
  }, []);

  const setPlayerName = useCallback((name) => {
     setGameState(prev => ({ ...prev, playerName: name }));
  }, []);

  return {
    gameState,
    submissions,
    learningPaths, // Export this
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

    approveSubmission: () => {},
    rejectSubmission: () => {},
    clearReviewedSubmissions: () => {},
    validateTeacherPin: () => false,
  };
}
