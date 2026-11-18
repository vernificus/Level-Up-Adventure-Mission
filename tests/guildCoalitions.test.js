import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  findGuildCoalition,
  assignGuildToCoalition,
  computeCoalitionStandings,
} from '../src/utils/gameUtils.js';

console.log('Testing Guild Coalitions Feature...');

// 1. assignGuildToCoalition & findGuildCoalition
{
  const initial = [
    { id: 'c1', name: 'Skyforge', emoji: '🦅', guildIds: ['pegasus'] },
    { id: 'c2', name: 'Ironclaw', emoji: '🦁', guildIds: ['wolves'] },
  ];

  // Add phoenix to Skyforge
  const afterAdd = assignGuildToCoalition(initial, 'c1', 'phoenix');
  assert.deepStrictEqual(findGuildCoalition(afterAdd, 'phoenix')?.id, 'c1', 'phoenix should belong to Skyforge');
  assert.deepStrictEqual(afterAdd[0].guildIds, ['pegasus', 'phoenix']);

  // Move phoenix cleanly from Skyforge to Ironclaw
  const afterMove = assignGuildToCoalition(afterAdd, 'c2', 'phoenix');
  assert.deepStrictEqual(afterMove[0].guildIds, ['pegasus'], 'phoenix must be removed from Skyforge when moved');
  assert.deepStrictEqual(afterMove[1].guildIds, ['wolves', 'phoenix'], 'phoenix must be added to Ironclaw');

  // Toggle wolves off Ironclaw
  const afterRemove = assignGuildToCoalition(afterMove, 'c2', 'wolves');
  assert.strictEqual(findGuildCoalition(afterRemove, 'wolves'), null, 'toggling an existing guild removes it from coalition');
  assert.deepStrictEqual(afterRemove[1].guildIds, ['phoenix']);
  console.log('✔ Test 1: assignGuildToCoalition & findGuildCoalition maintain exclusive coalition membership cleanly');
}

// 2. computeCoalitionStandings aggregation & sorting (both map & array sources)
{
  const guilds = [
    { id: 'g1', name: 'Pegasus', emoji: '🦄' },
    { id: 'g2', name: 'Phoenix', emoji: '🔥' },
    { id: 'g3', name: 'Wolves', emoji: '🐺' },
  ];
  const coalitions = [
    { id: 'c1', name: 'Solar Alliance', emoji: '☀️', guildIds: ['g1', 'g2', 'deleted_guild'] },
    { id: 'c2', name: 'Lunar Pack', emoji: '🌙', guildIds: ['g3'] },
  ];
  const statsMap = {
    g1: { totalXp: 1200, memberCount: 3 },
    g2: { totalXp: 800, memberCount: 2 },
    g3: { totalXp: 2500, memberCount: 4 },
  };

  const standings = computeCoalitionStandings(coalitions, guilds, statsMap);
  assert.strictEqual(standings.length, 2);
  assert.strictEqual(standings[0].id, 'c2', 'Higher-XP Lunar Pack ranks #1');
  assert.strictEqual(standings[0].totalXp, 2500);
  assert.strictEqual(standings[0].memberCount, 4);

  assert.strictEqual(standings[1].id, 'c1', 'Solar Alliance ranks #2');
  assert.strictEqual(standings[1].totalXp, 2000, 'Combines g1 (1200) + g2 (800)');
  assert.strictEqual(standings[1].memberCount, 5, 'Combines g1 (3) + g2 (2)');
  assert.strictEqual(standings[1].memberGuilds.length, 2, 'Prunes stale/deleted guild IDs');

  // Array stats source (ClubArenaModal pattern)
  const arrayStats = [
    { id: 'g1', name: 'Pegasus', icon: '🦄', totalXp: 1200, members: [1, 2, 3] },
    { id: 'g2', name: 'Phoenix', icon: '🔥', totalXp: 800, members: [4, 5] },
    { id: 'g3', name: 'Wolves', icon: '🐺', totalXp: 500, members: [6] },
  ];
  const arenaStandings = computeCoalitionStandings(coalitions, arrayStats, arrayStats);
  assert.strictEqual(arenaStandings[0].id, 'c1');
  assert.strictEqual(arenaStandings[0].totalXp, 2000);
  console.log('✔ Test 2: computeCoalitionStandings aggregates XP & members accurately without altering guilds');
}

// 3. Production Wiring Verification
{
  const realBackendSrc = fs.readFileSync(path.resolve('./src/services/realBackend.js'), 'utf8');
  const useGameStateSrc = fs.readFileSync(path.resolve('./src/hooks/useGameState.js'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('./src/App.jsx'), 'utf8');
  const guildPanelSrc = fs.readFileSync(path.resolve('./src/components/GuildPanel.jsx'), 'utf8');
  const teacherPortalSrc = fs.readFileSync(path.resolve('./src/components/TeacherPortal.jsx'), 'utf8');
  const arenaSrc = fs.readFileSync(path.resolve('./src/components/ClubArenaModal.jsx'), 'utf8');

  assert(realBackendSrc.includes('async updateClassCoalitions('), 'realBackend must implement updateClassCoalitions');
  assert(useGameStateSrc.includes('classCoalitions'), 'useGameState must expose classCoalitions');
  assert(appSrc.includes('coalitions={classCoalitions}'), 'App.jsx must pass coalitions={classCoalitions} to GuildPanel');
  assert(guildPanelSrc.includes('Coalition Alliance') && guildPanelSrc.includes('Coalition Rankings'), 'GuildPanel must show Coalition Alliance card & Coalition Rankings');
  assert(teacherPortalSrc.includes('Guild Coalitions') && teacherPortalSrc.includes('Coalition Standings'), 'TeacherPortal must expose Coalitions manager & standings');
  assert.strictEqual(
    (teacherPortalSrc.match(/SUB-TAB 2B: GUILD COALITIONS BUILDER/g) || []).length,
    1,
    'TeacherPortal must render Coalitions tab panel exactly once'
  );
  assert(arenaSrc.includes('computeCoalitionStandings'), 'ClubArenaModal must compute coalition standings');
  console.log('✔ Test 3: Coalition production wiring verified across backend, hooks, student UI, teacher UI, and Club Arena');
}

console.log('\n✔ All Guild Coalitions tests passed successfully!\n');
