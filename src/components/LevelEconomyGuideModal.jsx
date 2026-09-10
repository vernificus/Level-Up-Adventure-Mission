import React, { useState } from 'react';
import {
  X, Award, Coins, Sparkles, TrendingUp, Shield, Star, Gift,
  Zap, Swords, CheckCircle2, ChevronRight, HelpCircle, Package
} from 'lucide-react';
import { LEVELS, GUILD_LEVELS, XP_REWARDS, MYSTERY_REWARDS, GUILD_CHALLENGES } from '../data/gameData';

export default function LevelEconomyGuideModal({ isOpen, onClose, initialTab = 'levels' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  // Calculate cumulative coins for each level
  let runningCoins = 0;
  const levelsWithCumulative = LEVELS.map((lvl, idx) => {
    runningCoins += (lvl.coinReward || 0);
    const prevXp = idx === 0 ? 0 : LEVELS[idx - 1].xpRequired;
    const xpDelta = lvl.xpRequired - prevXp;
    return {
      ...lvl,
      xpDelta,
      cumulativeCoins: runningCoins
    };
  });

  // Guild STEM tier mapping
  const guildStemTierMap = {
    1: 'Tier 1 (Prototyping Materials & Drafting)',
    2: 'Tier 2 (Structural Brackets & Fasteners)',
    3: 'Tier 3 (Motors, Gears & Power Cells)',
    4: 'Tier 3 (Extended Modules)',
    5: 'Tier 4 (Microcontrollers, Sensors & VEX Pitch Access)',
    6: 'Tier 4 (Advanced Robotics Kits)',
    7: 'Tier 5 (3D Printing Filament & Custom CNC)',
    8: 'Tier 5 (Autonomous Sensor Arrays)',
    9: 'Tier 5 (Master Engineering Lab Access)',
    10: 'Tier 5 (Legendary Prototyping Suite)'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Level Progression & Gold Guide
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Experience points (XP) needed for each level, gold rewards, and STEM supply tiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-4 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'levels'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Student Levels (1–25)</span>
          </button>

          <button
            onClick={() => setActiveTab('economy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'economy'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>XP & Gold Economy</span>
          </button>

          <button
            onClick={() => setActiveTab('guilds')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'guilds'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Guild Levels & STEM Tiers</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: STUDENT LEVELS TABLE */}
          {activeTab === 'levels' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-white">25 Epic Levels of Mastery</div>
                    <div className="text-xs text-slate-300">
                      Students earn gold with every level up. Completing all 25 levels awards <strong className="text-yellow-400">7,625 Total Coins</strong>!
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span>Starting Rank: <strong className="text-slate-400">Rookie (Lvl 1)</strong></span>
                  <span>•</span>
                  <span>Max Rank: <strong className="text-amber-300">Godlike (Lvl 25)</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Title / Rank</th>
                      <th className="py-3 px-4">Total XP Needed</th>
                      <th className="py-3 px-4">XP To Reach</th>
                      <th className="py-3 px-4 text-amber-400">Gold Reward</th>
                      <th className="py-3 px-4 text-slate-300">Cumulative Gold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
                    {levelsWithCumulative.map((l) => (
                      <tr key={l.level} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-black text-white">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs">
                            {l.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className={l.color}>{l.title}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-200">
                          {l.xpRequired.toLocaleString()} XP
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-xs">
                          {l.level === 1 ? 'Start' : `+${l.xpDelta.toLocaleString()} XP`}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-yellow-400">
                          {l.coinReward > 0 ? `🪙 +${l.coinReward}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">
                          🪙 {l.cumulativeCoins.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: XP & GOLD ECONOMY */}
          {activeTab === 'economy' && (
            <div className="space-y-6">
              {/* How XP is earned */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  How Students Earn Experience (XP)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>High Tech Activities</span>
                      <span className="text-emerald-400 font-mono font-bold">150 XP</span>
                    </div>
                    <p className="text-slate-400 mt-1">Coding, video creation, robotics, digital design</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Collaboration Activities</span>
                      <span className="text-emerald-400 font-mono font-bold">130 XP</span>
                    </div>
                    <p className="text-slate-400 mt-1">Partner projects, peer reviews, team building</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Self-Reflection Activities</span>
                      <span className="text-emerald-400 font-mono font-bold">120 XP</span>
                    </div>
                    <p className="text-slate-400 mt-1">Written journals, learning retrospectives, goals</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Low Tech Activities</span>
                      <span className="text-emerald-400 font-mono font-bold">100 XP</span>
                    </div>
                    <p className="text-slate-400 mt-1">Hand-drawn sketches, physical models, graphic organizers</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 sm:col-span-2">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span>Daily Quest Match</span>
                      <span className="text-amber-400 font-mono font-bold">2x Double XP (Up to 300 XP)</span>
                    </div>
                    <p className="text-slate-400 mt-1">Matching the featured Daily Quest category doubles the activity XP</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 sm:col-span-2">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span>Weekly Boss Challenges</span>
                      <span className="text-amber-400 font-mono font-bold">300 to 350+ XP</span>
                    </div>
                    <p className="text-slate-400 mt-1">Completing the class or district collaborative boss challenge</p>
                  </div>
                </div>
              </div>

              {/* How Gold is earned & spent */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  How Students Earn & Spend Gold (Coins)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ways to Earn */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Sources of Gold</div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>Reaching New Levels</span>
                        <span className="text-yellow-400">🪙 +25 to +1,000</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Automatic reward every time a student levels up</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>Mystery Boxes</span>
                        <span className="text-yellow-400">🪙 +25 / +50 / +100</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Awarded every 3 completed activities & after Boss battles</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>Weekly Boss Battles</span>
                        <span className="text-yellow-400">🪙 +100 to +120</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Given to all students upon weekly boss defeat</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>Guild Challenges</span>
                        <span className="text-yellow-400">🪙 +60 to +100</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Team milestones completed together with guildmates</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>Teacher Bonus Grants</span>
                        <span className="text-yellow-400">🪙 Custom Amount</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Teachers can award bonus coins via the Roster Manager</p>
                    </div>
                  </div>

                  {/* Ways to Spend */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Where Gold Can Be Spent</div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-amber-400" />
                        <span>Guild STEM Supplies Depot</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Students spend their individual coins to buy physical STEM materials, prototyping gears, sensors, VEX pitch arena access, and 3D printing filament for their guild!
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>Avatar Customization Shop</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Students personalize their 3D game character with custom hats, outfits, auras, accessories, and glowing skins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUILD LEVELS & STEM TIERS */}
          {activeTab === 'guilds' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs sm:text-sm text-slate-300">
                <div className="font-bold text-white mb-1">Guild Progression & Tiered STEM Unlocking</div>
                When students complete activities, all XP earned also contributes to their Guild's collective XP pool. As the guild levels up, higher tiers of STEM supplies become available for purchase!
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">Guild Level</th>
                      <th className="py-3 px-4">Rank Title</th>
                      <th className="py-3 px-4">Team XP Required</th>
                      <th className="py-3 px-4">STEM Supplies Unlocked</th>
                      <th className="py-3 px-4">Guild Perk / Theme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
                    {GUILD_LEVELS.map((g) => (
                      <tr key={g.level} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-black text-white">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs">
                            Lvl {g.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-300">
                          {g.name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {g.minXp.toLocaleString()} XP
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-emerald-400">
                          {guildStemTierMap[g.level] || 'All Tiers Unlocked'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          <span className="mr-1">{g.perkIcon}</span> {g.perk}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Level Up: Adventure Mission • Student Progression & STEM Economy
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
