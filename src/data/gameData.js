// XP and Leveling System
// coinReward: coins granted when a student reaches this level
export const LEVELS = [
  { level: 1, title: 'Rookie', xpRequired: 0, color: 'text-slate-400', coinReward: 0 },
  { level: 2, title: 'Apprentice', xpRequired: 200, color: 'text-green-400', coinReward: 25 },
  { level: 3, title: 'Challenger', xpRequired: 500, color: 'text-blue-400', coinReward: 50 },
  { level: 4, title: 'Warrior', xpRequired: 900, color: 'text-purple-400', coinReward: 75 },
  { level: 5, title: 'Champion', xpRequired: 1400, color: 'text-yellow-400', coinReward: 100 },
  { level: 6, title: 'Master', xpRequired: 2000, color: 'text-orange-400', coinReward: 125 },
  { level: 7, title: 'Legend', xpRequired: 2800, color: 'text-red-400', coinReward: 150 },
  { level: 8, title: 'Mythic', xpRequired: 3800, color: 'text-pink-400', coinReward: 200 },
  { level: 9, title: 'Titan', xpRequired: 5000, color: 'text-cyan-400', coinReward: 200 },
  { level: 10, title: 'Immortal', xpRequired: 6500, color: 'text-emerald-400', coinReward: 250 },
  { level: 11, title: 'Sentinel', xpRequired: 8200, color: 'text-blue-300', coinReward: 250 },
  { level: 12, title: 'Vanguard', xpRequired: 10100, color: 'text-violet-400', coinReward: 275 },
  { level: 13, title: 'Warden', xpRequired: 12200, color: 'text-amber-400', coinReward: 275 },
  { level: 14, title: 'Overlord', xpRequired: 14500, color: 'text-rose-400', coinReward: 300 },
  { level: 15, title: 'Sage', xpRequired: 17000, color: 'text-teal-400', coinReward: 350 },
  { level: 16, title: 'Archon', xpRequired: 19800, color: 'text-indigo-400', coinReward: 350 },
  { level: 17, title: 'Paragon', xpRequired: 22800, color: 'text-lime-400', coinReward: 375 },
  { level: 18, title: 'Sovereign', xpRequired: 26000, color: 'text-fuchsia-400', coinReward: 375 },
  { level: 19, title: 'Ascendant', xpRequired: 29500, color: 'text-sky-400', coinReward: 400 },
  { level: 20, title: 'Eternal', xpRequired: 33500, color: 'text-yellow-300', coinReward: 500 },
  { level: 21, title: 'Celestial', xpRequired: 38000, color: 'text-purple-300', coinReward: 500 },
  { level: 22, title: 'Transcendent', xpRequired: 43000, color: 'text-orange-300', coinReward: 500 },
  { level: 23, title: 'Apex', xpRequired: 48500, color: 'text-red-300', coinReward: 500 },
  { level: 24, title: 'Infinite', xpRequired: 55000, color: 'text-pink-300', coinReward: 500 },
  { level: 25, title: 'Godlike', xpRequired: 62000, color: 'text-amber-300', coinReward: 1000 },
];

export const XP_REWARDS = {
  'Low Tech': 100,
  'High Tech': 150,
  'Self-Reflection': 120,
  'Collaboration': 130,
  dailyBonus: 50,
  streakBonus: 25,
  bossChallenge: 300,
  mysteryBox: 75,
};

