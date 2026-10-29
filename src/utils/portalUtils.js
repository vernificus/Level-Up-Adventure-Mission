/**
 * portalUtils.js — Consolidated domain & usability utilities for Milestone 2
 *
 * Implements pure, deterministic domain functions for:
 * - FE-1: Student roster filtering
 * - FE-2: Password & PIN visibility toggling and accessibility labels
 * - FE-3: Batch review selection, synchronization, and XP calculation
 * - FE-4: Constructive revision feedback resolution and suggestion chips
 * - FE-6: Mobile category chip filtering, selection toggling, and progress calculations
 * - FE-7: Resilient redemption date parsing, descending sorting, formatting, and status badges
 * - FE-10: Accessible screen reader live region announcement formatting
 */

// ── FE-1: Student Roster Search Filtering ──

/**
 * Filters a student roster by a case-insensitive search query.
 * Trims whitespace and handles null, undefined, or missing student names safely.
 *
 * @param {Array} roster - Array of student objects { id, name, ... }
 * @param {string} query - Search term entered by the user
 * @returns {Array} Filtered list of students
 */
export function filterRosterByName(roster, query) {
  if (!Array.isArray(roster)) return [];
  const q = (query || '').toLowerCase().trim();
  if (!q) return roster;
  return roster.filter(student => {
    const name = typeof student?.name === 'string'
      ? student.name
      : (student?.name != null ? String(student.name) : '');
    return name.toLowerCase().includes(q);
  });
}

// ── FE-2: Password & PIN Visibility Accessibility Helpers ──

/**
 * Returns 'text' if password should be revealed, otherwise 'password'.
 * @param {boolean} isVisible
 * @returns {'text'|'password'}
 */
export function getVisibilityInputType(isVisible) {
  return isVisible ? 'text' : 'password';
}

/**
 * Returns accessible ARIA label for password/PIN show/hide toggle buttons.
 * @param {boolean} isVisible
 * @param {boolean} [isPin=false]
 * @returns {string} e.g. "Hide password", "Show PIN"
 */
export function getVisibilityToggleLabel(isVisible, isPin = false) {
  const term = isPin ? 'PIN' : 'password';
  return isVisible ? `Hide ${term}` : `Show ${term}`;
}

// ── FE-3: Batch Review & Quick Approval Calculations ──

/**
 * Calculates cumulative XP for a list of submissions, optionally filtered by selected IDs.
 * Handles s.xp, s.xpReward, and default activity/boss fallback XP values.
 *
 * @param {Array} submissions
 * @param {Set|Array} [selectedIds]
 * @returns {number}
 */
export function calculateBatchTotalXp(submissions, selectedIds) {
  if (!Array.isArray(submissions)) return 0;
  let target = submissions;
  if (selectedIds) {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    target = submissions.filter(s => idSet.has(s?.id));
  }
  return target.reduce((sum, s) => {
    const xpVal = s?.xp !== undefined
      ? Number(s.xp)
      : (s?.xpReward !== undefined ? Number(s.xpReward) : (s?.isBoss ? 300 : 50));
    return sum + (Number.isFinite(xpVal) ? xpVal : 0);
  }, 0);
}

/**
 * Filters submissions to return only those whose IDs exist in the selection set.
 * @param {Array} submissions
 * @param {Set|Array} selectedIds
 * @returns {Array}
 */
export function getVisibleSelectedSubmissions(submissions, selectedIds) {
  if (!Array.isArray(submissions) || !selectedIds) return [];
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  return submissions.filter(s => idSet.has(s?.id));
}

/**
 * Returns true if all visible pending submissions are selected.
 * @param {Array} pending
 * @param {Set|Array} selectedIds
 * @returns {boolean}
 */
export function isAllPendingSelected(pending, selectedIds) {
  if (!Array.isArray(pending) || pending.length === 0) return false;
  if (!selectedIds) return false;
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  if (idSet.size === 0) return false;
  return pending.every(s => idSet.has(s?.id));
}

