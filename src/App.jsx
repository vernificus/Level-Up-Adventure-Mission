import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Gamepad2, Mic, BarChart3, Palette, CheckCircle2, Trophy, Rocket, Info, X, PlayCircle,
  Star, Gift, Swords, Users, User, Sparkles, Zap, Shield, ShieldCheck, Crown, Target, Building2,
  Upload, Link, Link2, Clock, CheckCheck, XCircle, ClipboardList, Lock, Eye, FileText, LogOut,
  MessageSquare, Pencil, BookOpen, Award, ChevronDown, ChevronUp, RotateCcw, RefreshCw, ExternalLink, Filter, Camera, Video
} from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import {
  LEVELS, ACHIEVEMENTS, GUILDS, AVATAR_ITEMS, BOSS_CHALLENGES, LEARNING_PATHS, GUILD_CHALLENGES,
  GUILD_TROPHIES, GUILD_BANNERS, PATH_COLORS, getResolvedAchievements
} from './data/gameData';
import { compressImageFile } from './utils/imageUtils';
import { renderFormattedText } from './utils/textUtils';
import { getLevelForXp, getMostRecentMonday7am } from './utils/gameUtils';
import {
  calculatePathProgressStats,
  filterLearningPathsByChip,
  toggleLearningPathFilter,
  filterAndSortRedemptions,
  formatRedemptionDate,
  getRedemptionStatusBadge,
  formatLiveAnnouncement
} from './utils/portalUtils';
import { AuthProvider, useAuth, isAdminUser } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import { FileViewer } from './components/FileViewer';
import Avatar3D, { AvatarColorSwatch, AvatarPreviewHead } from './components/Avatar3D';
import Leaderboard from './components/Leaderboard';
import LegalModal from './components/LegalModal';
import GuildPanel from './components/GuildPanel';
import LevelEconomyGuideModal from './components/LevelEconomyGuideModal';
import { realBackend as backend } from './services/realBackend';

const IconMap = { Mic, BarChart3, Palette, BookOpen };

