import { useState, useEffect, useCallback } from 'react';
import { LEVELS, ACHIEVEMENTS, DAILY_QUESTS, MYSTERY_REWARDS } from '../data/gameData';

const STORAGE_KEY = 'choiceboard_game_state';
const SUBMISSIONS_KEY = 'choiceboard_submissions';
const TEACHER_PIN = 'teach'; // Simple PIN for teacher access

const getDefaultState = () => ({
  // Player info
  playerName: '',

  // XP and Level
  xp: 0,
  coins: 100,

  // Progress tracking
  completedActivities: [],
  completedBossChallenges: [],

  // Streaks
  currentStreak: 0,
  lastActivityDate: null,
  streakShieldActive: false,

  // Achievements
  unlockedAchievements: [],

  // Guild
  guild: null,
  guildXpContributed: 0,

  // Avatar
  avatar: {
    color: 'default',
    hat: 'none',
    accessory: 'none',
    face: 'happy',
  },
  ownedItems: ['default', 'none', 'happy'],

  // Daily quest
  dailyQuestCompleted: false,
  lastDailyQuestDate: null,

  // Mystery boxes
  mysteryBoxesOpened: 0,
  pendingMysteryBoxes: 0,

  // Power-ups
  doubleXpActive: false,

  // Stats
  totalActivitiesCompleted: 0,
  collaborationCount: 0,
  pathCompletions: { path1: 0, path2: 0, path3: 0 },
});

const getDefaultSubmissions = () => ([]);