// Achievement Badges
export const ACHIEVEMENTS = [
  { id: 'first_mission', title: 'First Mission', desc: 'Complete your first activity', icon: '🚀', xpReward: 50 },
  { id: 'variety_pack', title: 'Variety Pack', desc: 'Try one activity from each path', icon: '🎨', xpReward: 100 },
  { id: 'streak_3', title: 'On Fire', desc: 'Complete activities 3 days in a row', icon: '🔥', xpReward: 75 },
  { id: 'streak_5', title: 'Streak Master', desc: 'Complete activities 5 days in a row', icon: '⚡', xpReward: 150 },
  { id: 'streak_10', title: 'Unstoppable', desc: '10 day streak!', icon: '💎', xpReward: 300 },
  { id: 'collab_3', title: 'Team Player', desc: 'Complete 3 Collaboration activities', icon: '🤝', xpReward: 100 },
  { id: 'creator_5', title: 'Creator Elite', desc: 'Complete 5 Creator path activities', icon: '🎬', xpReward: 150 },
  { id: 'wordsmith_5', title: 'Word Wizard', desc: 'Complete 5 Wordsmith activities', icon: '📚', xpReward: 150 },
  { id: 'data_5', title: 'Data Champion', desc: 'Complete 5 Data Scientist activities', icon: '📊', xpReward: 150 },
  { id: 'level_5', title: 'Rising Star', desc: 'Reach Level 5', icon: '⭐', xpReward: 200 },
  { id: 'level_10', title: 'Immortal Warrior', desc: 'Reach Level 10', icon: '🏅', xpReward: 500 },
  { id: 'level_15', title: 'Sage of Knowledge', desc: 'Reach Level 15', icon: '🔮', xpReward: 750 },
  { id: 'level_20', title: 'Eternal Champion', desc: 'Reach Level 20', icon: '👑', xpReward: 1000 },
  { id: 'level_25', title: 'Godlike', desc: 'Reach the max level!', icon: '💠', xpReward: 2000 },
  { id: 'boss_slayer', title: 'Boss Slayer', desc: 'Complete your first Boss Challenge', icon: '👑', xpReward: 200 },
  { id: 'lucky_draw', title: 'Lucky Draw', desc: 'Open 5 Mystery Boxes', icon: '🎁', xpReward: 100 },
  { id: 'guild_hero', title: 'Guild Hero', desc: 'Contribute 500 XP to your guild', icon: '🛡️', xpReward: 150 },
  { id: 'completionist', title: 'Completionist', desc: 'Complete all 6 regular activities', icon: '🏆', xpReward: 250 },
];

