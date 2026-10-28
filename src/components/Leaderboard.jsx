import React, { useState, useEffect } from 'react';
import { Trophy, X, Crown, Medal, Award, Flame, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { LEVELS, ACHIEVEMENTS, GUILDS, DEFAULT_15_GUILDS, getResolvedAchievements } from '../data/gameData';
import { realBackend as backend } from '../services/realBackend';
import { getLevelForXp } from '../utils/gameUtils';
import Avatar3D from './Avatar3D';

const RANK_ICONS = [
  <Crown className="w-6 h-6 text-yellow-400" aria-hidden="true" />,
  <Medal className="w-6 h-6 text-slate-300" aria-hidden="true" />,
  <Award className="w-6 h-6 text-amber-600" aria-hidden="true" />,
];

export default function Leaderboard({ classId, currentPlayerId, onClose, guilds = DEFAULT_15_GUILDS, learningPaths = [] }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('xp'); // 'xp', 'achievements', 'streak'
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const resolvedAchievements = getResolvedAchievements(learningPaths);

  useEffect(() => {
    loadLeaderboard();
  }, [classId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await backend.getClassLeaderboard(classId);
    setLeaderboard(data);
    setLoading(false);
  };

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortBy === 'achievements') return b.unlockedAchievements.length - a.unlockedAchievements.length;
    if (sortBy === 'streak') return b.currentStreak - a.currentStreak;
    return b.xp - a.xp;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg" aria-hidden="true">
                <Trophy className="w-6 h-6 text-slate-900" />
              </div>
              <h2 id="leaderboard-title" className="text-2xl font-black uppercase italic">Class Leaderboard</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close leaderboard">
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {/* Sort tabs */}
          <div className="flex gap-2 mt-4" role="tablist" aria-label="Sort leaderboard by">
            {[
              { key: 'xp', label: 'XP' },
              { key: 'achievements', label: 'Trophies' },
              { key: 'streak', label: 'Streak' },
            ].map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={sortBy === tab.key}
                onClick={() => setSortBy(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  sortBy === tab.key
                    ? 'bg-yellow-500 text-slate-900'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-slate-500" role="status">Loading leaderboard...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No students yet.</div>
          ) : (
            sorted.map((player, idx) => {
              const level = getLevelForXp(player.xp);
              const isCurrentPlayer = player.id === currentPlayerId;
              const isExpanded = expandedPlayer === player.id;
              const guild = player.guild
                ? (guilds || []).find(g => g.id === player.guild) || DEFAULT_15_GUILDS.find(g => g.id === player.guild) || GUILDS.find(g => g.id === player.guild)
                : null;

              return (
                <div key={player.id}>
                  <button
                    onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                      isCurrentPlayer
                        ? 'bg-yellow-500/10 border-2 border-yellow-500/50'
                        : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-600'
                    } ${idx < 3 ? 'ring-1 ring-yellow-500/20' : ''}`}
                    aria-expanded={isExpanded}
                    aria-label={`${player.name}, rank ${idx + 1}, level ${level.level} ${level.title}, ${player.xp} XP`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {idx < 3 ? RANK_ICONS[idx] : (
                        <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar3D avatar={player.avatar} level={level.level} size="sm" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white truncate">
                          {player.name}
                          {isCurrentPlayer && <span className="text-yellow-400 text-xs ml-1">(You)</span>}
                        </p>
                        {guild && <span className="text-sm" title={guild.name}>{guild.emoji}</span>}
                      </div>
                      <p className={`text-xs font-bold ${level.color}`}>
                        Lv.{level.level} {level.title}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      {sortBy === 'xp' && (
                        <span className="font-bold text-yellow-400">{player.xp} XP</span>
                      )}
                      {sortBy === 'achievements' && (
                        <span className="font-bold text-yellow-400">
                          {player.unlockedAchievements.length}/{ACHIEVEMENTS.length}
                        </span>
                      )}
                      {sortBy === 'streak' && (
                        <span className="font-bold text-orange-400 flex items-center gap-1">
                          <Flame className="w-4 h-4" aria-hidden="true" />
                          {player.currentStreak}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-1 ml-11 p-4 bg-slate-700/30 rounded-xl border border-slate-700 space-y-3">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-800 rounded-lg p-2">
                          <p className="text-lg font-bold text-yellow-400">{player.xp}</p>
                          <p className="text-xs text-slate-500">Total XP</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-2">
                          <p className="text-lg font-bold text-orange-400">{player.currentStreak}</p>
                          <p className="text-xs text-slate-500">Day Streak</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-2">
                          <p className="text-lg font-bold text-green-400">{player.totalActivitiesCompleted}</p>
                          <p className="text-xs text-slate-500">Activities</p>
                        </div>
                      </div>

                      {/* Achievements */}
                      {player.unlockedAchievements.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trophies</p>
                          <div className="flex flex-wrap gap-1.5">
                            {player.unlockedAchievements.map(achId => {
                              const ach = resolvedAchievements.find(a => a.id === achId) || ACHIEVEMENTS.find(a => a.id === achId);
                              if (!ach) return null;
                              return (
                                <span
                                  key={achId}
                                  className="bg-slate-800 px-2 py-1 rounded-lg text-sm"
                                  title={`${ach.title}: ${ach.desc}`}
                                >
                                  {ach.icon}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Guild */}
                      {guild && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          <span>{guild.emoji} {guild.name}</span>
                          <span className="text-yellow-400 font-bold ml-auto">{player.guildXpContributed} Guild XP</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
