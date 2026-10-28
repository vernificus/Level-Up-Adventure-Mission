import { LEVELS, LEARNING_PATHS as DEFAULT_PATHS, PATH_COLORS } from '../data/gameData.js';

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
  return { oldLevel, newLevel, bonusCoins };
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

