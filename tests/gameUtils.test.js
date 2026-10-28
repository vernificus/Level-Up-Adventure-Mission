import assert from 'node:assert';
import {
  getLevelForXp,
  calculateLevelAndBonusCoins,
  getMostRecentMonday7am,
  resolveClassLearningPaths
} from '../src/utils/gameUtils.js';

console.log('Testing gameUtils...');

// 1. getLevelForXp tests
{
  assert.strictEqual(getLevelForXp(0).level, 1);
  assert.strictEqual(getLevelForXp(199).level, 1);
  assert.strictEqual(getLevelForXp(200).level, 2);
  assert.strictEqual(getLevelForXp(499).level, 2);
  assert.strictEqual(getLevelForXp(500).level, 3);
  assert.strictEqual(getLevelForXp(1400).level, 5);
  assert.strictEqual(getLevelForXp(62000).level, 25);
  assert.strictEqual(getLevelForXp(999999).level, 25);
}

// 2. calculateLevelAndBonusCoins tests
{
  const noGain = calculateLevelAndBonusCoins(100, 150);
  assert.strictEqual(noGain.bonusCoins, 0);
  assert.strictEqual(noGain.oldLevel.level, 1);
  assert.strictEqual(noGain.newLevel.level, 1);

  // Level 1 to Level 2 (200 XP required, 25 coins reward)
  const l1to2 = calculateLevelAndBonusCoins(100, 250);
  assert.strictEqual(l1to2.bonusCoins, 25);
  assert.strictEqual(l1to2.oldLevel.level, 1);
  assert.strictEqual(l1to2.newLevel.level, 2);

  // Level 1 to Level 3 (Level 2 = 25, Level 3 = 50 -> 75 total bonus coins)
  const l1to3 = calculateLevelAndBonusCoins(0, 600);
  assert.strictEqual(l1to3.bonusCoins, 75);
  assert.strictEqual(l1to3.oldLevel.level, 1);
  assert.strictEqual(l1to3.newLevel.level, 3);
}

// 3. getMostRecentMonday7am tests
{
  // Tuesday at 12:00 PM
  const tuesdayNoon = new Date('2026-10-27T12:00:00Z');
  const mondayFromTuesday = getMostRecentMonday7am(tuesdayNoon);
  assert.strictEqual(mondayFromTuesday.getDay(), 1, 'Should be Monday');
  assert.strictEqual(mondayFromTuesday.getHours(), 7, 'Should be 7 AM');

  // Monday at 8:00 AM (after 7am -> current Monday)
  const monday8am = new Date('2026-10-26T08:00:00');
  const monAfter7 = getMostRecentMonday7am(monday8am);
  assert.strictEqual(monAfter7.getDate(), monday8am.getDate());
  assert.strictEqual(monAfter7.getHours(), 7);

  // Monday at 6:00 AM (before 7am -> previous Monday)
  const monday6am = new Date('2026-10-26T06:00:00');
  const monBefore7 = getMostRecentMonday7am(monday6am);
  assert.strictEqual(monBefore7.getDate(), monday8am.getDate() - 7);
  assert.strictEqual(monBefore7.getHours(), 7);
}

// 4. resolveClassLearningPaths tests
{
  const mockClassDoc = {
    categoryNames: {
      'custom-1': 'AI & Robotics',
      'path-1': 'Coding Champions'
    },
    categorySubtitles: {
      'custom-1': 'Build future tech',
      'path-1': 'Python and Scratch'
    },
    categoryOrder: ['custom-1', 'path-1']
  };

  const resolved = resolveClassLearningPaths(mockClassDoc);
  assert(Array.isArray(resolved));
  // Filtered to only keys in categoryNames
  assert.strictEqual(resolved.length, 2);
  // Sorted according to categoryOrder
  assert.strictEqual(resolved[0].id, 'custom-1');
  assert.strictEqual(resolved[0].title, 'AI & Robotics');
  assert.strictEqual(resolved[0].subtitle, 'Build future tech');
  assert.strictEqual(resolved[1].id, 'path-1');
  assert.strictEqual(resolved[1].title, 'Coding Champions');
  assert.strictEqual(resolved[1].subtitle, 'Python and Scratch');
}

console.log('✔ gameUtils tests passed successfully!');