// Team Guilds - Palette of up to 15 guilds with customizable names, colors, mottos, and bot pictures
export const DEFAULT_15_GUILDS = [
  {
    id: 'dragons',
    name: 'Fire Dragons',
    color: 'bg-red-600',
    borderColor: 'border-red-500',
    gradient: 'from-red-600 to-orange-600',
    emoji: '🐉',
    motto: 'Burn bright, learn fast!',
    symbol: 'Flame & Claws',
    exclusiveItem: 'dragon_horns',
    botPictureUrl: '',
  },
  {
    id: 'wolves',
    name: 'Shadow Wolves',
    color: 'bg-purple-600',
    borderColor: 'border-purple-500',
    gradient: 'from-purple-600 to-indigo-600',
    emoji: '🐺',
    motto: 'Together we hunt knowledge!',
    symbol: 'Moon & Fang',
    exclusiveItem: 'wolf_cowl',
    botPictureUrl: '',
  },
  {
    id: 'phoenix',
    name: 'Golden Phoenix',
    color: 'bg-yellow-600',
    borderColor: 'border-yellow-500',
    gradient: 'from-yellow-500 to-amber-600',
    emoji: '🦅',
    motto: 'Rise from every challenge!',
    symbol: 'Sun & Feather',
    exclusiveItem: 'phoenix_crest',
    botPictureUrl: '',
  },
  {
    id: 'sharks',
    name: 'Ocean Sharks',
    color: 'bg-blue-600',
    borderColor: 'border-blue-500',
    gradient: 'from-blue-600 to-cyan-600',
    emoji: '🦈',
    motto: 'Dive deep into learning!',
    symbol: 'Tide & Fin',
    exclusiveItem: 'shark_fin',
    botPictureUrl: '',
  },
  {
    id: 'titans',
    name: 'Iron Titans',
    color: 'bg-slate-600',
    borderColor: 'border-slate-400',
    gradient: 'from-slate-600 to-zinc-500',
    emoji: '🤖',
    motto: 'Unbreakable code, unstoppable bots!',
    symbol: 'Gear & Anvil',
    exclusiveItem: 'cape',
    botPictureUrl: '',
  },
  {
    id: 'falcons',
    name: 'Cyber Falcons',
    color: 'bg-cyan-600',
    borderColor: 'border-cyan-400',
    gradient: 'from-cyan-600 to-blue-500',
    emoji: '⚡',
    motto: 'Swift as lightning, sharp as lasers!',
    symbol: 'Lightning & Talon',
    exclusiveItem: 'lightning',
    botPictureUrl: '',
  },
  {
    id: 'vipers',
    name: 'Quantum Vipers',
    color: 'bg-emerald-600',
    borderColor: 'border-emerald-400',
    gradient: 'from-emerald-600 to-teal-500',
    emoji: '🐍',
    motto: 'Precision strikes, silent victories!',
    symbol: 'Serpent & Helix',
    exclusiveItem: 'glasses',
    botPictureUrl: '',
  },
  {
    id: 'griffins',
    name: 'Solar Griffins',
    color: 'bg-amber-600',
    borderColor: 'border-amber-400',
    gradient: 'from-amber-600 to-yellow-500',
    emoji: '🦁',
    motto: 'Courage under the sun, honor in victory!',
    symbol: 'Wing & Shield',
    exclusiveItem: 'shield',
    botPictureUrl: '',
  },
  {
    id: 'bears',
    name: 'Cosmic Bears',
    color: 'bg-indigo-600',
    borderColor: 'border-indigo-400',
    gradient: 'from-indigo-600 to-purple-500',
    emoji: '🐻',
    motto: 'Strength across the galaxy!',
    symbol: 'Constellation & Paw',
    exclusiveItem: 'star',
    botPictureUrl: '',
  },
  {
    id: 'owls',
    name: 'Astro Owls',
    color: 'bg-teal-600',
    borderColor: 'border-teal-400',
    gradient: 'from-teal-600 to-emerald-500',
    emoji: '🦉',
    motto: 'Wisdom through observation, mastery through data!',
    symbol: 'Eye & Feather',
    exclusiveItem: 'wizard',
    botPictureUrl: '',
  },
  {
    id: 'cheetahs',
    name: 'Nebula Cheetahs',
    color: 'bg-orange-600',
    borderColor: 'border-orange-500',
    gradient: 'from-orange-600 to-amber-500',
    emoji: '🐆',
    motto: 'Accelerating beyond the speed of thought!',
    symbol: 'Comet & Paw',
    exclusiveItem: 'lightning',
    botPictureUrl: '',
  },
  {
    id: 'krakens',
    name: 'Abyss Krakens',
    color: 'bg-sky-600',
    borderColor: 'border-sky-400',
    gradient: 'from-sky-600 to-indigo-600',
    emoji: '🦑',
    motto: 'Unleash unstoppable curiosity from the depths!',
    symbol: 'Tentacle & Vortex',
    exclusiveItem: 'shark_fin',
    botPictureUrl: '',
  },
  {
    id: 'foxes',
    name: 'Solar Foxes',
    color: 'bg-rose-600',
    borderColor: 'border-rose-400',
    gradient: 'from-rose-600 to-orange-500',
    emoji: '🦊',
    motto: 'Clever strategies, radiant triumphs!',
    symbol: 'Flame & Mask',
    exclusiveItem: 'star',
    botPictureUrl: '',
  },
  {
    id: 'mantis',
    name: 'Cyber Mantis',
    color: 'bg-lime-600',
    borderColor: 'border-lime-400',
    gradient: 'from-lime-600 to-emerald-500',
    emoji: '🦗',
    motto: 'Sharp focus, lightning innovation!',
    symbol: 'Blade & Circuit',
    exclusiveItem: 'glasses',
    botPictureUrl: '',
  },
  {
    id: 'pegasus',
    name: 'Astral Pegasus',
    color: 'bg-fuchsia-600',
    borderColor: 'border-fuchsia-400',
    gradient: 'from-fuchsia-600 to-purple-600',
    emoji: '🦄',
    motto: 'Soaring past limits into infinite skies!',
    symbol: 'Wing & Star',
    exclusiveItem: 'cape',
    botPictureUrl: '',
  },
];

// Backward-compatible alias
export const DEFAULT_10_GUILDS = DEFAULT_15_GUILDS;

// Default base guilds (top 4, backward-compatible with legacy classes)
export const GUILDS = DEFAULT_15_GUILDS.slice(0, 4);

