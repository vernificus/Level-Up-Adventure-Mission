import { LEVELS, LEARNING_PATHS as DEFAULT_PATHS, PATH_COLORS, AVATAR_ITEMS, getGuildLevelInfo } from '../data/gameData.js';

/**
 * Returns canonical initial game state for a student player.
 * @returns {Object} Default student game state
 */
export function getDefaultGameState() {
  return {
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
  };
}

/**
 * Returns the level configuration object for a given XP amount.
 * @param {number} xp - Student XP amount
 * @param {Array} levels - Optional level list, defaults to canonical LEVELS
 * @returns {Object} Level object { level, title, xpRequired, color, coinReward }
 */
export function getLevelForXp(xp = 0, levels = LEVELS) {
  const numericXp = Number(xp) || 0;
  let current = levels[0];
  for (const level of levels) {
    if (numericXp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Computes bonus coins earned when advancing from oldXp to newXp.
 * @param {number} oldXp
 * @param {number} newXp
 * @param {Array} levels
 * @returns {{ oldLevel: Object, newLevel: Object, bonusCoins: number }}
 */
export function calculateLevelAndBonusCoins(oldXp = 0, newXp = 0, levels = LEVELS) {
  const oldLevel = getLevelForXp(oldXp, levels);
  const newLevel = getLevelForXp(newXp, levels);
  let bonusCoins = 0;
  if (newLevel.level > oldLevel.level) {
    for (let lvl = oldLevel.level + 1; lvl <= newLevel.level; lvl++) {
      const lvlData = levels.find(l => l.level === lvl);
      if (lvlData?.coinReward) {
        bonusCoins += lvlData.coinReward;
      }
    }
  }
  return { oldLevel, newLevel, bonusCoins, leveledUp: newLevel.level > oldLevel.level };
}

/**
 * Returns a Date object for the most recent Monday at 7:00 AM local time.
 * If today is Monday before 7:00 AM, returns the previous week's Monday at 7:00 AM.
 * @param {Date|string|number} [now=new Date()]
 * @returns {Date}
 */
export function getMostRecentMonday7am(now = new Date()) {
  const date = new Date(now);
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? 6 : day - 1); // days since last Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(7, 0, 0, 0);

  // If it's Monday but before 7am, roll back to the previous Monday
  if (monday > date) {
    monday.setDate(monday.getDate() - 7);
  }
  return monday;
}

/**
 * Resolves a class document's custom categories, titles, subtitles, ordering, and colors
 * against the default learning paths.
 * @param {Object} classDoc - Firestore class document
 * @param {Array} [defaultPaths=DEFAULT_PATHS] - Default paths fallback
 * @returns {Array} Resolved learning paths array
 */
export function resolveClassLearningPaths(classDoc, defaultPaths = DEFAULT_PATHS) {
  if (!classDoc) return defaultPaths || [];

  let paths = classDoc.activities && classDoc.activities.length > 0
    ? [...classDoc.activities]
    : [...(defaultPaths || [])];

  // Apply custom category names and subtitles
  if (classDoc.categoryNames || classDoc.categorySubtitles) {
    paths = paths.map(path => ({
      ...path,
      title: classDoc.categoryNames?.[path.id] || path.title,
      subtitle: classDoc.categorySubtitles?.[path.id] || path.subtitle,
    }));

    // Add extra categories that do not exist yet in paths
    if (classDoc.categoryNames) {
      const existingIds = new Set(paths.map(p => p.id));
      Object.keys(classDoc.categoryNames).forEach(key => {
        if (!existingIds.has(key)) {
          paths.push({
            id: key,
            title: classDoc.categoryNames[key],
            subtitle: classDoc.categorySubtitles?.[key] || '',
            icon: 'BookOpen',
            color: PATH_COLORS[paths.length % PATH_COLORS.length],
            options: [],
          });
        }
      });
    }

    // Filter out paths removed in categoryNames
    if (classDoc.categoryNames && Object.keys(classDoc.categoryNames).length > 0) {
      paths = paths.filter(p => p.id in classDoc.categoryNames);
    }
  }

  // Sort by categoryOrder if available
  if (Array.isArray(classDoc.categoryOrder) && classDoc.categoryOrder.length > 0) {
    paths.sort((a, b) => {
      const idxA = classDoc.categoryOrder.indexOf(a.id);
      const idxB = classDoc.categoryOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  // Ensure category colors match column display order
  paths = paths.map((path, idx) => ({
    ...path,
    color: PATH_COLORS[idx % PATH_COLORS.length],
  }));

  return paths;
}

/**
 * Calculates updated streak and streak shield status for student activity completions.
 * Clubs meet 1-3 times per week; activities within 8 days of previous date increment streak.
 * Beyond 8 days, streakShieldActive protects currentStreak once and is consumed.
 * @param {Object} prev - Current game state
 * @param {string} [today] - Date string (defaults to today's toDateString)
 * @returns {{ newStreak: number, streakShieldActive: boolean }}
 */
export function calculateStreak(prev, today = new Date().toDateString()) {
  let newStreak = prev.currentStreak || 0;
  let streakShieldActive = Boolean(prev.streakShieldActive);

  if (prev.lastActivityDate !== today) {
    const diff = (new Date(today) - new Date(prev.lastActivityDate || 0)) / 86400000;
    if (diff <= 8) {
      newStreak++;
    } else if (diff > 8 && prev.streakShieldActive) {
      streakShieldActive = false;
    } else {
      newStreak = 1;
    }
  }

  return { newStreak, streakShieldActive };
}

/**
 * Reconciles student game state when an approved submission is revoked or rejected.
 * Decrements XP, guild XP, completed activities/bosses, and decrements totalActivitiesCompleted
 * and pathCompletions strictly for non-boss activities.
 * Clamps all numeric counters at >= 0 to prevent underflow.
 * @param {Object} prev - Current student game state
 * @param {Object} submission - Revoked submission object
 * @returns {Object} Reconciled game state
 */
export function reconcileRevocationState(prev, submission) {
  if (!prev) return prev;
  const isBoss = Boolean(submission?.isBoss);
  const xpToDeduct = Number(submission?.xpAwarded) || Number(submission?.xp) || (isBoss ? 300 : 100);

  const updated = {
    ...prev,
    xp: Math.max(0, (prev.xp || 0) - xpToDeduct),
    guildXpContributed: prev.guild
      ? Math.max(0, (prev.guildXpContributed || 0) - xpToDeduct)
      : prev.guildXpContributed,
    totalActivitiesCompleted: isBoss
      ? (prev.totalActivitiesCompleted || 0)
      : Math.max(0, (prev.totalActivitiesCompleted || 1) - 1),
  };

  if (isBoss) {
    updated.completedBossChallenges = (prev.completedBossChallenges || []).filter(
      id => id !== submission.activityId
    );
  } else {
    updated.completedActivities = (prev.completedActivities || []).filter(
      id => id !== submission.activityId
    );
    if (submission?.pathId) {
      const currentPathCount = (prev.pathCompletions && prev.pathCompletions[submission.pathId]) || 0;
      updated.pathCompletions = {
        ...(prev.pathCompletions || {}),
        [submission.pathId]: Math.max(0, currentPathCount - 1),
      };
    }
  }

  return updated;
}

/**
 * Pure state reducer calculating updated game state when an activity or boss challenge is rewarded.
 * Handles Double XP multiplier, streak shield protection, daily quest 2x bonus, and path completions.
 * @param {Object} prev - Current game state
 * @param {Object} submission - Approved submission
 * @param {Object} [options]
 * @param {string} [options.today]
 * @param {boolean} [options.isDailyQuestMatch]
 * @returns {Object} Updated game state
 */
export function calculateRewardState(prev, submission, options = {}) {
  const today = options.today || new Date().toDateString();
  const isDailyQuestMatch = Boolean(options.isDailyQuestMatch);
  let xpEarned = Number(submission?.xp) || (submission?.isBoss ? 300 : 100);

  // Consume double XP active token if active
  if (prev.doubleXpActive) {
    xpEarned *= 2;
  }

  if (submission?.isBoss) {
    return {
      ...prev,
      xp: (prev.xp || 0) + xpEarned,
      completedBossChallenges: [...(prev.completedBossChallenges || []), submission.activityId],
      guildXpContributed: prev.guild
        ? (prev.guildXpContributed || 0) + xpEarned
        : prev.guildXpContributed,
      pendingMysteryBoxes: (prev.pendingMysteryBoxes || 0) + 1,
      doubleXpActive: false,
    };
  }

  // Regular activity completion
  const { newStreak, streakShieldActive } = calculateStreak(prev, today);

  if (isDailyQuestMatch && !prev.dailyQuestCompleted) {
    xpEarned *= 2;
  }

  const newTotal = (prev.totalActivitiesCompleted || 0) + 1;
  const earnedMysteryBox = newTotal % 3 === 0;
  const pathId = submission?.pathId;

  return {
    ...prev,
    xp: (prev.xp || 0) + xpEarned,
    completedActivities: [...new Set([...(prev.completedActivities || []), submission.activityId])],
    totalActivitiesCompleted: newTotal,
    guildXpContributed: prev.guild
      ? (prev.guildXpContributed || 0) + xpEarned
      : prev.guildXpContributed,
    currentStreak: newStreak,
    streakShieldActive,
    doubleXpActive: false,
    lastActivityDate: today,
    dailyQuestCompleted: isDailyQuestMatch ? true : Boolean(prev.dailyQuestCompleted),
    pendingMysteryBoxes: earnedMysteryBox
      ? (prev.pendingMysteryBoxes || 0) + 1
      : (prev.pendingMysteryBoxes || 0),
    collaborationCount: submission?.activityType === 'Collaboration'
      ? (prev.collaborationCount || 0) + 1
      : (prev.collaborationCount || 0),
    pathCompletions: pathId
      ? {
          ...(prev.pathCompletions || {}),
          [pathId]: ((prev.pathCompletions && prev.pathCompletions[pathId]) || 0) + 1,
        }
      : prev.pathCompletions,
  };
}

/**
 * Calculates the count of distinct learning paths where guild members have completed
 * at least the threshold number of activities (Path Masters challenge).
 * @param {Array} members - Guild members list
 * @param {Array} [defaultPaths=DEFAULT_PATHS]
 * @param {number} [threshold=2]
 * @returns {number} Count of distinct paths reaching threshold
 */
export function calculatePathMastersProgress(members = [], defaultPaths = DEFAULT_PATHS, threshold = 2) {
  if (!Array.isArray(members) || members.length === 0) return 0;
  const pathCounts = {};

  members.forEach(m => {
    if (m.pathCompletions && typeof m.pathCompletions === 'object') {
      Object.entries(m.pathCompletions).forEach(([pid, count]) => {
        pathCounts[pid] = (pathCounts[pid] || 0) + Number(count || 0);
      });
    }
    if (Array.isArray(m.completedActivities)) {
      m.completedActivities.forEach(actId => {
        defaultPaths.forEach(p => {
          if (typeof actId === 'string' && (actId.startsWith(p.id) || p.options?.some(o => o.id === actId))) {
            if (!m.pathCompletions?.[p.id]) {
              pathCounts[p.id] = (pathCounts[p.id] || 0) + 1;
            }
          }
        });
      });
    }
  });

  return Object.keys(pathCounts).filter(pid => pathCounts[pid] >= threshold).length;
}

/**
 * Pure state reducer calculating updated game state when a guild challenge is claimed.
 * Awards reward XP, coins, guild XP contributed, updates claimedGuildChallenges,
 * and optionally awards bonus level coins if a level boundary is crossed.
 * @param {Object} prev - Current game state
 * @param {Object} challenge - Guild challenge { id, reward, coinReward, ... }
 * @param {Object|Array} [optionsOrLevels] - Options object or levels array
 * @returns {Object} Updated game state
 */
export function calculateGuildChallengeRewardState(prev, challenge, optionsOrLevels = {}) {
  if (!challenge || !challenge.id) return prev;
  const currentClaimed = Array.isArray(prev.claimedGuildChallenges) ? prev.claimedGuildChallenges : [];
  if (currentClaimed.includes(challenge.id)) {
    return prev;
  }

  const options = Array.isArray(optionsOrLevels)
    ? { applyLevelBonus: true, levels: optionsOrLevels }
    : optionsOrLevels;

  const rewardXp = Number(challenge.reward) || 100;
  const rewardCoins = Number(challenge.coinReward) || 50;
  const oldXp = Number(prev.xp) || 0;
  const newXp = oldXp + rewardXp;
  const oldCoins = Number(prev.coins) || 0;

  let bonusCoins = 0;
  let levelInfo = null;
  if (options.applyLevelBonus) {
    const levels = options.levels || LEVELS;
    const res = calculateLevelAndBonusCoins(oldXp, newXp, levels);
    bonusCoins = res.bonusCoins || 0;
    levelInfo = res;
  }

  const newCoins = oldCoins + rewardCoins + bonusCoins;
  const oldGuildXp = Number(prev.guildXpContributed) || 0;
  const newGuildXp = oldGuildXp + rewardXp;

  const updatedState = {
    ...prev,
    xp: newXp,
    coins: newCoins,
    guildXpContributed: prev.guild || options.forceGuildXp || oldGuildXp > 0 || prev.guildXpContributed !== undefined ? newGuildXp : prev.guildXpContributed,
    claimedGuildChallenges: [...currentClaimed, challenge.id]
  };

  if (levelInfo) {
    updatedState._levelInfo = levelInfo;
  }

  return updatedState;
}

/**
 * Shallow-deep equality check for primitives, arrays, and plain objects.
 * Used to avoid unnecessary Firestore syncs and React re-renders.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export function areValuesEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !areValuesEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether a submission occurred on or after the student's lastActivityReset timestamp.
 * @param {Object} submission
 * @param {string|null|undefined} lastActivityReset
 * @returns {boolean}
 */
export function isSubmissionAfterReset(submission, lastActivityReset) {
  if (!submission) return false;
  if (!lastActivityReset) return true;
  const resetTime = new Date(lastActivityReset).getTime();
  if (Number.isNaN(resetTime)) return true;
  const subTimestamp = submission.reviewedAt || submission.submittedAt || 0;
  const subTime = new Date(subTimestamp).getTime();
  if (Number.isNaN(subTime)) return false;
  return subTime >= resetTime;
}

/**
 * Returns submissions belonging to the student's current activity cycle (since lastActivityReset),
 * keeping any still-pending submissions and filtering out pre-reset approved/rejected cards.
 * @param {Array} submissions
 * @param {string|null|undefined} lastActivityReset
 * @returns {Array}
 */
export function getActiveCycleSubmissions(submissions = [], lastActivityReset = null) {
  if (!Array.isArray(submissions)) return [];
  return submissions.filter(s => {
    if (!s) return false;
    if (s.status === 'pending') return true;
    return isSubmissionAfterReset(s, lastActivityReset);
  });
}

/**
 * Merges a polled server student document into the local student gameState safely.
 * Detects teacher/weekly activity resets via `lastActivityReset`, syncs XP/coins/guild updates
 * only when the server actually changed relative to `lastSeenServer`, and preserves referential
 * equality (`prev`) when nothing changed to avoid triggering redundant Firestore writes.
 *
 * @param {Object} prev - Local gameState
 * @param {Object} freshStudent - Fresh Firestore student document
 * @param {Object|null} [lastSeenServer=null] - Previous snapshot of freshStudent from last poll
 * @returns {Object} Updated state or `prev` if unchanged
 */
export function mergeServerStudentIntoLocal(prev, freshStudent, lastSeenServer = null) {
  if (!prev || !freshStudent) return prev;

  const updates = {};

  const serverAchievements = Array.isArray(freshStudent.unlockedAchievements) ? freshStudent.unlockedAchievements : [];
  const prevAchievements = Array.isArray(prev.unlockedAchievements) ? prev.unlockedAchievements : [];
  const serverAchChanged = !lastSeenServer || !areValuesEqual(serverAchievements, lastSeenServer.unlockedAchievements);
  const isAchievementDeducted = serverAchChanged && serverAchievements.length < prevAchievements.length;
  const mergedAchievements = isAchievementDeducted
    ? serverAchievements
    : Array.from(new Set([...prevAchievements, ...serverAchievements]));
  if (!areValuesEqual(mergedAchievements, prevAchievements)) {
    updates.unlockedAchievements = mergedAchievements;
  }

  const serverClaimed = Array.isArray(freshStudent.claimedGuildChallenges) ? freshStudent.claimedGuildChallenges : [];
  const prevClaimed = Array.isArray(prev.claimedGuildChallenges) ? prev.claimedGuildChallenges : [];
  const serverClaimedChanged = !lastSeenServer || !areValuesEqual(serverClaimed, lastSeenServer.claimedGuildChallenges);
  const isExploitReset = serverClaimedChanged && serverClaimed.length < prevClaimed.length;
  const mergedClaimed = isExploitReset
    ? serverClaimed
    : Array.from(new Set([...prevClaimed, ...serverClaimed]));
  if (!areValuesEqual(mergedClaimed, prevClaimed)) {
    updates.claimedGuildChallenges = mergedClaimed;
  }

  // Activity reset synchronization: when teacher or weekly reset updates lastActivityReset
  const serverResetIso = freshStudent.lastActivityReset;
  const prevResetTime = prev.lastActivityReset ? new Date(prev.lastActivityReset).getTime() : 0;
  const serverResetTime = serverResetIso ? new Date(serverResetIso).getTime() : 0;
  const isServerActivityReset = Boolean(
    serverResetIso && !Number.isNaN(serverResetTime) && serverResetTime > prevResetTime
  );

  if (isServerActivityReset) {
    updates.lastActivityReset = serverResetIso;
    const resetCompleted = Array.isArray(freshStudent.completedActivities) ? freshStudent.completedActivities : [];
    if (!areValuesEqual(resetCompleted, prev.completedActivities || [])) {
      updates.completedActivities = resetCompleted;
    }
  } else if (Array.isArray(freshStudent.completedActivities)) {
    const serverCompletedChanged = !lastSeenServer || !areValuesEqual(freshStudent.completedActivities, lastSeenServer.completedActivities);
    if (serverCompletedChanged && !areValuesEqual(freshStudent.completedActivities, prev.completedActivities || [])) {
      updates.completedActivities = freshStudent.completedActivities;
    }
  }

  const serverControlledFields = [
    'guild',
    'xp',
    'guildXpContributed',
    'coins',
    'ownedItems',
    'avatar',
    'completedBossChallenges',
    'totalActivitiesCompleted',
    'pendingMysteryBoxes',
    'doubleXpActive',
  ];

  for (const field of serverControlledFields) {
    if (freshStudent[field] !== undefined) {
      const serverChanged = !lastSeenServer || !areValuesEqual(freshStudent[field], lastSeenServer[field]);
      if (serverChanged && !areValuesEqual(freshStudent[field], prev[field])) {
        updates[field] = freshStudent[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return prev;
  }

  return {
    ...prev,
    ...updates,
  };
}

const AVATAR_CATEGORY_META = {
  colors: { slot: 'color', defaultId: 'default' },
  hats: { slot: 'hat', defaultId: 'none' },
  accessories: { slot: 'accessory', defaultId: 'none' },
  faces: { slot: 'face', defaultId: 'happy' },
};

/**
 * Looks up an avatar shop item by ID across all categories.
 *
 * @param {string} itemId
 * @returns {{ item: Object, category: string, slot: string, defaultId: string } | null}
 */
export function findAvatarShopItem(itemId) {
  if (!itemId) return null;
  for (const [category, list] of Object.entries(AVATAR_ITEMS || {})) {
    const found = (list || []).find(i => i.id === itemId);
    if (found) {
      const meta = AVATAR_CATEGORY_META[category] || { slot: category.slice(0, -1), defaultId: 'none' };
      return { item: found, category, slot: meta.slot, defaultId: meta.defaultId };
    }
  }
  return null;
}

/**
 * Pure helper to refund a coin-purchased avatar item from student state.
 * Removes the item from ownedItems, resets any equipped slot using it back to default,
 * and adds its coin cost back to coins.
 *
 * @param {Object} prevState - Student state { coins, ownedItems, avatar }
 * @param {string} itemId - ID of the avatar item to refund
 * @param {number|null} [overrideCost] - Optional explicit coin cost
 * @returns {{ nextState: Object, refunded: boolean, refundAmount: number, itemName: string }}
 */
export function applyAvatarItemRefund(prevState, itemId, overrideCost = null) {
  if (!prevState || !itemId) {
    return { nextState: prevState, refunded: false, refundAmount: 0, itemName: '' };
  }
  const defaults = ['default', 'none', 'happy'];
  if (defaults.includes(itemId)) {
    return { nextState: prevState, refunded: false, refundAmount: 0, itemName: '' };
  }

  const ownedItems = Array.isArray(prevState.ownedItems) ? prevState.ownedItems : defaults;
  if (!ownedItems.includes(itemId)) {
    return { nextState: prevState, refunded: false, refundAmount: 0, itemName: '' };
  }

  const meta = findAvatarShopItem(itemId);
  const refundAmount = Math.max(0, Number(overrideCost !== null ? overrideCost : meta?.item?.cost) || 0);
  if (refundAmount <= 0) {
    return { nextState: prevState, refunded: false, refundAmount: 0, itemName: meta?.item?.name || itemId };
  }

  const nextOwned = ownedItems.filter(id => id !== itemId);
  const currentAvatar = prevState.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' };
  const nextAvatar = { ...currentAvatar };

  if (nextAvatar.color === itemId) nextAvatar.color = 'default';
  if (nextAvatar.hat === itemId) nextAvatar.hat = 'none';
  if (nextAvatar.accessory === itemId) nextAvatar.accessory = 'none';
  if (nextAvatar.accessorie === itemId) delete nextAvatar.accessorie;
  if (nextAvatar.face === itemId) nextAvatar.face = 'happy';

  return {
    nextState: {
      ...prevState,
      coins: (prevState.coins || 0) + refundAmount,
      ownedItems: nextOwned,
      avatar: nextAvatar,
    },
    refunded: true,
    refundAmount,
    itemName: meta?.item?.name || itemId,
  };
}

/**
 * Finds the coalition that includes a given guild ID.
 *
 * @param {Array} coalitions
 * @param {string} guildId
 * @returns {Object|null}
 */
export function findGuildCoalition(coalitions, guildId) {
  if (!Array.isArray(coalitions) || !guildId) return null;
  return coalitions.find(c => Array.isArray(c?.guildIds) && c.guildIds.includes(guildId)) || null;
}

/**
 * Toggles a guild's membership in a target coalition while ensuring each guild
 * belongs to at most one coalition at a time (without altering student guild assignments).
 *
 * @param {Array} coalitions
 * @param {string} targetCoalitionId
 * @param {string} guildId
 * @returns {Array} Updated coalitions array
 */
export function assignGuildToCoalition(coalitions, targetCoalitionId, guildId) {
  if (!Array.isArray(coalitions) || !targetCoalitionId || !guildId) return coalitions || [];
  const target = coalitions.find(c => c?.id === targetCoalitionId);
  if (!target) return coalitions;

  const isCurrentlyInTarget = Array.isArray(target.guildIds) && target.guildIds.includes(guildId);

  return coalitions.map(c => {
    const existingIds = Array.isArray(c.guildIds) ? c.guildIds : [];
    const withoutGuild = existingIds.filter(id => id !== guildId);
    if (c.id === targetCoalitionId) {
      return {
        ...c,
        guildIds: isCurrentlyInTarget ? withoutGuild : [...withoutGuild, guildId],
      };
    }
    return {
      ...c,
      guildIds: withoutGuild,
    };
  });
}

/**
 * Computes combined standings for coalitions by summing XP and members across
 * their allied guilds while preserving each guild's independent identity.
 *
 * @param {Array} coalitions - Class coalitions config
 * @param {Array} activeGuilds - Active class guild objects
 * @param {Object|Array} guildStatsSource - Either { [guildId]: stats } map or array of guild stats
 * @returns {Array} Sorted coalition standing objects (highest totalXp first)
 */
export function computeCoalitionStandings(coalitions, activeGuilds = [], guildStatsSource = {}) {
  if (!Array.isArray(coalitions) || coalitions.length === 0) return [];

  const guildMetaById = new Map();
  if (Array.isArray(activeGuilds)) {
    activeGuilds.forEach(g => {
      if (g?.id) guildMetaById.set(g.id, g);
    });
  }

  const statsById = new Map();
  if (Array.isArray(guildStatsSource)) {
    guildStatsSource.forEach(entry => {
      if (entry?.id) statsById.set(entry.id, entry);
    });
  } else if (guildStatsSource && typeof guildStatsSource === 'object') {
    Object.entries(guildStatsSource).forEach(([id, entry]) => {
      if (id && entry) statsById.set(id, entry);
    });
  }

  const standings = coalitions
    .filter(c => c && c.id)
    .map(c => {
      const validIds = Array.from(new Set(
        (Array.isArray(c.guildIds) ? c.guildIds : []).filter(id =>
          guildMetaById.size === 0 || guildMetaById.has(id)
        )
      ));

      const memberGuilds = validIds.map(gId => {
        const meta = guildMetaById.get(gId) || {};
        const stat = statsById.get(gId) || {};
        const memberCount = typeof stat.memberCount === 'number'
          ? stat.memberCount
          : (Array.isArray(stat.members) ? stat.members.length : 0);
        const totalXp = Number(stat.totalXp) || 0;
        return {
          ...meta,
          id: gId,
          name: meta.name || stat.name || gId,
          emoji: meta.emoji || meta.icon || stat.emoji || stat.icon || '🛡️',
          totalXp,
          memberCount,
        };
      });

      const totalXp = memberGuilds.reduce((sum, g) => sum + g.totalXp, 0);
      const memberCount = memberGuilds.reduce((sum, g) => sum + g.memberCount, 0);

      return {
        ...c,
        guildIds: validIds,
        memberGuilds,
        totalXp,
        memberCount,
        levelInfo: getGuildLevelInfo(totalXp),
      };
    });

  standings.sort((a, b) => {
    if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
    return b.memberCount - a.memberCount;
  });

  return standings;
}