/**
 * Computes synchronized batch selection state for visible pending submissions.
 * Prevents ghost selection states when changing filters or classes.
 *
 * @param {Array} pendingSubmissions - Visible pending submissions
 * @param {Set|Array} selectedSubmissionIds - Currently selected IDs
 * @returns {{ visibleSelectedSubs: Array, visibleSelectedCount: number, isAllSelected: boolean }}
 */
export function computeBatchSelectionState(pendingSubmissions = [], selectedSubmissionIds = new Set()) {
  const pending = Array.isArray(pendingSubmissions) ? pendingSubmissions : [];
  const selectedSet = selectedSubmissionIds instanceof Set
    ? selectedSubmissionIds
    : new Set(selectedSubmissionIds || []);
  const visibleSelectedSubs = pending.filter(s => selectedSet.has(s?.id));
  const isAllSelected = pending.length > 0 && visibleSelectedSubs.length === pending.length;
  return {
    visibleSelectedSubs,
    visibleSelectedCount: visibleSelectedSubs.length,
    isAllSelected
  };
}

/**
 * Toggles "Select All" on visible pending submissions.
 * If all visible items are currently selected, deselects all visible items.
 * Otherwise, selects all visible items.
 *
 * @param {Array} pendingSubmissions
 * @param {Set|Array} currentSelectedIds
 * @returns {Set} New Set with updated selection IDs
 */
export function toggleSelectAllPending(pendingSubmissions = [], currentSelectedIds = new Set()) {
  const pending = Array.isArray(pendingSubmissions) ? pendingSubmissions : [];
  const next = new Set(currentSelectedIds || []);
  const allSelected = pending.length > 0 && pending.every(s => next.has(s?.id));
  if (allSelected) {
    pending.forEach(s => next.delete(s?.id));
  } else {
    pending.forEach(s => next.add(s?.id));
  }
  return next;
}

/**
 * Prunes selected submission IDs against active pending submissions in the class.
 * Removes IDs of submissions that were reviewed, approved, rejected, or deleted.
 * Polymorphic argument order supports both (submissions, currentSelectedIds) and (currentSelectedIds, submissions).
 *
 * @param {Array|Set} arg1
 * @param {Array|Set} arg2
 * @returns {Set} Pruned Set containing only active pending submission IDs
 */
export function pruneSelectedSubmissionIds(arg1, arg2) {
  let submissions = [];
  let selectedIds = new Set();

  if (Array.isArray(arg1) && (arg2 instanceof Set || Array.isArray(arg2))) {
    submissions = arg1;
    selectedIds = arg2 instanceof Set ? arg2 : new Set(arg2 || []);
  } else if ((arg1 instanceof Set || Array.isArray(arg1)) && Array.isArray(arg2)) {
    selectedIds = arg1 instanceof Set ? arg1 : new Set(arg1 || []);
    submissions = arg2;
  } else if (arg1 instanceof Set) {
    selectedIds = arg1;
    submissions = Array.isArray(arg2) ? arg2 : [];
  } else if (Array.isArray(arg1)) {
    submissions = arg1;
    selectedIds = arg2 instanceof Set ? arg2 : new Set(arg2 || []);
  }

  if (!selectedIds || selectedIds.size === 0) return new Set();

  const validPendingIds = new Set(
    submissions
      .filter(s => s?.status === 'pending')
      .map(s => s?.id)
  );

  let changed = false;
  for (const id of selectedIds) {
    if (!validPendingIds.has(id)) {
      changed = true;
      break;
    }
  }

  if (!changed) return selectedIds;
  return new Set([...selectedIds].filter(id => validPendingIds.has(id)));
}

// ── FE-4: Revision Guidance Guardrail & Feedback Suggestions ──

export const DEFAULT_REVISION_FEEDBACK = 'Needs revision: Please review activity steps and resubmit.';

export const QUICK_REVISION_CHIPS = [
  "Add more detail to your explanation",
  "Check link permissions (must be public or shared)",
  "Include a clear photo or screenshot",
  "Review activity steps and verify all parts are completed",
  "Explain your code or thought process in your note"
];

/**
 * Resolves rejection guidance note.
 * If empty or only whitespace, returns DEFAULT_REVISION_FEEDBACK so students always
 * receive constructive, actionable feedback.
 *
 * @param {string} feedbackText
 * @returns {string}
 */