// Default STEM Supplies & Tiered Guild Rewards
export const DEFAULT_STEM_SUPPLIES = [
  {
    id: 'stem_tier1',
    name: 'Tier 1 STEM Supply Kit',
    tier: 1,
    requiredGuildLevel: 1,
    costCoins: 40,
    desc: 'Basic structural beams, shafts, and standard hardware connectors for your guild robot.',
    icon: '⚙️',
    category: 'supplies',
  },
  {
    id: 'stem_vex_pitch_1',
    name: 'Extra VEX Pitch Access (15 Mins)',
    tier: 1,
    requiredGuildLevel: 1,
    costCoins: 60,
    desc: 'Extra 15 minutes of reserved field testing time on the official VEX competition pitch.',
    icon: '⏱️',
    category: 'perk',
  },
  {
    id: 'stem_tier2',
    name: 'Tier 2 STEM Supply Pack',
    tier: 2,
    requiredGuildLevel: 3,
    costCoins: 90,
    desc: 'High-strength gears, sprocket chains, and specialized motor mounting brackets.',
    icon: '🔧',
    category: 'supplies',
  },
  {
    id: 'stem_vex_pitch_2',
    name: 'Extra VEX Pitch Access (30 Mins)',
    tier: 2,
    requiredGuildLevel: 3,
    costCoins: 120,
    desc: '30-minute priority block on the VEX field for autonomous coding calibration.',
    icon: '🤖',
    category: 'perk',
  },
  {
    id: 'stem_tier3',
    name: 'Tier 3 Advanced STEM Kit',
    tier: 3,
    requiredGuildLevel: 5,
    costCoins: 160,
    desc: 'Precision optical sensors, ultrasonic rangefinders, and high-torque gearing sets.',
    icon: '📡',
    category: 'supplies',
  },
  {
    id: 'stem_3d_print',
    name: 'Custom 3D Print Priority Pass',
    tier: 3,
    requiredGuildLevel: 5,
    costCoins: 180,
    desc: 'Front-of-the-line queue pass for 3D printing custom robot components or attachments.',
    icon: '🖨️',
    category: 'perk',
  },
  {
    id: 'stem_tier4',
    name: 'Tier 4 Master STEM Depot',
    tier: 4,
    requiredGuildLevel: 7,
    costCoins: 240,
    desc: 'Advanced pneumatic pistons, dual-intake rollers, and omni-directional drive wheels.',
    icon: '🚀',
    category: 'supplies',
  },
  {
    id: 'stem_tier5',
    name: 'Tier 5 Mythic Engineering Cache',
    tier: 5,
    requiredGuildLevel: 9,
    costCoins: 350,
    desc: 'Pro-grade competition alloy framing, high-speed flywheels, and custom guild vinyl decals.',
    icon: '💎',
    category: 'supplies',
  },
];

// Guild Progression Levels (1 - 10)
export const GUILD_LEVELS = [
  { level: 1, name: 'Novice Clan', minXp: 0, xpRequired: 0, perk: 'Basic Guild Hall & Emblems', perkIcon: '🛡️', themeUnlock: 'default' },
  { level: 2, name: 'Iron Vanguard', minXp: 1000, xpRequired: 1000, perk: '+5% Coin Surge on Quests', perkIcon: '🪙', themeUnlock: 'flames' },
  { level: 3, name: 'Bronze Sentinels', minXp: 2500, xpRequired: 2500, perk: 'Daily Guild High-Five Boost (+15 XP)', perkIcon: '⚡', themeUnlock: 'stars' },
  { level: 4, name: 'Silver Legion', minXp: 5000, xpRequired: 5000, perk: 'Team Mystery Box Luck Surge', perkIcon: '🎁', themeUnlock: 'forest' },
  { level: 5, name: 'Gold Crusaders', minXp: 8000, xpRequired: 8000, perk: 'Exclusive Guild Avatar Cosmetics', perkIcon: '👑', themeUnlock: 'ocean' },
  { level: 6, name: 'Platinum Titans', minXp: 12000, xpRequired: 12000, perk: 'Guild Crest Aura & Banner Flair', perkIcon: '✨', themeUnlock: 'crystal' },
  { level: 7, name: 'Emerald Phoenixes', minXp: 17000, xpRequired: 17000, perk: '+10% Collaboration Activity XP', perkIcon: '🤝', themeUnlock: 'volcano' },
  { level: 8, name: 'Ruby Conquerors', minXp: 23000, xpRequired: 23000, perk: 'Weekly Team Bonus Mystery Drop', perkIcon: '💎', themeUnlock: 'cyber' },
  { level: 9, name: 'Diamond Apex', minXp: 30000, xpRequired: 30000, perk: 'Celestial Castle Hall Theme', perkIcon: '🏰', themeUnlock: 'celestial' },
  { level: 10, name: 'Mythic Immortals', minXp: 40000, xpRequired: 40000, perk: 'Legendary Guild Crown & Immortal Banner', perkIcon: '🌟', themeUnlock: 'mythic' },
];

