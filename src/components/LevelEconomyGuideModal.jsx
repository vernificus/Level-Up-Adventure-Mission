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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto dark:bg-slate-950/80">
      <div className="bg-slate-50 border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 flex items-center gap-2 dark:text-white">
                Level Progression & Gold Guide
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Experience points (XP) needed for each level, gold rewards, and STEM supply tiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-4 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'levels'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
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
                : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
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
                : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-100 border border-amber-500/20 rounded-2xl dark:bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber-800 flex-shrink-0 dark:text-amber-400" />
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">25 Epic Levels of Mastery</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      Students earn gold with every level up. Completing all 25 levels awards <strong className="text-yellow-800 dark:text-yellow-400">7,625 Total Coins</strong>!
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-300">
                  <span>Starting Rank: <strong className="text-slate-600 dark:text-slate-400">Rookie (Lvl 1)</strong></span>
                  <span>•</span>
                  <span>Max Rank: <strong className="text-amber-800 dark:text-amber-300">Godlike (Lvl 25)</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Title / Rank</th>
                      <th className="py-3 px-4">Total XP Needed</th>
                      <th className="py-3 px-4">XP To Reach</th>
                      <th className="py-3 px-4 text-amber-800 dark:text-amber-400">Gold Reward</th>
                      <th className="py-3 px-4 text-slate-700 dark:text-slate-300">Cumulative Gold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm dark:divide-slate-800">
                    {levelsWithCumulative.map((l) => (
                      <tr key={l.level} className="hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 font-mono text-xs dark:bg-slate-800 dark:border-slate-700">
                            {l.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className={l.color}>{l.title}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {l.xpRequired.toLocaleString()} XP
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 text-xs dark:text-slate-400">
                          {l.level === 1 ? 'Start' : `+${l.xpDelta.toLocaleString()} XP`}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-yellow-800 dark:text-yellow-400">
                          {l.coinReward > 0 ? `🪙 +${l.coinReward}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
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
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2 dark:text-white">
                  <Zap className="w-5 h-5 text-amber-800 dark:text-amber-400" />
                  How Students Earn Experience (XP)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-slate-900 flex items-center justify-between dark:text-white">
                      <span>High Tech Activities</span>
                      <span className="text-emerald-800 font-mono font-bold dark:text-emerald-400">150 XP</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Coding, video creation, robotics, digital design</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-slate-900 flex items-center justify-between dark:text-white">
                      <span>Collaboration Activities</span>
                      <span className="text-emerald-800 font-mono font-bold dark:text-emerald-400">130 XP</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Partner projects, peer reviews, team building</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-slate-900 flex items-center justify-between dark:text-white">
                      <span>Self-Reflection Activities</span>
                      <span className="text-emerald-800 font-mono font-bold dark:text-emerald-400">120 XP</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Written journals, learning retrospectives, goals</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-slate-900 flex items-center justify-between dark:text-white">
                      <span>Low Tech Activities</span>
                      <span className="text-emerald-800 font-mono font-bold dark:text-emerald-400">100 XP</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Hand-drawn sketches, physical models, graphic organizers</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-amber-800 flex items-center justify-between dark:text-amber-300">
                      <span>Daily Quest Match</span>
                      <span className="text-amber-800 font-mono font-bold dark:text-amber-400">2x Double XP (Up to 300 XP)</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Matching the featured Daily Quest category doubles the activity XP</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2 dark:bg-slate-900 dark:border-slate-800">
                    <div className="font-bold text-amber-800 flex items-center justify-between dark:text-amber-300">
                      <span>Weekly Boss Challenges</span>
                      <span className="text-amber-800 font-mono font-bold dark:text-amber-400">300 to 350+ XP</span>
                    </div>
                    <p className="text-slate-600 mt-1 dark:text-slate-400">Completing the class or district collaborative boss challenge</p>
                  </div>
                </div>
              </div>

              {/* How Gold is earned & spent */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2 dark:text-white">
                  <Coins className="w-5 h-5 text-yellow-800 dark:text-yellow-400" />
                  How Students Earn & Spend Gold (Coins)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ways to Earn */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Sources of Gold</div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Reaching New Levels</span>
                        <span className="text-yellow-800 dark:text-yellow-400">🪙 +25 to +1,000</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">Automatic reward every time a student levels up</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Mystery Boxes</span>
                        <span className="text-yellow-800 dark:text-yellow-400">🪙 +25 / +50 / +100</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">Awarded every 3 completed activities & after Boss battles</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Weekly Boss Battles</span>
                        <span className="text-yellow-800 dark:text-yellow-400">🪙 +100 to +120</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">Given to all students upon weekly boss defeat</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Guild Challenges</span>
                        <span className="text-yellow-800 dark:text-yellow-400">🪙 +60 to +100</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">Team milestones completed together with guildmates</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Teacher Bonus Grants</span>
                        <span className="text-yellow-800 dark:text-yellow-400">🪙 Custom Amount</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">Teachers can award bonus coins via the Roster Manager</p>
                    </div>
                  </div>

                  {/* Ways to Spend */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Where Gold Can Be Spent</div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 dark:text-white">
                        <Package className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                        <span>Guild STEM Supplies Depot</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">
                        Students spend their individual coins to buy physical STEM materials, prototyping gears, sensors, VEX pitch arena access, and 3D printing filament for their guild!
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 dark:text-white">
                        <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                        <span>Avatar Customization Shop</span>
                      </div>
                      <p className="text-slate-600 text-[11px] dark:text-slate-400">
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
              <div className="p-4 bg-blue-100 border border-blue-500/20 rounded-2xl text-xs sm:text-sm text-slate-700 dark:bg-blue-500/10 dark:text-slate-300">
                <div className="font-bold text-slate-900 mb-1 dark:text-white">Guild Progression & Tiered STEM Unlocking</div>
                When students complete activities, all XP earned also contributes to their Guild's collective XP pool. As the guild levels up, higher tiers of STEM supplies become available for purchase!
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                      <th className="py-3 px-4">Guild Level</th>
                      <th className="py-3 px-4">Rank Title</th>
                      <th className="py-3 px-4">Team XP Required</th>
                      <th className="py-3 px-4">STEM Supplies Unlocked</th>
                      <th className="py-3 px-4">Guild Perk / Theme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm dark:divide-slate-800">
                    {GUILD_LEVELS.map((g) => (
                      <tr key={g.level} className="hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 font-mono text-xs dark:bg-slate-800 dark:border-slate-700">
                            Lvl {g.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-800 dark:text-amber-300">
                          {g.name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {g.minXp.toLocaleString()} XP
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                          {guildStemTierMap[g.level] || 'All Tiers Unlocked'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
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
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between dark:border-slate-800 dark:bg-slate-950/60">
          <span className="text-xs text-slate-600 dark:text-slate-500">
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