export function resolveRevisionFeedback(feedbackText) {
  const trimmed = typeof feedbackText === 'string'
    ? feedbackText.trim()
    : (feedbackText ? String(feedbackText).trim() : '');
  return trimmed || DEFAULT_REVISION_FEEDBACK;
}

// ── FE-6: Mobile Choice Board Category Filter Chips ──

/**
 * Calculates completion stats for a learning path across completed & approved activity sets.
 *
 * @param {Object} path - Learning path { id, options: [...] }
 * @param {Array} [completedActivities=[]]
 * @param {Array} [approvedActivities=[]]
 * @returns {{ count: number, total: number, isComplete: boolean }}
 */
export function calculatePathProgressStats(path, completedActivities = [], approvedActivities = []) {
  const options = Array.isArray(path?.options) ? path.options : [];
  const total = options.length;
  const completedSet = new Set([...(completedActivities || []), ...(approvedActivities || [])]);
  const count = options.filter(opt => completedSet.has(opt?.id)).length;
  return {
    count,
    total,
    isComplete: total > 0 && count === total
  };
}

/**
 * Filters learning paths based on the active category chip filter.
 * Returns all paths when filter is 'all', absent, or unmatched.
 *
 * @param {Array} learningPaths
 * @param {string} selectedFilter
 * @returns {Array}
 */
export function filterLearningPathsByChip(learningPaths, selectedFilter) {
  if (!Array.isArray(learningPaths)) return [];
  if (!selectedFilter || selectedFilter === 'all' || !learningPaths.some(p => p?.id === selectedFilter)) {
    return learningPaths;
  }
  return learningPaths.filter(p => p?.id === selectedFilter);
}

/**
 * Toggles a category chip. If the tapped category is already active, resets to 'all'.
 *
 * @param {string} currentFilter
 * @param {string} tappedId
 * @returns {string}
 */
export function toggleLearningPathFilter(currentFilter, tappedId) {
  return currentFilter === tappedId ? 'all' : tappedId;
}

// ── FE-7: Student Redeemed Rewards Log & Resilient Date Parsing ──

/**
 * Resiliently parses any timestamp / date representation into a finite numeric millisecond epoch.
 * Guaranteed to NEVER return NaN or Infinity; returns 0 for any invalid, null, undefined,
 * or corrupted values to satisfy V8 Timsort comparator invariants.
 *
 * Supported inputs:
 * - Firestore Timestamp objects ({ seconds, nanoseconds } or { _seconds, _nanoseconds })
 * - Firestore Timestamp instances with .toDate()
 * - ISO-8601 strings and RFC-2822 date strings
 * - Millisecond numbers and numeric strings
 * - JavaScript Date objects
 * - Empty objects {}, null, undefined, and non-date types (all return 0)
 *
 * @param {*} val
 * @returns {number} Finite epoch millisecond timestamp, or 0
 */
export function parseRedemptionTimeMs(val) {
  if (val === null || val === undefined || val === '') return 0;

  // Numeric epoch milliseconds or seconds
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }

  // JS Date instance
  if (val instanceof Date) {
    const ms = val.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }

  // Firestore Timestamp object (web SDK or Admin SDK)
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date) {
          const ms = d.getTime();
          return Number.isFinite(ms) ? ms : 0;
        }
      } catch {
        return 0;
      }
    }
    if (typeof val.seconds === 'number' && Number.isFinite(val.seconds)) {
      const nanos = (typeof val.nanoseconds === 'number' && Number.isFinite(val.nanoseconds)) ? val.nanoseconds : 0;
      return Math.floor(val.seconds * 1000 + nanos / 1000000);
    }
    if (typeof val._seconds === 'number' && Number.isFinite(val._seconds)) {
      const nanos = (typeof val._nanoseconds === 'number' && Number.isFinite(val._nanoseconds)) ? val._nanoseconds : 0;
      return Math.floor(val._seconds * 1000 + nanos / 1000000);
    }
    // Objects without date fields (e.g. empty object {}) must NOT be passed to new Date()
    return 0;
  }

  // String handling
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    // Pure numeric string
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : 0;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