export function getGuildLevelInfo(totalXp = 0) {
  let current = GUILD_LEVELS[0];
  let next = GUILD_LEVELS[1] || null;

  for (let i = GUILD_LEVELS.length - 1; i >= 0; i--) {
    const lvlXp = GUILD_LEVELS[i].minXp ?? GUILD_LEVELS[i].xpRequired ?? 0;
    if (totalXp >= lvlXp) {
      current = GUILD_LEVELS[i];
      next = GUILD_LEVELS[i + 1] || null;
      break;
    }
  }

  let progress = 100;
  let xpNeeded = 0;
  if (next) {
    const nextXp = next.minXp ?? next.xpRequired ?? 0;
    const currentXp = current.minXp ?? current.xpRequired ?? 0;
    const range = Math.max(1, nextXp - currentXp);
    const earned = totalXp - currentXp;
    progress = Math.min(100, Math.max(0, Math.round((earned / range) * 100)));
    xpNeeded = Math.max(0, nextXp - totalXp);
  }

  return {
    level: current.level,
    name: current.name,
    perk: current.perk,
    perkIcon: current.perkIcon,
    currentXp: totalXp,
    nextLevelXp: next ? (next.minXp ?? next.xpRequired ?? totalXp) : totalXp,
    xpNeeded,
    progress,
    isMax: !next,
    unlockedThemes: GUILD_LEVELS.filter(l => l.level <= current.level).map(l => l.themeUnlock)
  };
}

// Guild Hall Trophy Types (awarded by teachers or earned through guild milestones)
export const GUILD_TROPHIES = [
  { id: 'gt_teamwork', title: 'Teamwork Trophy', icon: '🤝', desc: 'Outstanding collaboration' },
  { id: 'gt_knowledge', title: 'Knowledge Cup', icon: '📚', desc: 'Exceptional learning' },
  { id: 'gt_creativity', title: 'Creativity Award', icon: '🎨', desc: 'Most creative guild' },
  { id: 'gt_streak', title: 'Streak Flame', icon: '🔥', desc: 'Best streak consistency' },
  { id: 'gt_champion', title: 'Champion Shield', icon: '🛡️', desc: 'Weekly challenge champion' },
  { id: 'gt_mvp', title: 'MVP Crown', icon: '👑', desc: 'Most valuable guild' },
  { id: 'gt_rising', title: 'Rising Star', icon: '🌟', desc: 'Most improved guild' },
  { id: 'gt_spirit', title: 'Spirit Award', icon: '💫', desc: 'Best guild spirit' },
  { id: 'gt_boss', title: 'Titan Slayer', icon: '⚔️', desc: 'Conquered weekly bosses together' },
  { id: 'gt_level10', title: 'Mythic Hall', icon: '🏰', desc: 'Reached maximum Guild Level 10' },
];

// Guild Hall Banner Themes (unlocked as guild levels up)
export const GUILD_BANNERS = [
  { id: 'default', name: 'Classic Fortress', desc: 'The default stone guild fortress', minLevel: 1 },
  { id: 'flames', name: 'Inferno Citadel', desc: 'A blazing citadel of determination', minLevel: 2 },
  { id: 'stars', name: 'Starfield Sanctum', desc: 'A cosmic sanctum of deep knowledge', minLevel: 3 },
  { id: 'forest', name: 'Enchanted Sylvan', desc: 'An ancient canopy fortress', minLevel: 4 },
  { id: 'ocean', name: 'Atlantis Depths', desc: 'An aquatic palace of currents', minLevel: 5 },
  { id: 'crystal', name: 'Prismatic Caverns', desc: 'A sparkling crystal redoubt', minLevel: 6 },
  { id: 'volcano', name: 'Volcanic Caldera', desc: 'Molten magma battlegrounds', minLevel: 7 },
  { id: 'cyber', name: 'Cyber Neon Nexus', desc: 'Futuristic high-tech command center', minLevel: 8 },
  { id: 'celestial', name: 'Celestial Spire', desc: 'Floating spire among the clouds', minLevel: 9 },
  { id: 'mythic', name: 'Mythic Pantheon', desc: 'The golden realm of immortal champions', minLevel: 10 },
];

