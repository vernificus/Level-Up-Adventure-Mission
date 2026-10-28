import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Trophy, Swords, Clock, Play, Pause, RotateCcw, Volume2, VolumeX,
  Maximize2, Minimize2, Sparkles, CheckCircle2, Users, Zap, RefreshCw, Flame
} from 'lucide-react';
import { DEFAULT_15_GUILDS, GUILD_LEVELS, BOSS_CHALLENGES } from '../data/gameData';
import { getMostRecentMonday7am } from '../utils/gameUtils';

// Synthesize an arcade/makerspace chime using Web Audio API (no external audio file needed)
function playArenaChime(type = 'complete') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = type === 'complete'
      ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5] // C5, E5, G5, C6 fanfare
      : [440, 554.37, 659.25]; // A4, C#5, E5 start chime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.3);
    });
  } catch (e) {
    console.warn('Audio chime failed:', e);
  }
}

export default function ClubArenaModal({
  isOpen,
  onClose,
  classData,
  students = [],
  submissions = [],
  stemPurchases = [],
  activeBoss = null,
  onFulfillPurchase,
  onRefreshData
}) {
  // Countdown Timer State
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState(15 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStationLabel, setActiveStationLabel] = useState('VEX Robotics Pitch / Makerspace');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const arenaRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          if (soundEnabled) playArenaChime('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, soundEnabled]);

  // Auto-refresh arena data every 20 seconds while open
  useEffect(() => {
    if (!isOpen || !onRefreshData) return;
    const poll = setInterval(() => {
      onRefreshData();
    }, 20000);
    return () => clearInterval(poll);
  }, [isOpen, onRefreshData]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      arenaRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const startPresetTimer = (minutes, label) => {
    const total = minutes * 60;
    setInitialTimerSeconds(total);
    setTimerSeconds(total);
    if (label) setActiveStationLabel(label);
    setIsRunning(true);
    if (soundEnabled) playArenaChime('start');
  };

  // Compute Guild Standings
  const configuredGuilds = classData?.guilds?.length > 0 ? classData.guilds : DEFAULT_15_GUILDS;
  const guildStatsMap = {};
  configuredGuilds.forEach(g => {
    guildStatsMap[g.id] = {
      ...g,
      totalXp: 0,
      members: [],
      botPhoto: classData?.guildData?.[g.id]?.botPhoto || null
    };
  });

  students.forEach(s => {
    if (s.guild && guildStatsMap[s.guild]) {
      const xp = Number(s.guildXpContributed) || Number(s.xp) || 0;
      guildStatsMap[s.guild].totalXp += xp;
      guildStatsMap[s.guild].members.push(s);
    }
  });

  // Show guilds that have members first, or top 8 guilds if none assigned yet
  const activeGuildList = Object.values(guildStatsMap)
    .sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      return b.members.length - a.members.length;
    });

  const guildsWithMembers = activeGuildList.filter(g => g.members.length > 0);
  const displayedGuilds = guildsWithMembers.length > 0 ? guildsWithMembers : activeGuildList.slice(0, 6);
  const maxGuildXp = Math.max(500, ...displayedGuilds.map(g => g.totalXp));

  const getGuildLevelInfo = (xp) => {
    let current = GUILD_LEVELS[0];
    for (const lvl of GUILD_LEVELS) {
      if (xp >= lvl.xpRequired) current = lvl;
      else break;
    }
    return current;
  };

  // Compute Shared Weekly Boss Raid HP
  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const currentBoss = activeBoss || BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const bossTotalHp = Number(currentBoss?.totalHP) || 1000;

  const weekStartMs = getMostRecentMonday7am().getTime();

  const weeklyApproved = submissions.filter(s => {
    if (s.status !== 'approved') return false;
    const ts = new Date(s.reviewedAt || s.submittedAt || 0).getTime();
    return ts >= weekStartMs;
  });

  const damageByStudent = {};
  const totalDamageDealt = weeklyApproved.reduce((sum, s) => {
    const dmg = s.isBoss ? 250 : 50;
    const name = s.playerName || 'Hero';
    damageByStudent[name] = (damageByStudent[name] || 0) + dmg;
    return sum + dmg;
  }, 0);

  const remainingHp = Math.max(0, bossTotalHp - totalDamageDealt);
  const hpPercent = Math.max(0, Math.min(100, Math.round((remainingHp / bossTotalHp) * 100)));
  const topRaiders = Object.entries(damageByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Pending STEM Depot Queue (VEX Pitch passes, 3D print queue, supplies)
  const pendingQueue = (stemPurchases || []).filter(p => p.status !== 'fulfilled');

  // Recent Approved Activity Ticker
  const recentApproved = [...submissions]
    .filter(s => s.status === 'approved' && !s.isCoOpCopy)
    .sort((a, b) => new Date(b.reviewedAt || b.submittedAt || 0) - new Date(a.reviewedAt || a.submittedAt || 0))
    .slice(0, 6);

  const timerProgress = initialTimerSeconds > 0
    ? Math.max(0, Math.min(100, (timerSeconds / initialTimerSeconds) * 100))
    : 0;

  return (
    <div
      ref={arenaRef}
      className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Live Club Arena Big-Screen Mode"
    >
      {/* Top Arena Header */}
      <header className="px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400">
            📺 Live STEM Club Arena — {classData?.name || 'Makerspace'}
          </h2>
          {classData?.code && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-yellow-400">
              Join Code: {classData.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Live Scores"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Timer Chime Sound ON' : 'Timer Chime Sound Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Toggle Projector Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" /> Exit Arena
          </button>
        </div>
      </header>

      {/* Main 12-Column Projector Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto">
        {/* LEFT 7 COLUMNS: Live Guild Race + Weekly Boss Raid */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Guild XP Race Standings */}
          <div className="bg-slate-900/90 border-2 border-yellow-500/40 rounded-2xl p-5 flex-1 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg sm:text-xl font-black uppercase italic text-white">
                  Live Guild XP Race
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {students.length} Club Members Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 content-start overflow-y-auto pr-1">
              {displayedGuilds.map((guild, idx) => {
                const lvlInfo = getGuildLevelInfo(guild.totalXp);
                const barWidth = Math.max(6, Math.min(100, Math.round((guild.totalXp / maxGuildXp) * 100)));
                const isFirst = idx === 0 && guild.totalXp > 0;

                return (
                  <div
                    key={guild.id}
                    className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                      isFirst
                        ? 'bg-gradient-to-br from-yellow-950/50 via-slate-900 to-slate-900 border-yellow-400 shadow-lg shadow-yellow-500/10'
                        : 'bg-slate-800/70 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl flex-shrink-0">{guild.icon || '🛡️'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-yellow-400">#{idx + 1}</span>
                            <h4 className="font-black text-white truncate text-sm sm:text-base">{guild.name}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 font-semibold">
                            Lv.{lvlInfo.level} {lvlInfo.title} • {guild.members.length} {guild.members.length === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base sm:text-lg font-black text-yellow-400">
                          {guild.totalXp.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Guild XP</span>
                      </div>
                    </div>

                    <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className={`h-full bg-gradient-to-r ${guild.color || 'from-blue-500 to-cyan-400'} rounded-full transition-all duration-700`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Club Weekly Boss Raid Bar */}
          <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-orange-950/50 border-2 border-red-500/60 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{currentBoss?.icon || '👹'}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-red-400">
                      Weekly Club Boss Raid
                    </span>
                    {remainingHp === 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-500 text-slate-950 rounded-full">
                        🎉 BOSS DEFEATED!
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white">{currentBoss?.name || 'The Glitch Dragon'}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-red-300">
                  {remainingHp.toLocaleString()} / {bossTotalHp.toLocaleString()} HP
                </p>
                <p className="text-xs text-orange-300 font-bold">
                  {totalDamageDealt.toLocaleString()} Total Club DMG Dealt
                </p>
              </div>
            </div>

            <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-red-500/40 p-0.5 mb-3">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 rounded-full transition-all duration-700"
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {topRaiders.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" /> Top Boss Raiders:
                </span>
                {topRaiders.map(([name, dmg], i) => (
                  <span
                    key={name}
                    className="text-xs bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-full font-bold text-white"
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⚔️'} {name}{' '}
                    <span className="text-orange-400">-{dmg} HP</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Complete missions (+50 DMG) or Boss Challenges (+250 DMG) to drain the Boss's HP!
              </p>
            )}
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: VEX Pitch & Makerspace Countdown Timer + STEM Queue + Live Feed */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* VEX Pitch / Makerspace Station Countdown Timer */}
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Station & VEX Pitch Timer
              </span>
              <span className="text-xs text-slate-400 font-semibold truncate max-w-[220px]">
                {activeStationLabel}
              </span>
            </div>

            {/* Giant Digital Clock */}
            <div
              className={`my-3 py-4 px-6 rounded-2xl border-2 text-center font-mono font-black tracking-wider text-5xl sm:text-6xl transition-colors ${
                timerSeconds === 0
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                  : isRunning
                  ? 'bg-slate-950 border-cyan-400 text-cyan-300'
                  : 'bg-slate-950/80 border-slate-700 text-white'
              }`}
            >
              {formatTime(timerSeconds)}
            </div>

            {/* Timer Progress Bar */}
            <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${timerProgress}%` }}
              />
            </div>

            {/* Primary Controls */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsRunning(prev => !prev)}
                className={`flex-1 py-2.5 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                {isRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimerSeconds(initialTimerSeconds);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={() => setTimerSeconds(prev => prev + 60)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs border border-slate-700"
              >
                +1m
              </button>
            </div>

            {/* Quick Makerspace Presets */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                onClick={() => startPresetTimer(5, '🧹 5-Min Makerspace Clean Up!')}
                className="py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 font-bold"
              >
                🧹 5m Clean
              </button>
              <button
                onClick={() => startPresetTimer(10, '⚡ 10-Min Build Sprint')}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold"
              >
                ⚡ 10m Sprint
              </button>
              <button
                onClick={() => startPresetTimer(15, '🏟️ 15-Min VEX Pitch Pass')}
                className="py-1.5 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 font-bold"
              >
                🏟️ 15m Pitch
              </button>
              <button
                onClick={() => startPresetTimer(30, '🏆 30-Min VEX Pitch Pass')}
                className="py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 font-bold"
              >
                🏆 30m Pitch
              </button>
            </div>
          </div>

          {/* VEX Pitch & STEM Supplies Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>🎟️ VEX Pitch & STEM Depot Queue</span>
              </h4>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                {pendingQueue.length} Waiting
              </span>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 italic py-4">
                No unfulfilled VEX Pitch passes or STEM supply orders in queue.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                {pendingQueue.map(order => {
                  const is30Min = (order.itemName || '').includes('30');
                  const isPitchOrTimer = (order.itemName || '').toLowerCase().includes('pitch') ||
                    (order.itemName || '').toLowerCase().includes('min') ||
                    order.category === 'perks';

                  return (
                    <div
                      key={order.id}
                      className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">
                          {order.itemIcon || '🎟️'} {order.itemName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {order.studentName} {order.guildName ? `• ${order.guildName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPitchOrTimer && (
                          <button
                            onClick={() => startPresetTimer(
                              is30Min ? 30 : 15,
                              `${order.studentName}: ${order.itemName}`
                            )}
                            className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1"
                            title="Load into Arena Timer"
                          >
                            <Play className="w-3 h-3" /> {is30Min ? '30m' : '15m'}
                          </button>
                        )}
                        {onFulfillPurchase && (
                          <button
                            onClick={() => onFulfillPurchase(order.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                            title="Mark Fulfilled"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Club Mission Ticker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Recent Approved Club Builds
            </h4>
            {recentApproved.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Approved missions will appear live here!</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recentApproved.map(sub => {
                  const collabCount = Array.isArray(sub.collaborators) ? sub.collaborators.length : 0;
                  return (
                    <div
                      key={sub.id}
                      className="text-xs bg-slate-800/70 border border-slate-700/70 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-200 truncate">
                        <strong className="text-yellow-400">{sub.playerName}</strong>
                        {collabCount > 0 && (
                          <span className="text-indigo-300 font-semibold">
                            {' '}+ {sub.collaborators.map(c => c.name).join(', ')}
                          </span>
                        )}{' '}
                        completed <span className="text-white font-semibold">{sub.activityTitle}</span>
                      </span>
                      <span className="text-emerald-400 font-black flex-shrink-0">
                        +{sub.xp || 100} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