/**
 * Formats a redemption item or timestamp into a localized date string.
 * Guaranteed to NEVER return "Invalid Date". If parsing yields <= 0 or invalid date,
 * gracefully defaults to fallback (defaults to 'Recently').
 *
 * @param {*} itemOrDate - Redemption object { redeemedAt, ... } or raw timestamp/date
 * @param {string} [fallback='Recently']
 * @returns {string} Formatted localized date or fallback
 */
export function formatRedemptionDate(itemOrDate, fallback = 'Recently') {
  if (!itemOrDate) return fallback;
  const raw = (typeof itemOrDate === 'object' && itemOrDate !== null && 'redeemedAt' in itemOrDate)
    ? itemOrDate.redeemedAt
    : itemOrDate;
  if (!raw) return fallback;
  const ms = parseRedemptionTimeMs(raw);
  if (!ms || ms <= 0) return fallback;
  try {
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Resolves the display label and styling metadata for a redemption status.
 *
 * @param {string} status
 * @returns {{ label: string, className: string }}
 */
export function getRedemptionStatusBadge(status) {
  if (status === 'fulfilled') {
    return {
      label: '✓ Fulfilled',
      className: 'bg-green-100 text-green-800 border border-green-500/40'
    };
  }
  if (status === 'cancelled') {
    return {
      label: '✕ Cancelled',
      className: 'bg-red-100 text-red-700 border border-red-500/40'
    };
  }
  return {
    label: '⏳ Waiting for Teacher',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-500/40'
  };
}

/**
 * Deterministically sorts an array of redemption records in descending chronological order (newest first).
 * Immune to V8 Timsort NaN breakdown because parseRedemptionTimeMs guarantees a finite number.
 *
 * @param {Array} redemptions
 * @returns {Array} New sorted array
 */
export function sortRedemptionsDescending(redemptions) {
  if (!Array.isArray(redemptions)) return [];
  return [...redemptions].sort((a, b) => {
    const timeA = parseRedemptionTimeMs(a?.redeemedAt);
    const timeB = parseRedemptionTimeMs(b?.redeemedAt);
    return timeB - timeA;
  });
}

/**
 * Filters a collection of class redemptions by a specific student (by ID or player name)
 * and returns them sorted newest first.
 *
 * @param {Array} redemptions - All class redemptions
 * @param {string} [studentId] - Student user/account ID
 * @param {string} [studentName] - Student display/player name
 * @returns {Array} Filtered and sorted redemptions
 */
export function filterAndSortRedemptions(redemptions, studentId, studentName) {
  if (!Array.isArray(redemptions)) return [];
  const normalizedName = (studentName || '').trim().toLowerCase();
  const filtered = redemptions.filter(r => {
    if (!r) return false;
    if (studentId && r.studentId === studentId) return true;
    if (normalizedName && r.studentName && r.studentName.trim().toLowerCase() === normalizedName) return true;
    return false;
  });
  return sortRedemptionsDescending(filtered);
}

// ── FE-10: Accessible Screen Reader Live Region Announcements ──

/**
 * Pure formatter for screen reader live region announcements.
 *
 * @param {'xp'|'xp_gain'|'level_up'|'achievement'} type
 * @param {Object} payload
 * @returns {string} Formatted announcement message
 */
export function formatLiveAnnouncement(type, payload = {}) {
  if (!type || !payload) return '';
  switch (type) {
    case 'xp':
    case 'xp_gain': {
      const diff = Number(payload.diff) || 0;
      const totalXp = Number(payload.totalXp ?? payload.total) || 0;
      if (diff <= 0) return '';
      return `Earned ${diff} XP! Total XP: ${totalXp}`;
    }
    case 'level_up': {
      const level = payload.level ?? payload.newLevel?.level ?? '';
      const title = payload.title || payload.newLevel?.title || 'Adventurer';
      if (!level) return '';
      return `Level Up! You reached Level ${level}: ${title}!`;
    }
    case 'achievement': {
      const title = payload.title || payload.name || payload.showAchievement?.title || payload.showAchievement?.name || 'New Badge';
      return `Achievement Unlocked: ${title}!`;
    }
    default:
      return typeof payload.message === 'string' ? payload.message : '';
  }
}