// Guild Challenges (weekly collaborative goals for entire guild)
export const GUILD_CHALLENGES = [
  {
    id: 'gc1',
    title: 'Knowledge Blitz',
    desc: 'Guild members complete 10 activities total this week',
    target: 10,
    type: 'activities',
    reward: 120,
    coinReward: 50,
    emoji: '⚔️'
  },
  {
    id: 'gc2',
    title: 'Streak Squad',
    desc: 'At least 3 guild members hold a 3+ day streak',
    target: 3,
    type: 'streakers',
    reward: 150,
    coinReward: 75,
    emoji: '🔥'
  },
  {
    id: 'gc3',
    title: 'Path Masters',
    desc: 'Guild members complete at least 2 activities from every learning path',
    target: 6,
    type: 'paths',
    reward: 140,
    coinReward: 60,
    emoji: '🗺️'
  },
  {
    id: 'gc4',
    title: 'Boss Rush Squad',
    desc: '2 or more guild members defeat the weekly boss challenge',
    target: 2,
    type: 'bosses',
    reward: 200,
    coinReward: 100,
    emoji: '👹'
  },
  {
    id: 'gc5',
    title: 'Collaboration Crusade',
    desc: 'Guild members complete 5 Collaboration-type activities together',
    target: 5,
    type: 'collab',
    reward: 160,
    coinReward: 80,
    emoji: '🤝'
  }
];

// Avatar Items
// Rendering is handled by the Avatar3D component based on item IDs.
// IDs are kept stable for backward compatibility with existing save data.
export const AVATAR_ITEMS = {
  colors: [
    { id: 'default', name: 'Ocean Blue', cost: 0 },
    { id: 'green', name: 'Forest Green', cost: 50 },
    { id: 'purple', name: 'Royal Purple', cost: 50 },
    { id: 'red', name: 'Fire Red', cost: 75 },
    { id: 'yellow', name: 'Golden', cost: 100 },
    { id: 'pink', name: 'Bubblegum', cost: 75 },
    { id: 'orange', name: 'Sunset Orange', cost: 75 },
    { id: 'teal', name: 'Teal Wave', cost: 75 },
    { id: 'black', name: 'Shadow', cost: 100 },
    { id: 'white', name: 'Arctic', cost: 100 },
    { id: 'rainbow', name: 'Rainbow', cost: 200 },
    { id: 'lava', name: 'Lava Flow', cost: 250 },
    { id: 'ice', name: 'Ice Crystal', cost: 250 },
    { id: 'galaxy', name: 'Galaxy', cost: 300 },
  ],
  hats: [
    { id: 'none', name: 'No Hat', cost: 0 },
    { id: 'cap', name: 'Baseball Cap', cost: 50 },
    { id: 'crown', name: 'Royal Crown', cost: 150 },
    { id: 'wizard', name: 'Wizard Hat', cost: 100 },
    { id: 'party', name: 'Party Hat', cost: 75 },
    { id: 'headphones', name: 'Headphones', cost: 100 },
    { id: 'tophat', name: 'Top Hat', cost: 125 },
    { id: 'viking', name: 'Viking Helm', cost: 175 },
    { id: 'beanie', name: 'Cozy Beanie', cost: 75 },
    { id: 'dragon_horns', name: 'Dragon Horns', cost: 200, guildExclusive: 'dragons' },
    { id: 'wolf_cowl', name: 'Wolf Headdress', cost: 200, guildExclusive: 'wolves' },
    { id: 'phoenix_crest', name: 'Phoenix Crest', cost: 200, guildExclusive: 'phoenix' },
    { id: 'shark_fin', name: 'Shark Fin Helm', cost: 200, guildExclusive: 'sharks' },
    { id: 'mythic_crown', name: 'Mythic Guild Crown', cost: 350 },
  ],
  accessories: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'glasses', name: 'Cool Shades', cost: 50 },
    { id: 'star', name: 'Star Badge', cost: 75 },
    { id: 'fire', name: 'Fire Aura', cost: 100 },
    { id: 'sparkle', name: 'Sparkles', cost: 125 },
    { id: 'lightning', name: 'Lightning Bolt', cost: 150 },
    { id: 'cape', name: 'Hero Cape', cost: 175 },
    { id: 'shield', name: 'Knight Shield', cost: 200 },
    { id: 'guild_cloak', name: 'Guild Banner Cloak', cost: 225 },
    { id: 'phoenix_wings', name: 'Phoenix Wings', cost: 275 },
  ],
  faces: [
    { id: 'happy', name: 'Happy', cost: 0 },
    { id: 'cool', name: 'Cool', cost: 25 },
    { id: 'excited', name: 'Excited', cost: 50 },
    { id: 'determined', name: 'Determined', cost: 50 },
    { id: 'smart', name: 'Smart', cost: 75 },
    { id: 'ninja', name: 'Ninja', cost: 100 },
    { id: 'wink', name: 'Wink', cost: 50 },
    { id: 'angry', name: 'Battle Cry', cost: 75 },
    { id: 'sleepy', name: 'Sleepy', cost: 50 },
  ],
};