// ============== PLAYER STATS BAR ==============
function PlayerStats({
  gameState,
  getCurrentLevel,
  getNextLevelXp,
  onOpenProfile,
  onOpenMysteryBox,
  onOpenSubmissions,
  pendingSubmissions = 0,
  rejectedSubmissions = 0,
  totalSubmissions = 0
}) {
  const currentLevel = getCurrentLevel();
  const nextLevelXp = getNextLevelXp();
  const progress = ((gameState.xp - currentLevel.xpRequired) / (nextLevelXp - currentLevel.xpRequired)) * 100;
  const { logout } = useAuth();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onOpenProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label={`Open profile for ${gameState.playerName || 'Player'}, Level ${currentLevel.level} ${currentLevel.title}`}>
          <Avatar3D avatar={gameState.avatar} level={currentLevel.level} size="sm" />
          <div className="text-left">
            <p className="font-bold text-slate-900">{gameState.playerName || 'Player'}</p>
            <p className={`text-sm font-bold ${currentLevel.color}`}>Lv.{currentLevel.level} {currentLevel.title}</p>
          </div>
        </button>

        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600" id="xp-label">XP</span>
            <span className="text-yellow-800 font-bold">{gameState.xp} / {nextLevelXp}</span>
          </div>
          <div
            className="h-3 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-labelledby="xp-label"
            aria-valuenow={gameState.xp}
            aria-valuemin={currentLevel.xpRequired}
            aria-valuemax={nextLevelXp}
            aria-valuetext={`${gameState.xp} of ${nextLevelXp} XP, ${Math.round(Math.min(progress, 100))}% to next level`}
          >
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-800" role="status" aria-label={`${gameState.coins} coins`}>
            <Star className="w-5 h-5 fill-yellow-400" aria-hidden="true" />
            <span className="font-bold">{gameState.coins}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-800" role="status" aria-label={`${gameState.currentStreak} day streak`}>
            <Zap className="w-5 h-5" aria-hidden="true" />
            <span className="font-bold">{gameState.currentStreak}</span>
          </div>
          {/* Submissions button: ALWAYS accessible so students can view history & feedback */}
          <button
            onClick={onOpenSubmissions}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
              rejectedSubmissions > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                : pendingSubmissions > 0
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                : totalSubmissions > 0
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={
              rejectedSubmissions > 0
                ? `${rejectedSubmissions} activity needs revision - click to see teacher feedback!`
                : pendingSubmissions > 0
                ? `${pendingSubmissions} pending submission(s) awaiting teacher review`
                : totalSubmissions > 0
                ? `View your ${totalSubmissions} submission(s) and teacher feedback`
                : 'View your submitted work'
            }
            aria-label="View my submissions and teacher feedback"
          >
            {rejectedSubmissions > 0 ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fix ({rejectedSubmissions})</span>
              </>
            ) : pendingSubmissions > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{pendingSubmissions} Pending</span>
              </>
            ) : (
              <>
                <ClipboardList className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                <span>My Work{totalSubmissions > 0 ? ` (${totalSubmissions})` : ''}</span>
              </>
            )}
          </button>
          {gameState.pendingMysteryBoxes > 0 && (
            <button
              onClick={onOpenMysteryBox}
              className="text-white flex items-center gap-1 bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg animate-pulse"
              aria-label={`Open ${gameState.pendingMysteryBoxes} mystery box${gameState.pendingMysteryBoxes !== 1 ? 'es' : ''}`}
            >
              <Gift className="w-5 h-5" aria-hidden="true" />
              <span className="font-bold">{gameState.pendingMysteryBoxes}</span>
            </button>
          )}
          <button
             onClick={logout}
             className="ml-2 text-slate-600 hover:text-slate-900"
             aria-label="Logout"
           >
             <LogOut className="w-5 h-5" aria-hidden="true" />
           </button>
        </div>
      </div>

      {(gameState.doubleXpActive || gameState.streakShieldActive) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200" role="status" aria-label="Active power-ups">
          {gameState.doubleXpActive && (
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" aria-hidden="true" /> 2x XP Active
            </span>
          )}
          {gameState.streakShieldActive && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" aria-hidden="true" /> Streak Protected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============== DAILY QUEST BANNER ==============
function DailyQuestBanner({ quest, completed }) {
  return (
    <section className={`mb-6 p-4 rounded-xl border-2 ${completed ? 'bg-green-50 border-green-600' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-500'}`} aria-label="Daily Quest">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-white p-2 rounded-lg ${completed ? 'bg-green-600' : 'bg-purple-600'}`} aria-hidden="true">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-700">Daily Quest</p>
            <p className="font-bold text-slate-900">{quest.title}</p>
            <p className="text-sm text-slate-600">{quest.desc}</p>
          </div>
        </div>
        <div className="text-right">
          {completed ? (
            <span className="text-green-800 font-bold flex items-center gap-1" role="status">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> Complete!
            </span>
          ) : (
            <span className="text-yellow-800 font-bold">{quest.multiplier}x XP</span>
          )}
        </div>
      </div>
    </section>
  );
}

// ============== BOSS CHALLENGE ==============
function BossChallenge({
  completedBosses,
  onSubmit,
  hasPendingSubmission,
  activeBoss,
  classSubmissions = [],
  classStudents = [],
  currentUserId = null,
  currentGuild = null
}) {
  const [showBoss, setShowBoss] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const defaultBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const currentBoss = activeBoss || defaultBoss;
  const isCompleted = completedBosses.includes(currentBoss.id);

  // Calculate Shared Club Weekly Boss HP from approved class submissions since Monday 7:00am
  const bossTotalHp = Number(currentBoss.totalHP) || 1000;
  const weekStartMs = getMostRecentMonday7am().getTime();

  const weeklyApproved = (classSubmissions || []).filter(s => {
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
  const isClubBossDefeated = remainingHp === 0;
  const topDamagers = Object.entries(damageByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleSubmit = async (submissionData) => {
    await onSubmit(currentBoss, submissionData);
    setShowSubmitForm(false);
    setShowBoss(false);
  };

  return (
    <>
      <button
        onClick={() => setShowBoss(true)}
        className={`mb-6 w-full p-4 rounded-xl border-2 text-left transition-all ${
          isCompleted || isClubBossDefeated
            ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-500/70'
            : hasPendingSubmission
            ? 'bg-blue-50 border-blue-500'
            : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-500 hover:border-red-400'
        }`}
        aria-label={`Weekly Boss: ${currentBoss.name}${isCompleted ? ' - Defeated' : hasPendingSubmission ? ' - Pending approval' : ` - ${currentBoss.reward} XP reward`}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`text-white p-2 rounded-lg ${isCompleted || isClubBossDefeated ? 'bg-emerald-600' : hasPendingSubmission ? 'bg-blue-600' : 'bg-red-600'}`} aria-hidden="true">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">Club Weekly Boss Raid</p>
                {currentBoss.source === 'class' && (
                  <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    Class Custom
                  </span>
                )}
                {currentBoss.source === 'org' && (
                  <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    District / Org
                  </span>
                )}
                {isClubBossDefeated && (
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    🎉 Club Raid Victory!
                  </span>
                )}
              </div>
              <p className="font-display font-bold text-slate-900 text-lg">{currentBoss.name}</p>
            </div>
          </div>

          {isCompleted ? (
            <span className="text-green-800 font-bold flex items-center gap-1">
              <Crown className="w-5 h-5" aria-hidden="true" /> You Defeated!
            </span>
          ) : hasPendingSubmission ? (
            <span className="text-blue-700 font-bold flex items-center gap-1">
              <Clock className="w-5 h-5" aria-hidden="true" /> Pending
            </span>
          ) : (
            <span className="text-yellow-800 font-bold">+{currentBoss.reward} XP</span>
          )}
        </div>

        {/* Shared Club Boss HP Bar */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>❤️ Boss HP:</span>
              <span className={isClubBossDefeated ? 'text-emerald-800 font-bold' : 'text-red-700 font-bold'}>
                {remainingHp.toLocaleString()} / {bossTotalHp.toLocaleString()} HP
              </span>
            </span>
            <span className="text-[11px] text-slate-600">
              Club dealt <strong className="text-orange-800">{totalDamageDealt.toLocaleString()} DMG</strong> this week
            </span>
          </div>
          <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div
              className={`text-white h-full rounded-full transition-all duration-700 ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-red-600 to-orange-500'
                  : hpPercent > 20
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-600 to-pink-500 animate-pulse'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          {topDamagers.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600">Top Raiders:</span>
              {topDamagers.map(([name, dmg], i) => (
                <span key={name} className="text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-slate-800 font-semibold">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {name} <span className="text-orange-800 font-bold">-{dmg} HP</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {showBoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="boss-dialog-title" onKeyDown={(e) => e.key === 'Escape' && setShowBoss(false)}>
          <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowBoss(false)} className="absolute top-4 right-4 text-slate-600 hover:text-slate-900" aria-label="Close boss challenge">
              <X className="w-6 h-6" aria-hidden="true" />
            </button>

            {!showSubmitForm ? (
              <>
                <div className="text-center mb-5">
                  <div className="text-6xl mb-3" aria-hidden="true">{currentBoss.icon || '👹'}</div>
                  <h3 id="boss-dialog-title" className="text-2xl font-display font-bold text-red-700">{currentBoss.name}</h3>
                  {currentBoss.title && <p className="text-xs text-yellow-800 font-bold uppercase tracking-wider mt-0.5">{currentBoss.title}</p>}
                  <p className="text-slate-600 mt-2">{currentBoss.desc}</p>
                </div>

                {/* Live Club Raid HP Box inside Modal */}
                <div className="bg-slate-50 border border-red-500/40 rounded-xl p-3.5 mb-5">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-red-700">👹 Shared Club Boss HP</span>
                    <span className="font-bold text-slate-900">{remainingHp.toLocaleString()} / {bossTotalHp.toLocaleString()} HP</span>
                  </div>
                  <div className="h-3.5 bg-slate-50 rounded-full overflow-hidden border border-slate-200 p-0.5 mb-2">
                    <div
                      className="text-white h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Every approved activity deals <strong className="text-orange-800">50 DMG</strong> and every Boss Challenge deals <strong className="text-red-700">250 DMG</strong> to the club boss!
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Battle Plan:</h4>
                  <ol className="space-y-3">
                    {(currentBoss.steps || []).map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-yellow-100 border border-yellow-500/30 p-4 rounded-xl mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Reward:</strong> {currentBoss.reward} XP + Mystery Box + Achievement + 250 Boss Damage!
                  </p>
                </div>

                {!isCompleted && !hasPendingSubmission && (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                  >
                    Submit My Work
                  </button>
                )}
                {hasPendingSubmission && (
                  <div className="text-center text-blue-700 font-bold py-3" role="status">
                    <Clock className="w-6 h-6 inline mr-2" aria-hidden="true" />
                    Waiting for teacher approval...
                  </div>
                )}
                {isCompleted && (
                  <div className="text-center text-green-800 font-bold py-3" role="status">
                    <CheckCircle2 className="w-6 h-6 inline mr-2" aria-hidden="true" />
                    Boss Defeated! Come back next week.
                  </div>
                )}
              </>
            ) : (
              <SubmissionForm
                activityTitle={currentBoss.name}
                task={currentBoss}
                onSubmit={handleSubmit}
                onCancel={() => setShowSubmitForm(false)}
                classStudents={classStudents}
                currentUserId={currentUserId}
                currentGuild={currentGuild}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Render a single step, handling both old string format and new object format
function renderStep(step, idx) {
  // Backward compat: old steps are plain strings
  const stepObj = typeof step === 'string' ? { text: step } : step;

  return (
    <li key={idx} className="flex gap-3 text-slate-700">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-yellow-800 flex items-center justify-center text-xs font-bold border border-slate-300">{idx + 1}</span>
      <div className="text-sm leading-relaxed">
        <span>{renderFormattedText(stepObj.text)}</span>
        {stepObj.link && (
          <a
            href={stepObj.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-1 text-blue-700 hover:text-blue-700 underline transition-colors"
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            {stepObj.linkText || stepObj.link}
          </a>
        )}
      </div>
    </li>
  );
}

// ============== SUBMISSION FORM ==============
function SubmissionForm({
  activityTitle,
  task,
  onSubmit,
  onCancel,
  classStudents = [],
  currentUserId = null,
  currentGuild = null
}) {
  const [submissionType, setSubmissionType] = useState('link');
  const [linkValue, setLinkValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [showCoOpPicker, setShowCoOpPicker] = useState(false);

  // Camera capture states (Photo)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraFileInputRef = useRef(null);

  // In-app Video recording states (Chromebook video)
  const [videoActive, setVideoActive] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isEncodingVideo, setIsEncodingVideo] = useState(false);
  const liveVideoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const videoTimerRef = useRef(null);
  const videoFileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const stopVideoStream = useCallback(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setVideoActive(false);
    setVideoRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      stopVideoStream();
    };
  }, [stopCamera, stopVideoStream]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam preview not supported on this browser. Use "Open Device Camera" below!');
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setCameraError('Could not access webcam. You can click "Upload / Take Photo from Device" below instead.');
    }
  };

  const snapPhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const maxDim = 1000;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setFileData(dataUrl);
    setFileName(`club-build-${new Date().toISOString().slice(0, 10)}.jpg`);
    setFileType('image/jpeg');
    stopCamera();
  };

  const startVideoCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam recording not supported on this browser. You can upload a recorded video file instead.');
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 854 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      videoStreamRef.current = stream;
      setVideoActive(true);
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.warn('Video camera access failed:', err);
      setCameraError('Could not access webcam & microphone. Check browser permissions or upload a video file.');
    }
  };

  const startVideoRecording = () => {
    if (!videoStreamRef.current) return;
    videoChunksRef.current = [];
    setVideoDuration(0);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (typeof MediaRecorder !== 'undefined') {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '');
      }
    }

    try {
      const options = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 350000, // 350 kbps: crisp 480p STEM demos while keeping video payload ultra-compact (~700KB for 15s)
        audioBitsPerSecond: 32000   // 32 kbps: clear student voice audio
      };
      let recorder;
      try {
        recorder = new MediaRecorder(videoStreamRef.current, options);
      } catch {
        recorder = new MediaRecorder(videoStreamRef.current, mimeType ? { mimeType } : undefined);
      }
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        setIsEncodingVideo(true);
        const rawType = recorder.mimeType || mimeType || 'video/webm';
        const cleanType = rawType.split(';')[0].trim() || 'video/webm';
        const blob = new Blob(videoChunksRef.current, { type: cleanType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setFileData(reader.result);
          setFileName(`chromebook-video-${new Date().toISOString().slice(0, 10)}.${cleanType.includes('mp4') ? 'mp4' : 'webm'}`);
          setFileType(cleanType);
          setIsEncodingVideo(false);
        };
        reader.onerror = (readErr) => {
          console.error("Error encoding recorded video blob:", readErr);
          setIsEncodingVideo(false);
        };
        reader.readAsDataURL(blob);
        const previewUrl = URL.createObjectURL(blob);
        setVideoPreviewUrl(previewUrl);
        stopVideoStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setVideoRecording(true);

      const maxSeconds = 45;
      videoTimerRef.current = setInterval(() => {
        setVideoDuration(prev => {
          if (prev >= maxSeconds - 1) {
            stopVideoRecording();
            return maxSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('MediaRecorder start error:', err);
      setCameraError('Recording failed: ' + err.message);
    }
  };

  const stopVideoRecording = () => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder', e);
      }
    }
    setVideoRecording(false);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Video file is too large. Please select a video under 20MB to preserve the class Free Tier storage.');
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target.result);
      setFileName(file.name);
      setFileType(file.type || 'video/mp4');
      setVideoPreviewUrl(URL.createObjectURL(file));
      setIsProcessing(false);
    };
    reader.onerror = () => {
      alert('Failed to read video file.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // Eligible teammates for Co-Op tagging (prioritize same guild first)
  const eligibleClassmates = (classStudents || [])
    .filter(s => s && s.id && s.id !== currentUserId)
    .sort((a, b) => {
      const aSameGuild = currentGuild && a.guild === currentGuild ? 1 : 0;
      const bSameGuild = currentGuild && b.guild === currentGuild ? 1 : 0;
      if (aSameGuild !== bSameGuild) return bSameGuild - aSameGuild;
      return (a.name || '').localeCompare(b.name || '');
    });

  const toggleCollaborator = (student) => {
    setSelectedCollaborators(prev => {
      const exists = prev.some(c => c.id === student.id);
      if (exists) return prev.filter(c => c.id !== student.id);
      if (prev.length >= 4) {
        alert('You can tag up to 4 Co-Op teammates on a single build.');
        return prev;
      }
      return [...prev, { id: student.id, name: student.name || 'Teammate', guild: student.guild || null }];
    });
  };

  const validSteps = (task?.steps || []).filter(s => {
    if (!s) return false;
    if (typeof s === 'string') return s.trim().length > 0;
    return s.text && s.text.trim().length > 0;
  });

  const hasDirections = Boolean(
    task && (validSteps.length > 0 || task.desc || task.requirements || task.proTip)
  );

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);

    // Auto-compress image files so Chromebook/tablet camera photos never fail the 900KB limit
    if (file.type && file.type.startsWith('image/')) {
      try {
        const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.82);
        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        setFileName(cleanName);
        setFileType('image/jpeg');
        setFileData(compressedDataUrl);
        setIsProcessing(false);
        return;
      } catch (err) {
        console.warn('Image compression fallback to raw file:', err);
      }
    }

    // Non-image file size check (limit to 900KB for Firestore)
    if (file.size > 900 * 1024) {
      alert('File is too large. Please upload a file smaller than 900KB (Firestore Limit), or paste a link instead.');
      setIsProcessing(false);
      return;
    }

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target.result);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isEncodingVideo) {
      alert('Your video recording is still preparing. Please wait a moment!');
      return;
    }
    if (submissionType === 'link' && !linkValue.trim()) {
      alert('Please enter a link to your work');
      return;
    }
    if ((submissionType === 'file' || submissionType === 'camera') && !fileData) {
      alert(submissionType === 'camera' ? 'Please snap or select a photo of your build first!' : 'Please select a file');
      return;
    }
    if (submissionType === 'video' && !fileData) {
      alert('Please record or choose a short video of your build first!');
      return;
    }
    if (submissionType === 'text' && !textValue.trim()) {
      alert('Please type your response');
      return;
    }

    stopCamera();
    stopVideoStream();

    const isFileMedia = submissionType === 'file' || submissionType === 'camera' || submissionType === 'video';
    let content;
    if (submissionType === 'link') content = linkValue.trim();
    else if (isFileMedia) content = fileData;
    else content = textValue.trim();

    setIsProcessing(true);
    try {
      await onSubmit({
        type: submissionType === 'video' ? 'video' : (isFileMedia ? 'file' : submissionType),
        content,
        fileData: isFileMedia ? fileData : null,
        fileName: isFileMedia ? (fileName || (submissionType === 'video' ? 'chromebook-video.webm' : 'photo.jpg')) : null,
        fileType: isFileMedia ? (fileType || (submissionType === 'video' ? 'video/webm' : 'image/jpeg')) : null,
        note: note.trim(),
        collaborators: selectedCollaborators
      });
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const typeButtons = [
    { type: 'camera', icon: Camera, label: 'Take Photo' },
    { type: 'video', icon: Video, label: 'Record Video' },
    { type: 'file', icon: Upload, label: 'Upload File' },
    { type: 'link', icon: Link, label: 'Paste Link' },
    { type: 'text', icon: MessageSquare, label: 'Type Response' },
  ];

  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="text-xl font-display font-bold text-slate-900">Submit Your Work</h3>
        <p className="text-slate-600 text-sm">
          for: <span className="text-yellow-800 font-bold">{activityTitle}</span>
        </p>
      </div>

      {hasDirections && (
        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
          <button
            type="button"
            onClick={() => setShowDirections(prev => !prev)}
            className="w-full px-4 py-2.5 bg-white hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-expanded={showDirections}
            aria-controls="submission-task-directions"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-yellow-800" aria-hidden="true" />
              <span className="font-bold text-sm text-slate-900">Task Directions</span>
              {validSteps.length > 0 && (
                <span className="text-[11px] font-semibold bg-slate-100 text-yellow-800 px-2 py-0.5 rounded-full border border-slate-300">
                  {validSteps.length} {validSteps.length === 1 ? 'step' : 'steps'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>{showDirections ? 'Hide Directions' : 'View Directions'}</span>
              {showDirections ? (
                <ChevronUp className="w-4 h-4 text-slate-600" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-600" aria-hidden="true" />
              )}
            </div>
          </button>

          {showDirections && (
            <div id="submission-task-directions" className="p-4 space-y-3 max-h-56 overflow-y-auto">
              {task.desc && (
                <p className="text-sm text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {renderFormattedText(task.desc)}
                </p>
              )}

              {task.requirements && (
                <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 p-2.5 rounded-lg">
                  <strong className="text-yellow-800">Requirements: </strong>
                  {renderFormattedText(task.requirements)}
                </div>
              )}

              {validSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Steps to follow:</h4>
                  <ol className="space-y-2">
                    {validSteps.map((step, idx) => renderStep(step, idx))}
                  </ol>
                </div>
              )}

              {task.proTip && (
                <div className="bg-blue-50 border border-blue-500/40 p-2.5 rounded-lg flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs text-blue-800">
                    <span className="font-bold uppercase tracking-wide text-blue-700 mr-1">Pro Tip:</span>
                    {renderFormattedText(task.proTip)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5" role="group" aria-label="Submission type">
        {typeButtons.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              if (type !== 'camera') stopCamera();
              if (type !== 'video') stopVideoStream();
              setSubmissionType(type);
            }}
            className={`py-2.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors ${
              submissionType === type ? 'bg-yellow-500 text-slate-900 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-pressed={submissionType === type}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {submissionType === 'camera' && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <input
            type="file"
            ref={cameraFileInputRef}
            onChange={handleFileChange}
            className="sr-only"
            accept="image/*"
            capture="environment"
          />

          {fileData && fileType?.startsWith('image/') ? (
            <div className="space-y-3">
              <img
                src={fileData}
                alt="Captured STEM build"
                className="max-h-60 mx-auto rounded-lg border-2 border-emerald-500 object-contain bg-slate-50"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFileData(null);
                    setFileName('');
                    startCamera();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake Photo
                </button>
              </div>
            </div>
          ) : cameraActive ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-64 rounded-lg border-2 border-yellow-500 bg-black mx-auto object-cover"
              />
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={snapPhotoFromVideo}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold uppercase rounded-xl flex items-center gap-2 text-sm shadow-lg"
                >
                  <Camera className="w-4 h-4" /> Snap Photo!
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Camera className="w-10 h-10 text-yellow-800 mx-auto" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-900">Snap a photo of your Robot, 3D Print, or STEM Build!</p>
              <p className="text-xs text-slate-600">Photos are automatically compressed to fit fast on Chromebooks & iPads.</p>
              {cameraError && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 p-2 rounded-lg">{cameraError}</p>
              )}
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl text-xs uppercase flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Start Webcam
                </button>
                <button
                  type="button"
                  onClick={() => cameraFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
                >
                  <Upload className="w-4 h-4" /> Open Device Camera / Choose Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {submissionType === 'video' && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <input
            type="file"
            ref={videoFileInputRef}
            onChange={handleVideoFileChange}
            className="sr-only"
            accept="video/*"
          />

          {fileData && fileType?.startsWith('video/') ? (
            <div className="space-y-3">
              <video
                src={videoPreviewUrl || fileData}
                controls
                className="max-h-60 mx-auto rounded-lg border-2 border-emerald-500 bg-black"
              />
              <p className="text-xs text-emerald-800 font-bold">
                ✓ Video ready to submit ({fileName || 'video.webm'})
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFileData(null);
                    setFileName('');
                    setFileType('');
                    setVideoPreviewUrl(null);
                    startVideoCamera();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake Video
                </button>
              </div>
            </div>
          ) : videoActive ? (
            <div className="space-y-3">
              <div className="relative max-w-md mx-auto">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-64 rounded-lg border-2 border-red-500 bg-black mx-auto object-cover"
                />
                {videoRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    REC {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')} / 0:45
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-2">
                {!videoRecording ? (
                  <button
                    type="button"
                    onClick={startVideoRecording}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold uppercase rounded-xl flex items-center gap-2 text-sm shadow-lg"
                  >
                    <span className="w-3 h-3 rounded-full bg-white" /> Start Recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopVideoRecording}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold uppercase rounded-xl flex items-center gap-2 text-sm shadow-lg animate-bounce"
                  >
                    <span className="w-3 h-3 rounded-sm bg-white" /> Stop Recording ({videoDuration}s)
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopVideoStream}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Video className="w-10 h-10 text-red-700 mx-auto" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-900">Record a Short Video Demo with Your Chromebook Camera!</p>
              <p className="text-xs text-slate-600">Record up to 45 seconds demonstrating your STEM build or robotics project.</p>
              {cameraError && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 p-2 rounded-lg">{cameraError}</p>
              )}
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={startVideoCamera}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5"
                >
                  <Video className="w-4 h-4" /> Start Camera & Mic
                </button>
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
                >
                  <Upload className="w-4 h-4" /> Upload Recorded Video
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {submissionType === 'link' && (
        <div className="mb-4">
          <label htmlFor="submission-link" className="block text-sm font-bold text-slate-700 mb-2">Link to your work</label>
          <input
            id="submission-link"
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
            aria-describedby="link-hint"
          />
          <p id="link-hint" className="text-xs text-slate-600 mt-2">Paste a link to Tinkercad, Scratch, VEXcode, Google Docs, or YouTube</p>
        </div>
      )}

      {submissionType === 'file' && (
        <div className="mb-4">
          <label htmlFor="submission-file" className="block text-sm font-bold text-slate-700 mb-2">Upload your file or photo</label>
          <input
            id="submission-file"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
            accept="image/*,.pdf,.doc,.docx,.mp3,.mp4,.stl"
            aria-describedby="file-hint"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-5 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors"
            aria-label={fileName ? `Selected file: ${fileName}. Click to change` : 'Click to select a file'}
          >
            {fileName ? (
              <span className="flex items-center justify-center gap-2 text-emerald-800 font-bold">
                <FileText className="w-5 h-5" aria-hidden="true" /> {fileName}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" aria-hidden="true" /> Click to select a photo or file
              </span>
            )}
          </button>
          {fileData && fileType?.startsWith('image/') && (
            <div className="mt-2 text-center">
              <img src={fileData} alt="Preview" className="max-h-40 mx-auto rounded-lg border border-slate-300 object-contain" />
            </div>
          )}
          <p id="file-hint" className="text-xs text-slate-600 mt-2">Photos are auto-compressed! Supports Images, PDFs, Docs, Audio, or Video</p>
        </div>
      )}

      {submissionType === 'text' && (
        <div className="mb-4">
          <label htmlFor="submission-text" className="block text-sm font-bold text-slate-700 mb-2">Your response</label>
          <textarea
            id="submission-text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type your answer or describe what you built and tested..."
            rows={5}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-yellow-500 focus:outline-none resize-y min-h-[120px]"
            aria-describedby="text-hint"
          />
          <p id="text-hint" className="text-xs text-slate-600 mt-2">Write your answer, explain your engineering design, or describe what you created</p>
        </div>
      )}

      {/* Note field - shown for link, file, and camera types */}
      {submissionType !== 'text' && (
        <div className="mb-4">
          <label htmlFor="submission-note" className="block text-sm font-bold text-slate-700 mb-2">Note to teacher (optional)</label>
          <textarea
            id="submission-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you want your teacher to know..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-yellow-500 focus:outline-none resize-none"
          />
        </div>
      )}

      {/* 🤝 Co-Op / Squad Teammates Selector */}
      {eligibleClassmates.length > 0 && (
        <div className="mb-5 bg-indigo-50 border border-indigo-500/40 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-700" aria-hidden="true" />
              <span className="text-xs font-bold text-indigo-800">
                🤝 Built this with a partner or squad?
              </span>
              {selectedCollaborators.length > 0 && (
                <span className="text-[11px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                  +{selectedCollaborators.length} tagged
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCoOpPicker(prev => !prev)}
              className="text-xs font-bold text-indigo-700 hover:text-slate-900 underline"
            >
              {showCoOpPicker ? 'Done' : selectedCollaborators.length > 0 ? 'Edit Squad' : 'Tag Teammates'}
            </button>
          </div>

          {selectedCollaborators.length > 0 && !showCoOpPicker && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedCollaborators.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-indigo-100 border border-indigo-400/50 text-indigo-800 px-2.5 py-0.5 rounded-full font-semibold">
                  🤝 {c.name}
                  <button
                    type="button"
                    onClick={() => toggleCollaborator(c)}
                    className="hover:text-rose-700 ml-1"
                    aria-label={`Remove ${c.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {showCoOpPicker && (
            <div className="mt-2.5 pt-2.5 border-t border-indigo-500/30">
              <p className="text-[11px] text-indigo-700 mb-2">
                Select up to 4 teammates who worked on this build with you. When your teacher approves, everyone tagged earns the XP!
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {eligibleClassmates.map(student => {
                  const isSelected = selectedCollaborators.some(c => c.id === student.id);
                  const isGuildmate = currentGuild && student.guild === currentGuild;
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleCollaborator(student)}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500/60'
                      }`}
                    >
                      <span className="truncate">{student.name}</span>
                      {isGuildmate && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 ml-1 flex-shrink-0">
                          Guild
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isProcessing || isEncodingVideo}
          className="flex-1 py-3 bg-yellow-500 text-slate-900 font-bold uppercase rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isEncodingVideo ? (
            <><RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" /> Preparing Video...</>
          ) : isProcessing ? (
            <><RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" /> Saving & Uploading...</>
          ) : (
            <><Rocket className="w-5 h-5" aria-hidden="true" /> Submit</>
          )}
        </button>
      </div>
    </div>
  );
}

// ============== FILE VIEWER COMPONENT ==============
// Shared component from FileViewer.jsx is used now

// ============== MY SUBMISSIONS ==============
function MySubmissions({ submissions = [], onClose, onReviseActivity }) {
  const [filter, setFilter] = useState('all'); // 'all', 'rejected', 'pending', 'approved'
  const [searchQuery, setSearchQuery] = useState('');

  const pendingSubs = submissions.filter(s => s.status === 'pending');
  const rejectedSubs = submissions.filter(s => s.status === 'rejected');
  const approvedSubs = submissions.filter(s => s.status === 'approved');

  const filtered = submissions.filter(s => {
    if (filter === 'rejected' && s.status !== 'rejected') return false;
    if (filter === 'pending' && s.status !== 'pending') return false;
    if (filter === 'approved' && s.status !== 'approved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = (s.activityTitle || '').toLowerCase();
      const note = (s.submissionNote || '').toLowerCase();
      const content = typeof s.submissionContent === 'string' ? s.submissionContent.toLowerCase() : '';
      const feedback = (s.teacherFeedback || '').toLowerCase();
      return title.includes(q) || note.includes(q) || content.includes(q) || feedback.includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submissions-dialog-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl text-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h3 id="submissions-dialog-title" className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-blue-700" aria-hidden="true" />
              <span>My Submitted Work</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review all activities you've submitted, check teacher feedback, and revise work.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 hover:bg-slate-100 transition-colors"
            aria-label="Close submissions"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'rejected'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : rejectedSubs.length > 0
                  ? 'text-rose-700 font-bold hover:text-rose-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Needs Revision ({rejectedSubs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-blue-700 hover:text-blue-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({pendingSubs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'approved'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-emerald-800 hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved ({approvedSubs.length})</span>
            </button>
          </div>

          {submissions.length > 3 && (
            <input
              type="text"
              placeholder="Search my work..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-600 focus:border-blue-400 focus:outline-none"
            />
          )}
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <ClipboardList className="w-12 h-12 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-base font-bold text-slate-900 mb-1">
                {submissions.length === 0
                  ? "No submissions yet!"
                  : "No submissions match this filter."}
              </p>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {submissions.length === 0
                  ? "Pick an activity on the board, complete the challenge, and click 'Submit My Work' to send it to your teacher!"
                  : "Try switching to another tab or clearing your search."}
              </p>
            </div>
          ) : (
            filtered.map(sub => {
              const isRejected = sub.status === 'rejected';
              const isApproved = sub.status === 'approved';
              const isPending = sub.status === 'pending';

              return (
                <div
                  key={sub.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isRejected
                      ? 'bg-rose-50 border-rose-500/60 shadow-lg shadow-rose-950/30'
                      : isApproved
                      ? 'bg-slate-50 border-emerald-500/40'
                      : 'bg-blue-50 border-blue-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {sub.isBoss && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-300">
                            Boss Challenge
                          </span>
                        )}
                        <span className="text-xs font-bold text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-500/30">
                          +{sub.xp || 100} XP
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900">{sub.activityTitle || 'Untitled Activity'}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Submitted: {new Date(sub.submittedAt || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-600/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-600/60">
                          <Clock className="w-3.5 h-3.5 text-blue-700" /> Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-500 animate-pulse">
                          <RotateCcw className="w-3.5 h-3.5 text-rose-700" /> Needs Revision
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Feedback Callout */}
                  {sub.teacherFeedback ? (
                    <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1 ${
                      isRejected
                        ? 'bg-rose-50 border-rose-500/50 text-rose-800'
                        : isApproved
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] mb-1">
                        {isRejected ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                            <span className="text-rose-700">Teacher's Instructions for Revision:</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                            <span className="text-blue-700">Teacher Feedback:</span>
                          </>
                        )}
                      </div>
                      <p className="italic font-medium text-sm leading-relaxed whitespace-pre-wrap">
                        "{sub.teacherFeedback}"
                      </p>
                      {sub.reviewedAt && (
                        <p className="text-[10px] text-slate-600 pt-1">
                          Reviewed: {new Date(sub.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : isRejected ? (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800">
                      <p className="font-semibold">Your teacher requested changes on this activity. Please review and resubmit!</p>
                    </div>
                  ) : null}

                  {/* Student Work Preview */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                      My Submission:
                    </span>
                    {sub.submissionType === 'link' ? (
                      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-blue-700 truncate font-mono text-xs">{sub.submissionContent}</span>
                        <a
                          href={sub.submissionContent}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </div>
                    ) : sub.submissionType === 'text' ? (
                      <div className="p-2 bg-slate-50 rounded text-slate-800 text-xs whitespace-pre-wrap max-h-28 overflow-y-auto border border-slate-200">
                        {sub.submissionContent || 'No text provided'}
                      </div>
                    ) : (
                      <div className="p-1 bg-slate-50 rounded border border-slate-200">
                        {sub.submissionContent ? (
                          <FileViewer
                            content={sub.submissionContent}
                            fileName={sub.fileName}
                            fileType={sub.fileType}
                            submissionId={sub.id}
                            isChunked={sub.isChunked}
                          />
                        ) : (
                          <span className="text-slate-600 italic">Attached file</span>
                        )}
                      </div>
                    )}

                    {sub.submissionNote && (
                      <p className="text-slate-600 italic mt-1.5 text-[11px]">
                        <strong>My note:</strong> "{sub.submissionNote}"
                      </p>
                    )}
                  </div>

                  {/* Revise & Resubmit Action */}
                  {isRejected && onReviseActivity && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onReviseActivity(sub.activityId, sub.pathId)}
                        className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revise & Resubmit This Activity</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
          <span>{submissions.length} total activity submission{submissions.length !== 1 ? 's' : ''} on record</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== TROPHY CASE ==============
function TrophyCase({ achievements, learningPaths = [], onClose }) {
  const resolvedAchievements = getResolvedAchievements(learningPaths);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="trophy-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 id="trophy-dialog-title" className="text-2xl font-display font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-800" aria-hidden="true" /> Trophy Case
          </h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900" aria-label="Close trophy case">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {resolvedAchievements.map(achievement => {
            const unlocked = achievements.includes(achievement.id);
            return (
              <div key={achievement.id} className={`p-4 rounded-xl border-2 text-center ${unlocked ? 'bg-slate-100 border-yellow-500' : 'bg-slate-50 border-dashed border-slate-300 grayscale'}`} aria-label={`${achievement.title}: ${achievement.desc}${unlocked ? ' - Unlocked' : ' - Locked'}`}>
                <div className={`text-4xl mb-2 ${unlocked ? '' : 'grayscale'}`} aria-hidden="true">{achievement.icon}</div>
                <p className="font-bold text-sm">{achievement.title}</p>
                <p className="text-xs text-slate-600 mt-1">{achievement.desc}</p>
                {unlocked && <p className="text-xs text-yellow-800 mt-2">+{achievement.xpReward} XP</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============== AVATAR BUILDER ==============
function AvatarBuilder({ gameState, getCurrentLevel, onBuy, onEquip, onClose, onSetName, classId, userId }) {
  const [activeTab, setActiveTab] = useState('colors');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(gameState.playerName);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [rewardsShopItems, setRewardsShopItems] = useState([]);
  const [redeemingItem, setRedeemingItem] = useState(null);
  const [redeemConfirm, setRedeemConfirm] = useState(false);
  const [rewardSubTab, setRewardSubTab] = useState('available');
  const [redeemedHistory, setRedeemedHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const currentLevel = getCurrentLevel ? getCurrentLevel() : { level: 1 };

  const loadRedeemedHistory = useCallback(async () => {
    if (!classId) return;
    setLoadingHistory(true);
    try {
      const all = await backend.getRedemptions(classId);
      setRedeemedHistory(filterAndSortRedemptions(all, userId, gameState?.playerName));
    } catch (err) {
      console.error('Error loading redemption history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [classId, userId, gameState?.playerName]);

  // Load teacher custom rewards for this class
  useEffect(() => {
    if (classId) {
      backend.getCustomRewards(classId).then(items => {
        setRewardsShopItems(items.filter(i => i.active !== false));
      }).catch(() => {});
      loadRedeemedHistory();
    }
  }, [classId, loadRedeemedHistory]);

  const tabs = [
    { id: 'colors', label: 'Skin', icon: '🎨' },
    { id: 'hats', label: 'Headgear', icon: '🎩' },
    { id: 'accessories', label: 'Effects', icon: '✨' },
    { id: 'faces', label: 'Expression', icon: '😎' },
    ...((rewardsShopItems.length > 0 || classId) ? [{ id: 'rewards', label: 'Rewards', icon: '🎁' }] : []),
  ];

  const items = activeTab === 'rewards' ? [] : (AVATAR_ITEMS[activeTab] || []);

  const TAB_TO_SLOT = {
    colors: 'color',
    hats: 'hat',
    accessories: 'accessory',
    faces: 'face'
  };
  const slotKey = TAB_TO_SLOT[activeTab] || activeTab.slice(0, -1);

  const currentAvatarNormalized = {
    color: gameState.avatar?.color || 'default',
    hat: gameState.avatar?.hat || 'none',
    face: gameState.avatar?.face || 'happy',
    accessory: gameState.avatar?.accessory || gameState.avatar?.accessorie || 'none'
  };

  // Preview avatar: show hovered item if any, otherwise current equipped
  const previewAvatar = hoveredItem
    ? { ...currentAvatarNormalized, ...hoveredItem }
    : currentAvatarNormalized;

  const handleRedeemReward = async (item) => {
    if (gameState.coins < item.cost) return;
    setRedeemingItem(item);
    setRedeemConfirm(true);
  };

  const confirmRedeem = async () => {
    if (!redeemingItem || !classId) return;
    try {
      await backend.redeemCustomReward(classId, redeemingItem.id, {
        studentId: userId,
        studentName: gameState.playerName,
        itemName: redeemingItem.name,
        cost: redeemingItem.cost,
        directions: redeemingItem.directions,
      });
      // Deduct coins via the onBuy mechanism - use a special non-equip buy
      onBuy(`reward_${redeemingItem.id}`, redeemingItem.cost);
      setRedeemConfirm(false);
      setRedeemingItem(null);
      loadRedeemedHistory();
      alert('Reward redeemed! Your teacher will be notified. Follow the directions to claim your reward.');
    } catch (error) {
      alert('Error redeeming reward: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="avatar-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="avatar-dialog-title" className="text-2xl font-display font-bold flex items-center gap-2">
            <User className="w-8 h-8 text-yellow-800" aria-hidden="true" /> My Avatar
          </h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900" aria-label="Close avatar builder">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Avatar preview + info side by side */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {/* Large avatar preview with hover preview */}
          <div className="flex-shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-200 relative">
            <Avatar3D avatar={previewAvatar} level={currentLevel.level} size="lg" animate={true} />
            {hoveredItem && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded">
                Preview
              </div>
            )}
          </div>

          {/* Player info + currently equipped summary */}
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex gap-2 justify-center sm:justify-start mb-3">
                <label htmlFor="avatar-name" className="sr-only">Your name</label>
                <input
                  id="avatar-name"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-900"
                  placeholder="Your name"
                  maxLength={20}
                />
                <button onClick={() => { onSetName(tempName); setEditingName(false); }} className="px-3 py-1.5 bg-yellow-500 text-slate-900 rounded-lg font-bold text-sm">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="text-lg font-bold text-slate-900 hover:text-yellow-800 transition-colors mb-1 block" aria-label={`Edit name: ${gameState.playerName || 'not set'}`}>
                {gameState.playerName || 'Click to set name'} <span className="text-sm text-slate-600">edit</span>
              </button>
            )}

            <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
              <div className="flex items-center gap-1 text-yellow-800">
                <Star className="w-4 h-4 fill-yellow-400" aria-hidden="true" />
                <span className="font-bold">{gameState.coins} coins</span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="text-xs text-slate-600">{gameState.ownedItems.length} items owned</span>
            </div>

            {/* Currently equipped items summary */}
            <div className="bg-slate-100 rounded-lg p-3 border border-slate-300 mb-3">
              <p className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-2">Currently Equipped</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Skin', value: AVATAR_ITEMS.colors.find(c => c.id === currentAvatarNormalized.color)?.name || 'Default' },
                  { label: 'Hat', value: AVATAR_ITEMS.hats.find(h => h.id === currentAvatarNormalized.hat)?.name || 'None' },
                  { label: 'Effect', value: AVATAR_ITEMS.accessories.find(a => a.id === currentAvatarNormalized.accessory)?.name || 'None' },
                  { label: 'Face', value: AVATAR_ITEMS.faces.find(f => f.id === currentAvatarNormalized.face)?.name || 'Happy' },
                ].map(slot => (
                  <div key={slot.label} className="flex items-center gap-1.5">
                    <span className="text-slate-600">{slot.label}:</span>
                    <span className="text-yellow-800 font-bold">{slot.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evolution info */}
            <div className="bg-slate-100 rounded-lg p-3 border border-slate-300">
              <p className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-2">Avatar Evolution</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { minLevel: 1, label: 'Basic Form', desc: 'Starting look' },
                  { minLevel: 3, label: 'Aura Glow', desc: 'Energy surrounds you' },
                  { minLevel: 5, label: 'Armor Up', desc: 'Shoulder guards + float' },
                  { minLevel: 7, label: 'Mythic Wings', desc: 'Wings + epic aura' },
                  { minLevel: 15, label: 'Ascended', desc: 'Particle trail' },
                  { minLevel: 20, label: 'Godly', desc: 'Crown halo' },
                ].map((tier) => (
                  <div key={tier.minLevel} className={`flex items-center gap-2 ${currentLevel.level >= tier.minLevel ? 'text-yellow-800' : 'text-slate-600'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${currentLevel.level >= tier.minLevel ? 'border-yellow-400 bg-yellow-100' : 'border-slate-300'}`}>
                      {currentLevel.level >= tier.minLevel ? '✓' : tier.minLevel}
                    </span>
                    <span className="font-bold">{tier.label}</span>
                    <span className="text-slate-600">{tier.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shop tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto" role="tablist" aria-label="Avatar customization categories">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? tab.id === 'rewards' ? 'bg-green-500 text-slate-900' : 'bg-yellow-500 text-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="mr-1">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Rewards tab content */}
        {activeTab === 'rewards' ? (
          <div className="space-y-3 max-h-72 overflow-y-auto" role="tabpanel" aria-label="Teacher rewards">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRewardSubTab('available')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rewardSubTab === 'available'
                      ? 'bg-green-500 text-slate-900 shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  aria-pressed={rewardSubTab === 'available'}
                >
                  🎁 Available Rewards ({rewardsShopItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRewardSubTab('history');
                    loadRedeemedHistory();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rewardSubTab === 'history'
                      ? 'bg-green-500 text-slate-900 shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  aria-pressed={rewardSubTab === 'history'}
                >
                  📜 My Redemptions ({redeemedHistory.length})
                </button>
              </div>
              <span className="text-xs text-yellow-800 font-bold hidden sm:inline">
                🪙 {gameState.coins || 0} Coins
              </span>
            </div>

            {rewardSubTab === 'available' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 mb-1">Spend coins on real-world rewards from your teacher!</p>
                {rewardsShopItems.map(item => (
                  <div key={item.id} className="bg-slate-100 rounded-xl p-4 border border-slate-300 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 border-2 border-green-500 rounded-lg flex items-center justify-center text-2xl">
                      🎁
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-yellow-800 font-bold text-sm">{item.cost} coins</p>
                      <button
                        onClick={() => handleRedeemReward(item)}
                        disabled={gameState.coins < item.cost}
                        className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold ${
                          gameState.coins >= item.cost
                            ? 'bg-green-500 text-slate-900 hover:bg-green-400'
                            : 'bg-slate-200 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {gameState.coins >= item.cost ? 'Redeem' : 'Not enough'}
                      </button>
                    </div>
                  </div>
                ))}
                {rewardsShopItems.length === 0 && (
                  <p className="text-slate-600 text-center py-4">No rewards available yet. Ask your teacher!</p>
                )}
              </div>
            ) : (
              /* FE-7: Redeemed History View */
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 mb-1">Your past reward redemptions, fulfillment status, and claim instructions.</p>
                {loadingHistory ? (
                  <p className="text-slate-600 text-center py-4 text-xs">Loading redemption history...</p>
                ) : redeemedHistory.length > 0 ? (
                  redeemedHistory.map(item => {
                    const dateStr = formatRedemptionDate(item);
                    const badge = getRedemptionStatusBadge(item.status);
                    return (
                      <div key={item.id} className="bg-slate-100 rounded-xl p-3.5 border border-slate-300 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🎁</span>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{item.itemName}</p>
                              <p className="text-xs text-slate-600">Redeemed: {dateStr} • {item.cost} coins</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {item.directions && (
                          <div className="bg-white rounded-lg p-2 text-xs border border-slate-300">
                            <span className="text-yellow-800 font-semibold">How to claim: </span>
                            <span className="text-slate-700">{item.directions}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-600">
                    <p className="text-2xl mb-1">📜</p>
                    <p className="text-sm font-semibold">No redeemed rewards yet</p>
                    <p className="text-xs mt-1 text-slate-600">When you redeem rewards from your teacher, they'll show up here with instructions.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Item grid with avatar previews */
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-64 overflow-y-auto" role="tabpanel" aria-label={`${activeTab} items`}>
            {items.map(item => {
              const owned = gameState.ownedItems.includes(item.id);
              const equipped = currentAvatarNormalized[slotKey] === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => owned ? onEquip(slotKey, item.id) : gameState.coins >= item.cost && onBuy(item.id, item.cost)}
                  onMouseEnter={() => setHoveredItem({ [slotKey]: item.id })}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={!owned && gameState.coins < item.cost}
                  className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                    equipped ? 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-500/30' :
                    owned ? 'border-green-500/60 bg-green-100' :
                    gameState.coins >= item.cost ? 'border-slate-300 bg-slate-100 hover:border-slate-400 hover:scale-105' :
                    'border-dashed border-slate-300 bg-slate-50 grayscale'
                  }`}
                  aria-label={`${item.name}${equipped ? ' (equipped)' : owned ? ' (owned)' : item.cost > 0 ? ` - ${item.cost} coins` : ''}`}
                >
                  {/* Preview */}
                  <div className="flex items-center justify-center" aria-hidden="true">
                    {activeTab === 'colors' ? (
                      <AvatarColorSwatch colorId={item.id} size={36} />
                    ) : (
                      <AvatarPreviewHead avatar={currentAvatarNormalized} overrides={{ [slotKey]: item.id }} size={44} />
                    )}
                  </div>
                  <p className="text-xs font-bold truncate w-full text-center">{item.name}</p>
                  {!owned && item.cost > 0 && (
                    <p className="text-xs text-yellow-800 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-yellow-400" aria-hidden="true" />{item.cost}
                    </p>
                  )}
                  {equipped && (
                    <p className="text-[10px] text-yellow-800 font-bold uppercase bg-yellow-100 px-1.5 rounded">Equipped</p>
                  )}
                  {owned && !equipped && (
                    <p className="text-[10px] text-green-800 font-bold uppercase">Owned</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem confirmation modal */}
      {redeemConfirm && redeemingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60" onClick={() => setRedeemConfirm(false)}>
          <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-display font-bold text-green-800 mb-3">Redeem Reward?</h4>
            <p className="font-bold text-slate-900 mb-1">{redeemingItem.name}</p>
            <p className="text-sm text-slate-600 mb-3">{redeemingItem.description}</p>
            <p className="text-yellow-800 font-bold mb-3">Cost: {redeemingItem.cost} coins</p>
            {redeemingItem.directions && (
              <div className="bg-slate-100 rounded-lg p-3 mb-4 border border-slate-300">
                <p className="text-xs text-slate-600 uppercase font-bold mb-1">How to redeem:</p>
                <p className="text-sm text-slate-900">{redeemingItem.directions}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRedeemConfirm(false)} className="flex-1 py-2 bg-slate-100 text-slate-900 rounded-lg font-bold">Cancel</button>
              <button onClick={confirmRedeem} className="flex-1 py-2 bg-green-500 text-slate-900 rounded-lg font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== MYSTERY BOX MODAL ==============
function MysteryBoxModal({ reward, onClose }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mystery-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-sm w-full p-6 text-center">
        {!revealed ? (
          <>
            <div className="text-8xl mb-4 animate-bounce" aria-hidden="true">🎁</div>
            <h3 id="mystery-dialog-title" className="text-2xl font-display font-bold mb-4">Mystery Box!</h3>
            <button onClick={() => setRevealed(true)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase rounded-xl">
              Open Box
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4" aria-hidden="true">✨</div>
            <p className={`text-sm uppercase tracking-widest ${reward.color} mb-2`}>{reward.rarity}</p>
            <h3 className="text-2xl font-display font-bold mb-2">{reward.name}</h3>
            <p className="text-xl text-yellow-800 mb-6">{reward.desc}</p>
            <button onClick={onClose} className="w-full py-3 bg-yellow-500 text-slate-900 font-bold uppercase rounded-xl">
              Awesome!
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============== LEVEL UP / ACHIEVEMENT MODALS ==============
function LevelUpModal({ level, avatar, onClose }) {
  const evoLabels = { 1: null, 2: 'Aura Unlocked!', 3: 'Armor & Float Unlocked!', 4: 'Mythic Wings Unlocked!' };
  const evo = level.level >= 7 ? 4 : level.level >= 5 ? 3 : level.level >= 3 ? 2 : 1;
  const evoLabel = evoLabels[evo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="levelup-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="text-white bg-gradient-to-b from-yellow-600 to-yellow-700 border-4 border-yellow-400 rounded-2xl max-w-sm w-full p-8 text-center" role="alert">
        <div className="flex justify-center mb-4">
          <Avatar3D avatar={avatar} level={level.level} size="md" animate={true} />
        </div>
        <h3 id="levelup-dialog-title" className="text-3xl font-display font-bold text-white mb-2">Level Up!</h3>
        <p className={`text-4xl font-display font-bold ${level.color} mb-2`}>Level {level.level}</p>
        <p className="text-2xl font-bold text-white mb-2">{level.title}</p>
        {level.coinsEarned > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5 fill-yellow-300 text-white" aria-hidden="true" />
            <span className="text-lg font-display font-bold text-white">+{level.coinsEarned} Coins</span>
          </div>
        )}
        {evoLabel && (
          <p className="text-sm font-bold text-yellow-800 bg-yellow-100 rounded-lg py-1.5 px-3 mb-4 inline-block">{evoLabel}</p>
        )}
        <button onClick={onClose} className="w-full py-3 bg-white text-yellow-700 font-bold uppercase rounded-xl mt-2">Let's Go!</button>
      </div>
    </div>
  );
}

function AchievementModal({ achievement, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="achievement-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white border-4 border-yellow-500 rounded-2xl max-w-sm w-full p-8 text-center" role="alert">
        <div className="text-8xl mb-4" aria-hidden="true">{achievement.icon}</div>
        <p className="text-sm uppercase tracking-widest text-yellow-800 mb-2">Achievement Unlocked!</p>
        <h3 id="achievement-dialog-title" className="text-2xl font-display font-bold text-slate-900 mb-2">{achievement.title}</h3>
        <p className="text-slate-600 mb-4">{achievement.desc}</p>
        <p className="text-xl text-yellow-800 font-bold mb-6">+{achievement.xpReward} XP</p>
        <button onClick={onClose} className="w-full py-3 bg-yellow-500 text-slate-900 font-bold uppercase rounded-xl">Awesome!</button>
      </div>
    </div>
  );
}

// ============== ACTIVITY CARD ==============
function ActivityCard({
  path,
  cardColor,
  selectedOption,
  onSelect,
  completedActivities = [],
  pendingActivities = [],
  approvedActivities = [],
  rejectedActivities = []
}) {
  const IconComponent = IconMap[path.icon] || BookOpen;
  const headerColor = cardColor || path.color || 'bg-blue-600';

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`path-title-${path.id}`}>
      <div className={`text-white flex items-center gap-3 p-4 rounded-t-xl ${headerColor}`}>
        <IconComponent className="w-6 h-6" aria-hidden="true" />
        <div>
          <h2 id={`path-title-${path.id}`} className="font-bold leading-none">{path.title}</h2>
          <span className="text-xs font-bold">{path.subtitle}</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-b-xl border-x border-b border-slate-200 flex-1 flex flex-col gap-4">
        {path.options.map((opt) => {
          const isCompleted = completedActivities.includes(opt.id) || approvedActivities.includes(opt.id);
          const isPending = pendingActivities.includes(opt.id);
          const isRejected = rejectedActivities.includes(opt.id) && !isCompleted && !isPending;

          return (
            <button
              key={opt.id}
              onClick={() => onSelect(path.id, opt)}
              className={`text-left p-4 rounded-lg border-2 transition-all group ${
                isCompleted ? 'border-green-500/50 bg-green-50'
                : isPending ? 'border-blue-500/50 bg-blue-50'
                : isRejected ? 'border-rose-500/60 bg-rose-50 hover:border-rose-400'
                : selectedOption === opt.id ? 'border-yellow-500 bg-slate-100'
                : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
              aria-label={`${opt.title}: ${opt.desc}${isCompleted ? ' - Completed' : isPending ? ' - Pending approval' : isRejected ? ' - Needs revision' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase text-slate-600 group-hover:text-yellow-800">{opt.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-800 font-bold">+{opt.xp} XP</span>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-800" aria-hidden="true" />}
                  {isPending && <Clock className="w-5 h-5 text-blue-700" aria-hidden="true" />}
                  {isRejected && <RotateCcw className="w-5 h-5 text-rose-700" aria-hidden="true" />}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{opt.title}</h3>
              <p className="text-sm text-slate-600 leading-snug">{opt.desc}</p>
              {isPending && <p className="text-xs text-blue-700 mt-2 font-medium">Waiting for teacher approval...</p>}
              {isRejected && (
                <p className="text-xs text-rose-700 mt-2 font-bold flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Needs revision &bull; Click to see feedback & resubmit
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============== INSTRUCTION MODAL ==============
function InstructionModal({
  activity,
  path,
  onSubmit,
  onClose,
  dailyQuest,
  dailyCompleted,
  isPending,
  isCompleted,
  existingSubmission,
  classStudents = [],
  currentUserId = null,
  currentGuild = null
}) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const isDailyMatch = dailyQuest && (
    (dailyQuest.targetType && activity.type === dailyQuest.targetType) ||
    (dailyQuest.targetPath && path.id === dailyQuest.targetPath)
  );

  const handleSubmit = async (submissionData) => {
    await onSubmit(activity, path.id, submissionData);
    onClose();
  };

  const isRejected = existingSubmission?.status === 'rejected' && !isCompleted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="instruction-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-slate-900" aria-label="Close activity instructions">
          <X className="w-6 h-6" aria-hidden="true" />
        </button>

        {!showSubmitForm ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500 rounded-lg" aria-hidden="true">
                <PlayCircle className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 id="instruction-dialog-title" className="text-2xl font-display font-bold">{activity.title}</h3>
                <p className="text-yellow-800 text-sm font-bold uppercase tracking-widest">Active Objective</p>
              </div>
            </div>

            {/* Teacher Feedback / Revision Callout if rejected */}
            {isRejected && (
              <div className="bg-rose-50 border border-rose-500/50 p-4 rounded-xl mb-6 text-xs shadow-sm">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold mb-1">
                  <RotateCcw className="w-4 h-4 text-rose-700" />
                  <span className="uppercase tracking-wider">Teacher Revision Request:</span>
                </div>
                {existingSubmission.teacherFeedback ? (
                  <p className="text-rose-800 font-medium italic bg-rose-50 p-3 rounded-lg border border-rose-200 text-sm leading-relaxed whitespace-pre-wrap">
                    "{existingSubmission.teacherFeedback}"
                  </p>
                ) : (
                  <p className="text-rose-800 italic">Teacher requested revision for this activity. Please check your work and resubmit!</p>
                )}
                {existingSubmission.reviewedAt && (
                  <span className="text-[10px] text-slate-600 block mt-2">
                    Reviewed: {new Date(existingSubmission.reviewedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {isDailyMatch && !dailyCompleted && (
              <div className="bg-purple-100 border border-purple-500 p-3 rounded-lg mb-6 flex items-center gap-2" role="note">
                <Target className="w-5 h-5 text-purple-700" aria-hidden="true" />
                <span className="text-sm text-purple-800"><strong>Daily Quest Bonus!</strong> Earn {dailyQuest.multiplier}x XP</span>
              </div>
            )}

            <div className="bg-slate-100 p-3 rounded-lg mb-6 flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-yellow-800" />
              <span className="font-bold text-yellow-800">+{activity.xp} XP</span>
              {isDailyMatch && !dailyCompleted && <span className="text-purple-700 font-bold">→ +{activity.xp * dailyQuest.multiplier} XP</span>}
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">How to Play:</h4>
              <ol className="space-y-3">
                {activity.steps.map((step, idx) => renderStep(step, idx))}
              </ol>
            </div>

            {activity.proTip && (
              <div className="bg-blue-100 border border-blue-500/30 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-1 text-blue-700">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Pro Tip</span>
                </div>
                <p className="text-sm text-blue-800">{renderFormattedText(activity.proTip)}</p>
              </div>
            )}

            {isCompleted ? (
              <div className="space-y-3">
                <div className="text-center text-green-800 font-bold py-3 bg-green-50 border border-green-600/40 rounded-xl" role="status">
                  <CheckCircle2 className="w-6 h-6 inline mr-2 text-green-800" aria-hidden="true" />
                  Activity Completed & Approved (+{activity.xp} XP)!
                </div>
                {existingSubmission?.teacherFeedback && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-600 uppercase font-bold tracking-wider block mb-1">Teacher Feedback / Praise:</span>
                    <p className="text-slate-900 italic text-sm">"{existingSubmission.teacherFeedback}"</p>
                  </div>
                )}
              </div>
            ) : isPending ? (
              <div className="text-center text-blue-700 font-bold py-3 bg-blue-50 border border-blue-600/40 rounded-xl" role="status">
                <Clock className="w-6 h-6 inline mr-2 text-blue-700" aria-hidden="true" />
                Waiting for teacher approval...
              </div>
            ) : isRejected ? (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="w-full py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" /> Resubmit Revised Work
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-bold rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 shadow"
              >
                <Rocket className="w-5 h-5" aria-hidden="true" /> Submit My Work
              </button>
            )}
          </>
        ) : (
          <SubmissionForm
            activityTitle={activity.title}
            task={activity}
            onSubmit={handleSubmit}
            onCancel={() => setShowSubmitForm(false)}
            classStudents={classStudents}
            currentUserId={currentUserId}
            currentGuild={currentGuild}
          />
        )}
      </div>
    </div>
  );
}

// ============== GAME CONTENT ==============
function GameContent({ emulatedClassId } = {}) {
  const { user } = useAuth();
  const effectiveClassId = user?.classId || emulatedClassId;

  const {
    gameState,
    submissions,
    learningPaths,
    categoriesPerRow,
    classGuilds,
    classStudents,
    classSubmissions,
    highFiveLimit,
    allowStudentGuildSelect,
    spendCoins,
    recordHighFive,
    claimGuildChallenge,
    getCurrentLevel,
    getNextLevelXp,
    getDailyQuest,
    submitActivity,
    submitBossChallenge,
    joinGuild,
    openMysteryBox,
    buyAvatarItem,
    equipAvatarItem,
    setPlayerName,
    showLevelUp,
    setShowLevelUp,
    newLevel,
    showAchievement,
    setShowAchievement,
    showMysteryReward,
    setShowMysteryReward,
    dataLoaded,
  } = useGameState(effectiveClassId);

  const [selectedPath, setSelectedPath] = useState({});
  const [activeInstruction, setActiveInstruction] = useState(null);
  const [activePath, setActivePath] = useState(null);
  const [showTrophyCase, setShowTrophyCase] = useState(false);
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [classSpotlight, setClassSpotlight] = useState(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');
  const [activeBoss, setActiveBoss] = useState(null);
  const [showLevelEconomyGuide, setShowLevelEconomyGuide] = useState(false);
  const [mobileCategoryFilter, setMobileCategoryFilter] = useState('all');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const prevXpRef = useRef(gameState.xp);
  // Becomes true only after the first XP value from the loaded profile has been recorded as the
  // baseline, so loading a saved profile (e.g. 0 -> 1500 XP) is never announced as "Earned XP".
  const xpBaselineReadyRef = useRef(false);

  // FE-10: Announce XP, level-up, and achievement unlock events to screen readers
  useEffect(() => {
    if (!dataLoaded || !xpBaselineReadyRef.current) {
      prevXpRef.current = gameState.xp;
      xpBaselineReadyRef.current = !!dataLoaded;
      return;
    }
    const message = formatLiveAnnouncement('xp', {
      diff: (gameState.xp || 0) - (prevXpRef.current || 0),
      totalXp: gameState.xp
    });
    if (message) setLiveAnnouncement(message);
    prevXpRef.current = gameState.xp;
  }, [gameState.xp, dataLoaded]);

  useEffect(() => {
    if (showLevelUp && newLevel) {
      const message = formatLiveAnnouncement('level_up', { newLevel });
      if (message) setLiveAnnouncement(message);
    }
  }, [showLevelUp, newLevel]);

  useEffect(() => {
    if (showAchievement) {
      setLiveAnnouncement(formatLiveAnnouncement('achievement', { showAchievement }));
    }
  }, [showAchievement]);

  // FE-6: The category chips are only shown on small screens. If the window grows past the
  // `md` breakpoint while a chip filter is active, reset it so no categories stay hidden.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(min-width: 768px)');
    const resetOnDesktop = () => { if (mql.matches) setMobileCategoryFilter('all'); };
    resetOnDesktop();
    mql.addEventListener?.('change', resetOnDesktop);
    return () => mql.removeEventListener?.('change', resetOnDesktop);
  }, []);

  const dailyQuest = getDailyQuest();

  const refreshClassData = useCallback(() => {
    if (effectiveClassId) {
      backend.getClass(effectiveClassId).then(cls => {
        if (cls && cls.spotlight) {
          setClassSpotlight(cls.spotlight);
        }
      }).catch(e => console.error("Error loading class spotlight", e));

      backend.getActiveBoss(effectiveClassId, user?.organizationId).then(b => {
        if (b) setActiveBoss(b);
      }).catch(e => console.error("Error loading active boss", e));
    }
  }, [effectiveClassId, user?.organizationId]);

  // Load class spotlight & active boss
  useEffect(() => {
    refreshClassData();
  }, [refreshClassData]);

  // Helper to extract submission status safely
  const pendingActivities = submissions ? submissions.filter(s => s.status === 'pending' && !s.isBoss).map(s => s.activityId) : [];
  const approvedActivities = submissions ? submissions.filter(s => s.status === 'approved' && !s.isBoss).map(s => s.activityId) : [];
  const rejectedActivities = submissions ? submissions.filter(s => s.status === 'rejected' && !s.isBoss).map(s => s.activityId) : [];
  const pendingBossIds = submissions ? submissions.filter(s => s.status === 'pending' && s.isBoss).map(s => s.activityId) : [];
  const myPendingCount = submissions ? submissions.filter(s => s.status === 'pending').length : 0;
  const myRejectedCount = submissions ? submissions.filter(s => s.status === 'rejected').length : 0;

  const handleSelect = (pathId, activity) => {
    setSelectedPath(prev => ({ ...prev, [pathId]: activity.id }));
    setActiveInstruction(activity);
    setActivePath(learningPaths.find(p => p.id === pathId));
  };

  const handleSubmitActivity = (activity, pathId, submissionData) => {
    return submitActivity(activity, pathId, submissionData);
  };

  const handleSubmitBoss = (boss, submissionData) => {
    return submitBossChallenge(boss, submissionData);
  };

  // Check for current boss pending status
  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const defaultBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const currentBoss = activeBoss || defaultBoss;
  const hasPendingBoss = pendingBossIds.includes(currentBoss.id);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans relative">
      <a href="#main-content" className="sr-skip-link">Skip to main content</a>
      <div className="w-full max-w-[1920px] mx-auto">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20" aria-hidden="true">
            <Gamepad2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            Level Up: Adventure Mission
          </h1>
          <p className="text-slate-600 text-lg">Choose your path. Master the content. Own the game.</p>
        </header>

        <PlayerStats
          gameState={gameState}
          getCurrentLevel={getCurrentLevel}
          getNextLevelXp={getNextLevelXp}
          onOpenProfile={() => setShowAvatarBuilder(true)}
          onOpenMysteryBox={openMysteryBox}
          onOpenSubmissions={() => setShowMySubmissions(true)}
          pendingSubmissions={myPendingCount}
          rejectedSubmissions={myRejectedCount}
          totalSubmissions={submissions ? submissions.length : 0}
        />

        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setShowTrophyCase(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-yellow-500 transition-colors"
            aria-label={`Trophies: ${gameState.unlockedAchievements.length} of ${ACHIEVEMENTS.length} unlocked`}
          >
            <Trophy className="w-5 h-5 text-yellow-800" aria-hidden="true" />
            <span className="font-bold">Trophies</span>
            <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full">
              {gameState.unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-500 transition-colors"
            aria-label="View class leaderboard"
          >
            <Crown className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <span className="font-bold">Leaderboard</span>
          </button>
          <button
            onClick={() => setShowLevelEconomyGuide(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-amber-400 transition-colors text-amber-800"
            aria-label="View Level Progression & Gold Guide"
          >
            <Award className="w-5 h-5 text-amber-800" aria-hidden="true" />
            <span className="font-bold">Levels & Gold Guide</span>
          </button>
          {/* Submissions & Feedback Button in action row */}
          <button
            onClick={() => setShowMySubmissions(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg transition-colors ${
              myRejectedCount > 0
                ? 'border-rose-500 text-rose-700 hover:border-rose-400 bg-rose-50'
                : myPendingCount > 0
                ? 'border-blue-500 text-blue-700 hover:border-blue-400 bg-blue-50'
                : 'border-slate-200 text-slate-800 hover:border-blue-500'
            }`}
            aria-label="View My Submissions and Teacher Feedback"
          >
            <ClipboardList className={`w-5 h-5 ${myRejectedCount > 0 ? 'text-rose-700' : myPendingCount > 0 ? 'text-blue-700' : 'text-blue-700'}`} aria-hidden="true" />
            <span className="font-bold">My Submissions</span>
            {myRejectedCount > 0 ? (
              <span className="text-xs bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {myRejectedCount} Fix
              </span>
            ) : myPendingCount > 0 ? (
              <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                {myPendingCount}
              </span>
            ) : submissions && submissions.length > 0 ? (
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {submissions.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => { setLegalModalTab('privacy'); setShowLegalModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 transition-colors text-slate-700 hover:text-slate-900 ml-auto"
            aria-label="View Student Data Privacy & Terms"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-800" aria-hidden="true" />
            <span className="font-bold text-sm">Privacy & Terms</span>
          </button>
        </div>

        {/* Student Spotlight Banner */}
        {classSpotlight && (
          <section className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-500/50" aria-label="Student Spotlight">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Avatar3D avatar={classSpotlight.avatar} level={getLevelForXp(classSpotlight.xp).level} size="sm" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="w-4 h-4 text-yellow-800" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-widest text-yellow-800">
                    {classSpotlight.category === 'star_student' && 'Star Student'}
                    {classSpotlight.category === 'most_improved' && 'Most Improved'}
                    {classSpotlight.category === 'team_player' && 'Team Player'}
                    {classSpotlight.category === 'creative_genius' && 'Creative Genius'}
                  </span>
                </div>
                <p className="font-display font-bold text-slate-900 text-lg">{classSpotlight.studentName}</p>
                <p className="text-sm text-slate-700 italic">"{classSpotlight.message}"</p>
              </div>
              <div className="text-3xl flex-shrink-0" aria-hidden="true">
                {classSpotlight.category === 'star_student' && '⭐'}
                {classSpotlight.category === 'most_improved' && '📈'}
                {classSpotlight.category === 'team_player' && '🤝'}
                {classSpotlight.category === 'creative_genius' && '🎨'}
              </div>
            </div>
          </section>
        )}

        <DailyQuestBanner quest={dailyQuest} completed={gameState.dailyQuestCompleted} />
        <GuildPanel
          currentGuild={gameState.guild}
          onJoinGuild={joinGuild}
          guildXp={gameState.guildXpContributed}
          classId={effectiveClassId}
          gameState={{ id: user?.id, name: gameState.playerName, ...gameState }}
          onStateUpdate={refreshClassData}
          onRecordHighFive={recordHighFive}
          onClaimGuildChallenge={claimGuildChallenge}
          guilds={classGuilds}
          spendCoins={spendCoins}
          highFiveLimit={highFiveLimit}
          allowStudentGuildSelect={allowStudentGuildSelect}
        />
        <BossChallenge
          completedBosses={gameState.completedBossChallenges}
          onSubmit={handleSubmitBoss}
          hasPendingSubmission={hasPendingBoss}
          activeBoss={currentBoss}
          classSubmissions={classSubmissions}
          classStudents={classStudents}
          currentUserId={user?.id}
          currentGuild={gameState.guild}
        />

        {/* FE-10: Accessible Live Region Announcement for Screen Readers */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {liveAnnouncement}
        </div>

        {/* FE-6: Mobile Category Filter Chips */}
        {learningPaths.length > 1 && (
          <div className="md:hidden mb-4 overflow-x-auto flex-nowrap scrollbar-none flex items-center gap-2 pb-2 px-1" role="toolbar" aria-label="Filter choice board categories">
            <button
              type="button"
              onClick={() => setMobileCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                mobileCategoryFilter === 'all'
                  ? 'bg-yellow-500 text-slate-900 shadow-md ring-2 ring-yellow-400/50'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
              }`}
              aria-pressed={mobileCategoryFilter === 'all'}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                mobileCategoryFilter === 'all' ? 'bg-slate-50 text-slate-950 font-bold' : 'bg-slate-100 text-slate-700'
              }`}>
                {learningPaths.reduce((acc, p) => acc + calculatePathProgressStats(p, gameState.completedActivities, approvedActivities).count, 0)}/
                {learningPaths.reduce((acc, p) => acc + (p.options || []).length, 0)}
              </span>
            </button>
            {learningPaths.map((path) => {
              const { count: completedCount, total: totalCount, isComplete } =
                calculatePathProgressStats(path, gameState.completedActivities, approvedActivities);
              const isSelected = mobileCategoryFilter === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => setMobileCategoryFilter(prev => toggleLearningPathFilter(prev, path.id))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    isSelected
                      ? 'bg-yellow-500 text-slate-900 shadow-md ring-2 ring-yellow-400/50'
                      : isComplete
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-600/60'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{path.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected 
                      ? 'bg-slate-50 text-slate-950 font-bold' 
                      : isComplete 
                      ? 'bg-emerald-800 text-white' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {completedCount}/{totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(() => {
          const displayedPaths = filterLearningPathsByChip(learningPaths, mobileCategoryFilter);

          return (
            <main
              id="main-content"
              className={`grid gap-6 mb-12 ${
                categoriesPerRow === '1' ? 'grid-cols-1 max-w-2xl mx-auto' :
                categoriesPerRow === '2' ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' :
                categoriesPerRow === '3' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                categoriesPerRow === '4' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                categoriesPerRow === '5' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5' :
                categoriesPerRow === '6' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6' :
                // Auto / responsive default
                displayedPaths.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                displayedPaths.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' :
                displayedPaths.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                displayedPaths.length === 5 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5' :
                displayedPaths.length >= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
              aria-label="Learning paths"
            >
              {displayedPaths.map((path, idx) => (
                <ActivityCard
                  key={path.id}
                  path={path}
                  cardColor={path.color || PATH_COLORS[idx % PATH_COLORS.length]}
                  selectedOption={selectedPath[path.id]}
                  onSelect={handleSelect}
                  completedActivities={gameState.completedActivities}
                  pendingActivities={pendingActivities}
                  approvedActivities={approvedActivities}
                  rejectedActivities={rejectedActivities}
                />
              ))}
            </main>
          );
        })()}

        <div className="text-center pb-20">
          <button onClick={() => setShowInfo(!showInfo)} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-700 transition-colors" aria-expanded={showInfo} aria-controls="pedagogical-info">
            <Info className="w-4 h-4" aria-hidden="true" />
            {showInfo ? 'Hide Pedagogical Connections' : 'Show Pedagogical Connections'}
          </button>

          {showInfo && (
            <div id="pedagogical-info" className="mt-6 p-6 bg-white rounded-xl border border-slate-200 text-left max-w-4xl mx-auto">
              <h4 className="text-yellow-800 font-bold uppercase mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Why this works
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-bold text-slate-700 underline mb-1">Removing Barriers (UDL)</p>
                  <p className="text-slate-600 italic">"By offering 'Low Tech' options, students blocked by digital navigation can still show mastery."</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 underline mb-1">Teacher Verification</p>
                  <p className="text-slate-600 italic">"Students submit proof of work. Teachers approve submissions before XP is awarded."</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeInstruction && activePath && (
        <InstructionModal
          activity={activeInstruction}
          path={activePath}
          onSubmit={handleSubmitActivity}
          onClose={() => { setActiveInstruction(null); setActivePath(null); }}
          dailyQuest={dailyQuest}
          dailyCompleted={gameState.dailyQuestCompleted}
          isPending={pendingActivities.includes(activeInstruction.id)}
          isCompleted={gameState.completedActivities.includes(activeInstruction.id) || approvedActivities.includes(activeInstruction.id)}
          existingSubmission={submissions ? submissions.find(s => s.activityId === activeInstruction.id) : null}
          classStudents={classStudents}
          currentUserId={user?.id}
          currentGuild={gameState.guild}
        />
      )}

      {showLeaderboard && effectiveClassId && (
        <Leaderboard
          classId={effectiveClassId}
          currentPlayerId={user?.id}
          guilds={classGuilds}
          learningPaths={learningPaths}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      {showTrophyCase && <TrophyCase achievements={gameState.unlockedAchievements} learningPaths={learningPaths} onClose={() => setShowTrophyCase(false)} />}
      {showAvatarBuilder && <AvatarBuilder gameState={gameState} getCurrentLevel={getCurrentLevel} onBuy={buyAvatarItem} onEquip={equipAvatarItem} onClose={() => setShowAvatarBuilder(false)} onSetName={setPlayerName} classId={effectiveClassId} userId={user?.id} />}
      {showMySubmissions && (
        <MySubmissions
          submissions={submissions}
          onClose={() => setShowMySubmissions(false)}
          onReviseActivity={(activityId, pathId) => {
            setShowMySubmissions(false);
            const path = learningPaths.find(p => p.id === pathId || p.options?.some(o => o.id === activityId));
            if (path) {
              const act = path.options?.find(o => o.id === activityId);
              if (act) {
                setSelectedPath(prev => ({ ...prev, [path.id]: act.id }));
                setActiveInstruction(act);
                setActivePath(path);
              }
            }
          }}
        />
      )}
      {showMysteryReward && <MysteryBoxModal reward={showMysteryReward} onClose={() => setShowMysteryReward(null)} />}
      {showLevelUp && newLevel && <LevelUpModal level={newLevel} avatar={gameState.avatar} onClose={() => setShowLevelUp(false)} />}
      {showAchievement && <AchievementModal achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      <LevelEconomyGuideModal isOpen={showLevelEconomyGuide} onClose={() => setShowLevelEconomyGuide(false)} />

      <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <button
            onClick={() => { setLegalModalTab('privacy'); setShowLegalModal(true); }}
            className="hover:text-blue-700 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </button>
          <span className="text-slate-400">•</span>
          <button
            onClick={() => { setLegalModalTab('terms'); setShowLegalModal(true); }}
            className="hover:text-blue-700 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </button>
          <span className="text-slate-400">•</span>
          <button
            onClick={() => { setLegalModalTab('compliance'); setShowLegalModal(true); }}
            className="hover:text-emerald-800 transition-colors flex items-center gap-1 inline-flex"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> Student Data Privacy Compliance
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Designed for K-12 Classrooms. Compliant with FERPA, COPPA, SOPIPA & State Educational Privacy Statutes.
        </p>
      </footer>

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}

// ============== ERROR BOUNDARY ==============
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught error in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-50 border-2 border-red-500/80 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-2xl font-display font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-display font-bold uppercase text-slate-900">Something went wrong</h2>
            <p className="text-xs text-slate-600">
              An unexpected display issue occurred. Don't worry, your progress and data are safe!
            </p>
            {this.state.error && (
              <div className="text-left bg-slate-50 p-3 rounded-xl border border-red-200 text-xs font-mono text-red-700 max-h-48 overflow-y-auto space-y-1">
                <p className="font-bold text-red-700">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <p className="text-[10px] text-slate-600 whitespace-pre-wrap">{this.state.error.stack.split('\n').slice(0, 5).join('\n')}</p>
                )}
              </div>
            )}
            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow"
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============== MAIN APP ROUTER ==============
function AppContent() {
  const { user, loading } = useAuth();
  const [activeViewMode, setActiveViewMode] = useState(null); // 'admin' | 'teacher' | 'student'
  const [emulationClasses, setEmulationClasses] = useState([]);
  const [emulatedClassId, setEmulatedClassId] = useState(null);
  const [adminTargetClassId, setAdminTargetClassId] = useState(null);
  const [adminTargetTab, setAdminTargetTab] = useState(null);
  const [adminViewScope, setAdminViewScope] = useState(() => {
    return localStorage.getItem('lvlup_admin_view_scope') || 'mine';
  });

  const isSuperAdmin = isAdminUser(user);

  // Load teacher's or admin's classes for student emulation
  useEffect(() => {
    if (user && (user.role === 'teacher' || isSuperAdmin)) {
      const loadEmu = async () => {
        try {
          let clsList = [];
          if (isSuperAdmin) {
            if (adminViewScope === 'mine') {
              clsList = await backend.getClasses(user.id);
            } else {
              if (user.organizationId) {
                clsList = await backend.getAllClassesByOrg(user.organizationId);
              }
              if (!clsList || clsList.length === 0) {
                clsList = await backend.getAllClasses();
              }
            }
          } else {
            clsList = await backend.getClasses(user.id);
          }
          if (clsList && clsList.length > 0) {
            setEmulationClasses(clsList);
            setEmulatedClassId(prev => (clsList.some(c => c.id === prev) ? prev : clsList[0].id));
          } else {
            setEmulationClasses([]);
            setEmulatedClassId(null);
          }
        } catch (e) {
          console.error("Error loading emulation classes", e);
        }
      };
      loadEmu();
    }
  }, [user, isSuperAdmin, adminViewScope]);

  // Set default view mode when user logs in or role changes
  useEffect(() => {
    if (user) {
      if (isSuperAdmin && !activeViewMode) {
        setActiveViewMode('admin');
      } else if (user.role === 'teacher' && !activeViewMode) {
        setActiveViewMode('teacher');
      } else if (user.role === 'student') {
        setActiveViewMode('student');
      }
    } else {
      setActiveViewMode(null);
    }
  }, [user, isSuperAdmin]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900" role="status" aria-live="polite">Loading...</div>;

  if (!user) {
    return <LoginScreen />;
  }

  const isElevatedUser = isSuperAdmin || user.role === 'teacher';
  // Enforce role security: students can NEVER access admin or teacher mode
  const currentMode = !isElevatedUser
    ? 'student'
    : (activeViewMode || (isSuperAdmin ? 'admin' : 'teacher'));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Sticky Navigation View Switcher Bar (only for Admins/Teachers) */}
      {isElevatedUser && (
        <header className="bg-slate-50 backdrop-blur border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-500/30 text-xs font-bold uppercase rounded-lg tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Super Admin
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 border border-blue-500/30 text-xs font-bold uppercase rounded-lg tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Teacher
              </span>
            )}
            <span className="text-xs text-slate-600 font-medium hidden sm:inline">
              Signed in as <strong className="text-slate-900">{user.name || user.email}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider mr-1 hidden md:inline">Mode:</span>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveViewMode('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentMode === 'admin'
                    ? 'bg-yellow-500 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
                    : 'bg-slate-50 hover:bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5" /> Admin Dashboard
              </button>
            )}

            <button
              onClick={() => setActiveViewMode('teacher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentMode === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/50'
                  : 'bg-slate-50 hover:bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Teacher View
            </button>

            <button
              onClick={() => setActiveViewMode('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentMode === 'student'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-500/50'
                  : 'bg-slate-50 hover:bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" /> Student Emulation View
            </button>
          </div>
        </header>
      )}

      {/* Main View Router */}
      <div className="flex-1">
        {currentMode === 'admin' ? (
          <AdminPortal
            onSwitchToTeacher={(targetClass, initialTab) => {
              if (targetClass?.id) {
                setAdminTargetClassId(targetClass.id);
              }
              if (initialTab) {
                setAdminTargetTab(initialTab);
              }
              setActiveViewMode('teacher');
            }}
            onSwitchToStudent={() => setActiveViewMode('student')}
          />
        ) : currentMode === 'teacher' ? (
          <TeacherPortal
            onSwitchToAdmin={() => setActiveViewMode('admin')}
            onSwitchToStudent={() => setActiveViewMode('student')}
            initialClassId={adminTargetClassId}
            initialTab={adminTargetTab}
            onClearInitialClassId={() => {
              setAdminTargetClassId(null);
              setAdminTargetTab(null);
            }}
          />
        ) : (
          <div>
            {/* Student Emulation Banner ONLY visible to Teachers/Admins emulating students */}
            {isElevatedUser && (
              <div className="bg-purple-50 border-b border-purple-200 p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-purple-800 shadow-md">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-slate-900 uppercase tracking-wider">Student Emulation Mode</span>
                  </div>

                  {/* Super admin toggle: My Classes vs Org Classes */}
                  {isSuperAdmin && (
                    <div className="flex items-center bg-slate-50 border border-purple-300 rounded-lg p-0.5 text-[11px] gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = 'mine';
                          setAdminViewScope(next);
                          localStorage.setItem('lvlup_admin_view_scope', next);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-all ${
                          adminViewScope === 'mine'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'text-purple-700 hover:text-slate-900'
                        }`}
                      >
                        <User className="w-3 h-3" />
                        <span>My Classes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = 'org';
                          setAdminViewScope(next);
                          localStorage.setItem('lvlup_admin_view_scope', next);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-all ${
                          adminViewScope === 'org'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'text-purple-700 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>All Org</span>
                      </button>
                    </div>
                  )}

                  {emulationClasses.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-700 text-xs">Previewing Class:</span>
                      <select
                        value={emulatedClassId || ''}
                        onChange={e => setEmulatedClassId(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-purple-300 rounded text-xs text-slate-900 outline-none focus:border-yellow-400"
                      >
                        {emulationClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {emulationClasses.length === 1 && (
                    <span className="text-purple-700 text-xs">
                      Class: <strong className="text-slate-900">{emulationClasses[0].name}</strong>
                    </span>
                  )}
                  {emulationClasses.length === 0 && (
                    <span className="text-purple-700 text-xs italic">
                      {isSuperAdmin && adminViewScope === 'mine'
                        ? 'No personal classes found (switch to "All Org" or create one in Teacher View)'
                        : 'No classes found'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveViewMode(isSuperAdmin ? 'admin' : 'teacher')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors border border-purple-400/40"
                >
                  Exit Emulation
                </button>
              </div>
            )}
            <GameContent emulatedClassId={isElevatedUser ? emulatedClassId : null} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