export function useGameState() {
  const [gameState, setGameState] = useState(() => {
    if (typeof window === 'undefined') return getDefaultState();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...getDefaultState(), ...JSON.parse(saved) };
      } catch {
        return getDefaultState();
      }
    }
    return getDefaultState();
  });

  const [submissions, setSubmissions] = useState(() => {
    if (typeof window === 'undefined') return getDefaultSubmissions();
    const saved = localStorage.getItem(SUBMISSIONS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultSubmissions();
      }
    }
    return getDefaultSubmissions();
  });

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [showMysteryReward, setShowMysteryReward] = useState(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  // Save submissions to localStorage
  useEffect(() => {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  }, [submissions]);

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

  // Validate teacher PIN
  const validateTeacherPin = useCallback((pin) => {
    return pin === TEACHER_PIN;
  }, []);

  // Submit activity for approval
  const submitActivity = useCallback((activity, pathId, submissionData) => {
    const submission = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      activityId: activity.id,
      activityTitle: activity.title,
      activityType: activity.type,
      pathId,
      xp: activity.xp,
      playerName: gameState.playerName || 'Anonymous',
      submissionType: submissionData.type, // 'link' or 'file'
      submissionContent: submissionData.content, // URL or file data
      submissionNote: submissionData.note || '',
      submittedAt: new Date().toISOString(),
      status: 'pending', // 'pending', 'approved', 'rejected'
      teacherFeedback: '',
    };

    setSubmissions(prev => [...prev, submission]);
    return submission;
  }, [gameState.playerName]);

  // Submit boss challenge for approval
  const submitBossChallenge = useCallback((boss, submissionData) => {
    const submission = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      activityId: boss.id,
      activityTitle: boss.name,
      activityType: 'Boss Challenge',
      pathId: 'boss',
      xp: boss.reward,
      playerName: gameState.playerName || 'Anonymous',
      submissionType: submissionData.type,
      submissionContent: submissionData.content,
      submissionNote: submissionData.note || '',
      submittedAt: new Date().toISOString(),
      status: 'pending',
      teacherFeedback: '',
      isBoss: true,
    };

    setSubmissions(prev => [...prev, submission]);
    return submission;
  }, [gameState.playerName]);

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

  // Approve a submission (teacher action)
  const approveSubmission = useCallback((submissionId, feedback = '') => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission || submission.status !== 'pending') return;

    // Update submission status
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId
        ? { ...s, status: 'approved', teacherFeedback: feedback, reviewedAt: new Date().toISOString() }
        : s
    ));

    // Now complete the activity and award XP
    const today = new Date().toDateString();
    const activity = { id: submission.activityId, type: submission.activityType, xp: submission.xp };
    const pathId = submission.pathId;
    const isDailyQuestMatch = checkDailyQuestMatch(activity, pathId);

    if (submission.isBoss) {
      // Complete boss challenge
      setGameState(prev => {
        const updatedState = {
          ...prev,
          xp: prev.xp + submission.xp,
          completedBossChallenges: [...prev.completedBossChallenges, submission.activityId],
          guildXpContributed: prev.guild ? prev.guildXpContributed + submission.xp : prev.guildXpContributed,
          pendingMysteryBoxes: prev.pendingMysteryBoxes + 1,
        };

        const newAchievements = checkAchievements(updatedState);
        if (newAchievements.length > 0) {
          updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements.map(a => a.id)];
          updatedState.xp += newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
          setTimeout(() => setShowAchievement(newAchievements[0]), 500);
        }

        return updatedState;
      });
    } else {
      // Complete regular activity
      setGameState(prev => {
        // Calculate streak
        let newStreak = prev.currentStreak;
        const lastDate = prev.lastActivityDate;

        if (lastDate) {
          const lastDateObj = new Date(lastDate);
          const todayObj = new Date(today);
          const diffDays = Math.floor((todayObj - lastDateObj) / 86400000);

          if (diffDays === 1) {
            newStreak = prev.currentStreak + 1;
          } else if (diffDays > 1) {
            newStreak = prev.streakShieldActive ? prev.currentStreak : 1;
          }
        } else {
          newStreak = 1;
        }

        // Calculate XP
        let xpEarned = submission.xp || 100;
        if (isDailyQuestMatch && !prev.dailyQuestCompleted) {
          const quest = getDailyQuest();
          xpEarned = Math.floor(xpEarned * quest.multiplier);
        }
        if (prev.doubleXpActive) {
          xpEarned *= 2;
        }

        // Check if earned mystery box (every 3 activities)
        const newTotal = prev.totalActivitiesCompleted + 1;
        const earnedMysteryBox = newTotal % 3 === 0;

        const updatedState = {
          ...prev,
          xp: prev.xp + xpEarned,
          completedActivities: [...new Set([...prev.completedActivities, submission.activityId])],
          totalActivitiesCompleted: newTotal,
          currentStreak: newStreak,
          lastActivityDate: today,
          streakShieldActive: false,
          dailyQuestCompleted: isDailyQuestMatch ? true : prev.dailyQuestCompleted,
          lastDailyQuestDate: isDailyQuestMatch ? today : prev.lastDailyQuestDate,
          doubleXpActive: false,
          collaborationCount: submission.activityType === 'Collaboration' ? prev.collaborationCount + 1 : prev.collaborationCount,
          pathCompletions: {
            ...prev.pathCompletions,
            [pathId]: (prev.pathCompletions[pathId] || 0) + 1,
          },
          guildXpContributed: prev.guild ? prev.guildXpContributed + xpEarned : prev.guildXpContributed,
          pendingMysteryBoxes: earnedMysteryBox ? prev.pendingMysteryBoxes + 1 : prev.pendingMysteryBoxes,
        };

        // Check for new achievements
        const newAchievements = checkAchievements(updatedState);
        if (newAchievements.length > 0) {
          updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements.map(a => a.id)];
          updatedState.xp += newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
          setTimeout(() => setShowAchievement(newAchievements[0]), 500);
        }

        // Check for level up
        const oldLevel = LEVELS.reduce((acc, l) => prev.xp >= l.xpRequired ? l : acc, LEVELS[0]);
        const newLevelData = LEVELS.reduce((acc, l) => updatedState.xp >= l.xpRequired ? l : acc, LEVELS[0]);
        if (newLevelData.level > oldLevel.level) {
          setTimeout(() => {
            setNewLevel(newLevelData);
            setShowLevelUp(true);
          }, 500);
        }

        return updatedState;
      });
    }
  }, [submissions, checkDailyQuestMatch, checkAchievements, getDailyQuest]);

  // Reject a submission (teacher action)
  const rejectSubmission = useCallback((submissionId, feedback = '') => {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId
        ? { ...s, status: 'rejected', teacherFeedback: feedback, reviewedAt: new Date().toISOString() }
        : s
    ));
  }, []);

  // Clear reviewed submissions
  const clearReviewedSubmissions = useCallback(() => {
    setSubmissions(prev => prev.filter(s => s.status === 'pending'));
  }, []);

  // Get pending submissions count
  const getPendingCount = useCallback(() => {
    return submissions.filter(s => s.status === 'pending').length;
  }, [submissions]);

  // Add XP with level-up check (keeping for compatibility)
  const addXp = useCallback((amount, source = 'activity') => {
    setGameState(prev => {
      const oldLevel = getCurrentLevel();
      let finalAmount = amount;

      if (prev.doubleXpActive && source === 'activity') {
        finalAmount = amount * 2;
      }

      const newXp = prev.xp + finalAmount;

      const newLevelData = LEVELS.reduce((acc, level) => {
        if (newXp >= level.xpRequired) return level;
        return acc;
      }, LEVELS[0]);

      if (newLevelData.level > oldLevel.level) {
        setNewLevel(newLevelData);
        setShowLevelUp(true);
      }

      return {
        ...prev,
        xp: newXp,
        doubleXpActive: source === 'activity' ? false : prev.doubleXpActive,
      };
    });
  }, [getCurrentLevel]);

  // Add coins
  const addCoins = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  }, []);

  // Spend coins
  const spendCoins = useCallback((amount) => {
    if (gameState.coins >= amount) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - amount,
      }));
      return true;
    }
    return false;
  }, [gameState.coins]);

  // Join guild
  const joinGuild = useCallback((guildId) => {
    setGameState(prev => ({
      ...prev,
      guild: guildId,
      guildXpContributed: 0,
    }));
  }, []);

  // Open mystery box
  const openMysteryBox = useCallback(() => {
    if (gameState.pendingMysteryBoxes <= 0) return null;

    const weights = { common: 50, uncommon: 30, rare: 15, epic: 5 };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedRarity = 'common';

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        selectedRarity = rarity;
        break;
      }
    }

    const possibleRewards = MYSTERY_REWARDS.filter(r => r.rarity === selectedRarity);
    const reward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];

    setGameState(prev => {
      const updated = {
        ...prev,
        pendingMysteryBoxes: prev.pendingMysteryBoxes - 1,
        mysteryBoxesOpened: prev.mysteryBoxesOpened + 1,
      };

      if (reward.type === 'xp') {
        updated.xp = prev.xp + reward.value;
      } else if (reward.type === 'coins') {
        updated.coins = prev.coins + reward.value;
      } else if (reward.type === 'item') {
        if (reward.value === 'streak_shield') {
          updated.streakShieldActive = true;
        } else if (reward.value === 'double_xp') {
          updated.doubleXpActive = true;
        }
      }

      const newAchievements = checkAchievements(updated);
      if (newAchievements.length > 0) {
        updated.unlockedAchievements = [...updated.unlockedAchievements, ...newAchievements.map(a => a.id)];
      }

      return updated;
    });

    setShowMysteryReward(reward);
    return reward;
  }, [gameState.pendingMysteryBoxes, checkAchievements]);

  // Buy avatar item
  const buyAvatarItem = useCallback((itemId, cost) => {
    if (gameState.coins >= cost && !gameState.ownedItems.includes(itemId)) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - cost,
        ownedItems: [...prev.ownedItems, itemId],
      }));
      return true;
    }
    return false;
  }, [gameState.coins, gameState.ownedItems]);

  // Equip avatar item
  const equipAvatarItem = useCallback((category, itemId) => {
    setGameState(prev => ({
      ...prev,
      avatar: {
        ...prev.avatar,
        [category]: itemId,
      },
    }));
  }, []);

  // Set player name
  const setPlayerName = useCallback((name) => {
    setGameState(prev => ({
      ...prev,
      playerName: name,
    }));
  }, []);

  // Reset game (for testing)
  const resetGame = useCallback(() => {
    setGameState(getDefaultState());
    setSubmissions(getDefaultSubmissions());
  }, []);

  return {
    gameState,
    submissions,
    getCurrentLevel,
    getNextLevelXp,
    getDailyQuest,
    addXp,
    addCoins,
    spendCoins,
    submitActivity,
    submitBossChallenge,
    approveSubmission,
    rejectSubmission,
    clearReviewedSubmissions,
    getPendingCount,
    validateTeacherPin,
    joinGuild,
    openMysteryBox,
    buyAvatarItem,
    equipAvatarItem,
    setPlayerName,
    resetGame,

    // UI state
    showLevelUp,
    setShowLevelUp,
    newLevel,
    showAchievement,
    setShowAchievement,
    showMysteryReward,
    setShowMysteryReward,
  };
}