// Daily Quests (rotate based on day)
export const DAILY_QUESTS = [
  { id: 'dq1', title: 'Voice Master', desc: 'Complete a High Tech activity', targetType: 'High Tech', multiplier: 2 },
  { id: 'dq2', title: 'Artistic Soul', desc: 'Complete a Low Tech activity', targetType: 'Low Tech', multiplier: 2 },
  { id: 'dq3', title: 'Team Spirit', desc: 'Complete a Collaboration activity', targetType: 'Collaboration', multiplier: 2 },
  { id: 'dq4', title: 'Self Discovery', desc: 'Complete a Self-Reflection activity', targetType: 'Self-Reflection', multiplier: 2 },
  { id: 'dq5', title: 'Word Warrior', desc: 'Complete any Wordsmith activity', targetPath: 'path1', multiplier: 1.5 },
  { id: 'dq6', title: 'Data Explorer', desc: 'Complete any Data Scientist activity', targetPath: 'path2', multiplier: 1.5 },
  { id: 'dq7', title: 'Creative Genius', desc: 'Complete any Creator activity', targetPath: 'path3', multiplier: 1.5 },
];

// Weekly Boss Challenges
export const BOSS_CHALLENGES = [
  {
    id: 'boss1',
    name: 'The Vocabulary Dragon',
    desc: 'Create a vocabulary comic strip that tells a story using 5 unit words!',
    requirements: 'Combine drawing skills with vocabulary knowledge',
    totalHP: 1000,
    reward: 300,
    steps: [
      'Plan your comic with 4-6 panels',
      'Include at least 5 vocabulary words in speech bubbles',
      'Draw characters and scenes that show word meanings',
      'Add a title and your name as the author',
    ],
  },
  {
    id: 'boss2',
    name: 'The Data Kraken',
    desc: 'Interview 3 classmates about their learning strategies and create a data report!',
    requirements: 'Combine collaboration with data analysis',
    totalHP: 1000,
    reward: 300,
    steps: [
      'Create 3 interview questions about study habits',
      'Interview 3 different classmates',
      'Organize their answers into a chart or graph',
      'Write 2 conclusions based on your data',
    ],
  },
  {
    id: 'boss3',
    name: 'The Tutorial Titan',
    desc: 'Create a mini-series of 3 short tutorial videos teaching different concepts!',
    requirements: 'Combine teaching skills with video creation',
    totalHP: 1000,
    reward: 300,
    steps: [
      'Choose 3 related topics from recent lessons',
      'Write a script for each 30-second video',
      'Record all 3 tutorials with clear explanations',
      'Add an intro that connects all 3 videos',
    ],
  },
];

// Mystery Box Rewards
export const MYSTERY_REWARDS = [
  { id: 'xp_small', name: 'XP Boost', desc: '+50 XP', type: 'xp', value: 50, rarity: 'common', color: 'text-green-400' },
  { id: 'xp_medium', name: 'XP Surge', desc: '+100 XP', type: 'xp', value: 100, rarity: 'uncommon', color: 'text-blue-400' },
  { id: 'xp_large', name: 'XP Jackpot', desc: '+200 XP', type: 'xp', value: 200, rarity: 'rare', color: 'text-purple-400' },
  { id: 'coins_small', name: 'Coin Pouch', desc: '+25 Coins', type: 'coins', value: 25, rarity: 'common', color: 'text-yellow-400' },
  { id: 'coins_medium', name: 'Coin Chest', desc: '+50 Coins', type: 'coins', value: 50, rarity: 'uncommon', color: 'text-yellow-400' },
  { id: 'coins_large', name: 'Treasure Trove', desc: '+100 Coins', type: 'coins', value: 100, rarity: 'rare', color: 'text-yellow-400' },
  { id: 'streak_shield', name: 'Streak Shield', desc: 'Protects your streak for 1 day', type: 'item', value: 'streak_shield', rarity: 'rare', color: 'text-orange-400' },
  { id: 'double_xp', name: 'Double XP Token', desc: 'Next activity gives 2x XP', type: 'item', value: 'double_xp', rarity: 'epic', color: 'text-pink-400' },
];

// Maximum number of categories teachers can create
export const MAX_CATEGORIES = 6;

// Default color classes for learning paths (cycles if more paths are added)
export const PATH_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-orange-600',
  'bg-green-600',
  'bg-pink-600',
  'bg-teal-600',
];

// Learning Paths (activities)
export const LEARNING_PATHS = [
  {
    id: 'path1',
    title: 'The Wordsmith',
    subtitle: 'Vocabulary Quest',
    icon: 'Mic',
    color: 'bg-blue-600',
    options: [
      {
        id: '1a',
        title: 'Voice Battle',
        desc: 'Record yourself defining 5 unit words.',
        type: 'High Tech',
        xp: 150,
        steps: [
          "Open your voice recording tool (like Vocaroo or Mote).",
          "Read the word clearly, then explain it in your own words.",
          "Use the 'Pro Tip' below to earn extra XP!",
          "Submit the link to your teacher."
        ],
        proTip: "Try to use the word in a sentence about your favorite video game for a bonus!"
      },
      {
        id: '1b',
        title: 'Word Sketch',
        desc: 'Draw a visual representation of 3 complex terms.',
        type: 'Low Tech',
        xp: 100,
        steps: [
          "Grab a blank piece of paper and divide it into three sections.",
          "Write the vocabulary word at the top of each section.",
          "Draw a picture that shows the word's meaning without using letters.",
          "Write one sentence underneath explaining your drawing."
        ],
        proTip: "Use colors that match the 'mood' of the word (e.g., bright colors for 'energetic')."
      }
    ]
  },
  {
    id: 'path2',
    title: 'The Data Scientist',
    subtitle: 'Progress Mission',
    icon: 'BarChart3',
    color: 'bg-purple-600',
    options: [
      {
        id: '2a',
        title: 'Goal Tracker',
        desc: 'Update your Lexia/Math chart.',
        type: 'Self-Reflection',
        xp: 120,
        steps: [
          "Open your data folder and find your progress chart.",
          "Check your minutes/units for this week.",
          "Color in your progress bar to show where you are.",
          "Identify one 'Power Move' (a specific action) to reach your goal by Friday."
        ],
        proTip: "A Power Move is specific, like 'I will complete 2 units before lunch.'"
      },
      {
        id: '2b',
        title: 'Peer Interview',
        desc: 'Ask a friend how they beat a hard level today.',
        type: 'Collaboration',
        xp: 130,
        steps: [
          "Find a partner who has finished their 'Must-Do' work.",
          "Ask: 'What was the hardest part of your work today, and how did you push through?'",
          "Write down or record their strategy.",
          "Thank your partner for the 'Pro Tip'!"
        ],
        proTip: "Listen for 'Growth Mindset' words like 'practiced,' 'tried again,' or 'focused.'"
      }
    ]
  },
  {
    id: 'path3',
    title: 'The Creator',
    subtitle: 'Expression Boss',
    icon: 'Palette',
    color: 'bg-orange-600',
    options: [
      {
        id: '3a',
        title: 'Tutorial Video',
        desc: 'Film a 60-second "How-To" for a 4th grader.',
        type: 'High Tech',
        xp: 150,
        steps: [
          "Choose a topic from today's lesson that you understand well.",
          "Write a 3-sentence script: Hook, Explanation, and Summary.",
          "Record your video using a camera or screen-recording tool.",
          "Make sure your voice is clear and you show examples!"
        ],
        proTip: "Imagine you are a YouTuber! Start with an exciting intro."
      },
      {
        id: '3b',
        title: 'Boss Map',
        desc: 'Sketch the steps to solve a big problem.',
        type: 'Low Tech',
        xp: 100,
        steps: [
          "Identify the 'Final Boss' (the hardest problem in the unit).",
          "Draw a 'Map' that shows the path to solving it.",
          "Include 'Checkpoints' for each step of the work.",
          "Label any 'Traps' (common mistakes) to avoid!"
        ],
        proTip: "Make it look like a real game map with start and finish lines."
      }
    ]
  }
];
