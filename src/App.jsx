import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Gamepad2, Mic, BarChart3, Palette, CheckCircle2, Trophy, Rocket, Info, X, PlayCircle,
  Star, Gift, Swords, Users, User, Sparkles, Zap, Shield, ShieldCheck, Crown, Target,
  Upload, Link, Link2, Clock, CheckCheck, XCircle, ClipboardList, Lock, Eye, FileText, LogOut,
  MessageSquare, Pencil, BookOpen, Award
} from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import {
  LEVELS, ACHIEVEMENTS, GUILDS, AVATAR_ITEMS, BOSS_CHALLENGES, LEARNING_PATHS, GUILD_CHALLENGES,
  GUILD_TROPHIES, GUILD_BANNERS
} from './data/gameData';
import { AuthProvider, useAuth } from './context/AuthContext';
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
function PlayerStats({ gameState, getCurrentLevel, getNextLevelXp, onOpenProfile, onOpenMysteryBox, onOpenSubmissions, pendingSubmissions }) {
  const currentLevel = getCurrentLevel();
  const nextLevelXp = getNextLevelXp();
  const progress = ((gameState.xp - currentLevel.xpRequired) / (nextLevelXp - currentLevel.xpRequired)) * 100;
  const { logout } = useAuth();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onOpenProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label={`Open profile for ${gameState.playerName || 'Player'}, Level ${currentLevel.level} ${currentLevel.title}`}>
          <Avatar3D avatar={gameState.avatar} level={currentLevel.level} size="sm" />
          <div className="text-left">
            <p className="font-bold text-white">{gameState.playerName || 'Player'}</p>
            <p className={`text-sm font-bold ${currentLevel.color}`}>Lv.{currentLevel.level} {currentLevel.title}</p>
          </div>
        </button>

        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400" id="xp-label">XP</span>
            <span className="text-yellow-500 font-bold">{gameState.xp} / {nextLevelXp}</span>
          </div>
          <div
            className="h-3 bg-slate-700 rounded-full overflow-hidden"
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
          <div className="flex items-center gap-1 text-yellow-400" role="status" aria-label={`${gameState.coins} coins`}>
            <Star className="w-5 h-5 fill-yellow-400" aria-hidden="true" />
            <span className="font-bold">{gameState.coins}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400" role="status" aria-label={`${gameState.currentStreak} day streak`}>
            <Zap className="w-5 h-5" aria-hidden="true" />
            <span className="font-bold">{gameState.currentStreak}</span>
          </div>
          {pendingSubmissions > 0 && (
            <button
              onClick={onOpenSubmissions}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg"
              aria-label={`View ${pendingSubmissions} pending submission${pendingSubmissions !== 1 ? 's' : ''}`}
            >
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span className="font-bold text-sm">{pendingSubmissions}</span>
            </button>
          )}
          {gameState.pendingMysteryBoxes > 0 && (
            <button
              onClick={onOpenMysteryBox}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg animate-pulse"
              aria-label={`Open ${gameState.pendingMysteryBoxes} mystery box${gameState.pendingMysteryBoxes !== 1 ? 'es' : ''}`}
            >
              <Gift className="w-5 h-5" aria-hidden="true" />
              <span className="font-bold">{gameState.pendingMysteryBoxes}</span>
            </button>
          )}
          <button
             onClick={logout}
             className="ml-2 text-slate-500 hover:text-white"
             aria-label="Logout"
           >
             <LogOut className="w-5 h-5" aria-hidden="true" />
           </button>
        </div>
      </div>

      {(gameState.doubleXpActive || gameState.streakShieldActive) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700" role="status" aria-label="Active power-ups">
          {gameState.doubleXpActive && (
            <span className="text-xs bg-pink-600/30 text-pink-300 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" aria-hidden="true" /> 2x XP Active
            </span>
          )}
          {gameState.streakShieldActive && (
            <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-1 rounded-full flex items-center gap-1">
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
    <section className={`mb-6 p-4 rounded-xl border-2 ${completed ? 'bg-green-900/30 border-green-600' : 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500'}`} aria-label="Daily Quest">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${completed ? 'bg-green-600' : 'bg-purple-600'}`} aria-hidden="true">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Daily Quest</p>
            <p className="font-bold text-white">{quest.title}</p>
            <p className="text-sm text-slate-400">{quest.desc}</p>
          </div>
        </div>
        <div className="text-right">
          {completed ? (
            <span className="text-green-400 font-bold flex items-center gap-1" role="status">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> Complete!
            </span>
          ) : (
            <span className="text-yellow-400 font-bold">{quest.multiplier}x XP</span>
          )}
        </div>
      </div>
    </section>
  );
}

// ============== BOSS CHALLENGE ==============
function BossChallenge({ completedBosses, onSubmit, hasPendingSubmission, activeBoss }) {
  const [showBoss, setShowBoss] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const defaultBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const currentBoss = activeBoss || defaultBoss;
  const isCompleted = completedBosses.includes(currentBoss.id);

  const handleSubmit = (submissionData) => {
    onSubmit(currentBoss, submissionData);
    setShowSubmitForm(false);
    setShowBoss(false);
  };

  return (
    <>
      <button
        onClick={() => setShowBoss(true)}
        className={`mb-6 w-full p-4 rounded-xl border-2 ${isCompleted ? 'bg-slate-800 border-slate-700' : hasPendingSubmission ? 'bg-blue-900/30 border-blue-500' : 'bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500 animate-pulse'}`}
        aria-label={`Weekly Boss: ${currentBoss.name}${isCompleted ? ' - Defeated' : hasPendingSubmission ? ' - Pending approval' : ` - ${currentBoss.reward} XP reward`}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-slate-700' : hasPendingSubmission ? 'bg-blue-600' : 'bg-red-600'}`} aria-hidden="true">
              <Swords className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">Weekly Boss</p>
                {currentBoss.source === 'class' && (
                  <span className="text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    Class Custom
                  </span>
                )}
                {currentBoss.source === 'org' && (
                  <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    District / Org
                  </span>
                )}
              </div>
              <p className="font-black text-white">{currentBoss.name}</p>
            </div>
          </div>

          {isCompleted ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              <Crown className="w-5 h-5" aria-hidden="true" /> Defeated!
            </span>
          ) : hasPendingSubmission ? (
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <Clock className="w-5 h-5" aria-hidden="true" /> Pending
            </span>
          ) : (
            <span className="text-yellow-400 font-bold">+{currentBoss.reward} XP</span>
          )}
        </div>
      </button>

      {showBoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="boss-dialog-title" onKeyDown={(e) => e.key === 'Escape' && setShowBoss(false)}>
          <div className="bg-slate-800 border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowBoss(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white" aria-label="Close boss challenge">
              <X className="w-6 h-6" aria-hidden="true" />
            </button>

            {!showSubmitForm ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4" aria-hidden="true">{currentBoss.icon || '👹'}</div>
                  <h3 id="boss-dialog-title" className="text-2xl font-black uppercase italic text-red-400">{currentBoss.name}</h3>
                  {currentBoss.title && <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider mt-0.5">{currentBoss.title}</p>}
                  <p className="text-slate-400 mt-2">{currentBoss.desc}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest">Battle Plan:</h4>
                  <ol className="space-y-3">
                    {(currentBoss.steps || []).map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-300">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900 text-red-400 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-500/30 p-4 rounded-xl mb-6">
                  <p className="text-sm text-yellow-200">
                    <strong>Reward:</strong> {currentBoss.reward} XP + Mystery Box + Achievement
                  </p>
                </div>

                {!isCompleted && !hasPendingSubmission && (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase italic rounded-xl transition-colors"
                  >
                    Submit My Work
                  </button>
                )}
                {hasPendingSubmission && (
                  <div className="text-center text-blue-400 font-bold py-3" role="status">
                    <Clock className="w-6 h-6 inline mr-2" aria-hidden="true" />
                    Waiting for teacher approval...
                  </div>
                )}
                {isCompleted && (
                  <div className="text-center text-green-400 font-bold py-3" role="status">
                    <CheckCircle2 className="w-6 h-6 inline mr-2" aria-hidden="true" />
                    Boss Defeated! Come back next week.
                  </div>
                )}
              </>
            ) : (
              <SubmissionForm
                activityTitle={currentBoss.name}
                onSubmit={handleSubmit}
                onCancel={() => setShowSubmitForm(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============== SUBMISSION FORM ==============
function SubmissionForm({ activityTitle, onSubmit, onCancel }) {
  const [submissionType, setSubmissionType] = useState('link');
  const [linkValue, setLinkValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 900KB for Firestore)
      if (file.size > 900 * 1024) {
        alert('File is too large. Please upload a file smaller than 900KB (Firestore Limit), or use a link instead.');
        return;
      }

      setIsProcessing(true);
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
    }
  };

  const handleSubmit = () => {
    if (submissionType === 'link' && !linkValue.trim()) {
      alert('Please enter a link to your work');
      return;
    }
    if (submissionType === 'file' && !fileData) {
      alert('Please select a file');
      return;
    }
    if (submissionType === 'text' && !textValue.trim()) {
      alert('Please type your response');
      return;
    }

    let content;
    if (submissionType === 'link') content = linkValue.trim();
    else if (submissionType === 'file') content = fileData;
    else content = textValue.trim();

    onSubmit({
      type: submissionType,
      content,
      fileName: submissionType === 'file' ? fileName : null,
      fileType: submissionType === 'file' ? fileType : null,
      note: note.trim()
    });
  };

  const typeButtons = [
    { type: 'link', icon: Link, label: 'Paste Link' },
    { type: 'file', icon: Upload, label: 'Upload File' },
    { type: 'text', icon: MessageSquare, label: 'Type Response' },
  ];

  return (
    <div>
      <h3 className="text-xl font-black uppercase italic mb-4 text-center">Submit Your Work</h3>
      <p className="text-slate-400 text-sm text-center mb-6">for: {activityTitle}</p>

      <div className="flex gap-2 mb-6" role="group" aria-label="Submission type">
        {typeButtons.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setSubmissionType(type)}
            className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-sm ${submissionType === type ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
            aria-pressed={submissionType === type}
          >
            <Icon className="w-5 h-5" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {submissionType === 'link' && (
        <div className="mb-4">
          <label htmlFor="submission-link" className="block text-sm font-bold text-slate-300 mb-2">Link to your work</label>
          <input
            id="submission-link"
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
            aria-describedby="link-hint"
          />
          <p id="link-hint" className="text-xs text-slate-500 mt-2">Paste a link to Google Docs, YouTube, Vocaroo, or any other website</p>
        </div>
      )}

      {submissionType === 'file' && (
        <div className="mb-4">
          <label htmlFor="submission-file" className="block text-sm font-bold text-slate-300 mb-2">Upload your file</label>
          <input
            id="submission-file"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
            accept="image/*,.pdf,.doc,.docx,.mp3,.mp4"
            aria-describedby="file-hint"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-6 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
            aria-label={fileName ? `Selected file: ${fileName}. Click to change` : 'Click to select a file'}
          >
            {fileName ? (
              <span className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" aria-hidden="true" /> {fileName}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" aria-hidden="true" /> Click to select a file
              </span>
            )}
          </button>
          <p id="file-hint" className="text-xs text-slate-500 mt-2">Images, PDFs, Documents, Audio, or Video files</p>
        </div>
      )}

      {submissionType === 'text' && (
        <div className="mb-4">
          <label htmlFor="submission-text" className="block text-sm font-bold text-slate-300 mb-2">Your response</label>
          <textarea
            id="submission-text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type your answer or describe what you did..."
            rows={5}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none resize-y min-h-[120px]"
            aria-describedby="text-hint"
          />
          <p id="text-hint" className="text-xs text-slate-500 mt-2">Write your answer, explain your work, or describe what you created</p>
        </div>
      )}

      {/* Note field - shown for link and file types only (text type IS the response) */}
      {submissionType !== 'text' && (
        <div className="mb-6">
          <label htmlFor="submission-note" className="block text-sm font-bold text-slate-300 mb-2">Note to teacher (optional)</label>
          <textarea
            id="submission-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you want your teacher to know..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none resize-none"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isProcessing}
          className="flex-1 py-3 bg-yellow-500 text-slate-900 font-black uppercase rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>Processing...</>
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
function MySubmissions({ submissions, onClose }) {
  const mySubmissions = submissions.filter(s => s.status !== 'approved' || new Date(s.reviewedAt) > new Date(Date.now() - 86400000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="submissions-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 id="submissions-dialog-title" className="text-2xl font-black uppercase italic flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-500" aria-hidden="true" /> My Submissions
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close submissions">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {mySubmissions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No submissions yet. Complete an activity to submit your work!</p>
        ) : (
          <div className="space-y-4">
            {mySubmissions.map(sub => (
              <div key={sub.id} className={`p-4 rounded-xl border-2 ${sub.status === 'pending' ? 'bg-blue-900/20 border-blue-600' : sub.status === 'approved' ? 'bg-green-900/20 border-green-600' : 'bg-red-900/20 border-red-600'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-white">{sub.activityTitle}</p>
                    <p className="text-xs text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${sub.status === 'pending' ? 'text-blue-400' : sub.status === 'approved' ? 'text-green-400' : 'text-red-400'}`} role="status">
                    {sub.status === 'pending' && <><Clock className="w-4 h-4" aria-hidden="true" /> Pending</>}
                    {sub.status === 'approved' && <><CheckCheck className="w-4 h-4" aria-hidden="true" /> Approved</>}
                    {sub.status === 'rejected' && <><XCircle className="w-4 h-4" aria-hidden="true" /> Try Again</>}
                  </div>
                </div>
                {sub.teacherFeedback && (
                  <div className="mt-2 p-2 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400">Teacher feedback:</p>
                    <p className="text-sm text-white">{sub.teacherFeedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============== TROPHY CASE ==============
function TrophyCase({ achievements, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="trophy-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 id="trophy-dialog-title" className="text-2xl font-black uppercase italic flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" aria-hidden="true" /> Trophy Case
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close trophy case">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = achievements.includes(achievement.id);
            return (
              <div key={achievement.id} className={`p-4 rounded-xl border-2 text-center ${unlocked ? 'bg-slate-700 border-yellow-500' : 'bg-slate-800/50 border-slate-700 opacity-50'}`} aria-label={`${achievement.title}: ${achievement.desc}${unlocked ? ' - Unlocked' : ' - Locked'}`}>
                <div className={`text-4xl mb-2 ${unlocked ? '' : 'grayscale'}`} aria-hidden="true">{achievement.icon}</div>
                <p className="font-bold text-sm">{achievement.title}</p>
                <p className="text-xs text-slate-400 mt-1">{achievement.desc}</p>
                {unlocked && <p className="text-xs text-yellow-500 mt-2">+{achievement.xpReward} XP</p>}
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
  const currentLevel = getCurrentLevel ? getCurrentLevel() : { level: 1 };

  // Load teacher custom rewards for this class
  useEffect(() => {
    if (classId) {
      backend.getCustomRewards(classId).then(items => {
        setRewardsShopItems(items.filter(i => i.active !== false));
      }).catch(() => {});
    }
  }, [classId]);

  const tabs = [
    { id: 'colors', label: 'Skin', icon: '🎨' },
    { id: 'hats', label: 'Headgear', icon: '🎩' },
    { id: 'accessories', label: 'Effects', icon: '✨' },
    { id: 'faces', label: 'Expression', icon: '😎' },
    ...(rewardsShopItems.length > 0 ? [{ id: 'rewards', label: 'Rewards', icon: '🎁' }] : []),
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
      alert('Reward redeemed! Your teacher will be notified. Follow the directions to claim your reward.');
    } catch (error) {
      alert('Error redeeming reward: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="avatar-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="avatar-dialog-title" className="text-2xl font-black uppercase italic flex items-center gap-2">
            <User className="w-8 h-8 text-yellow-500" aria-hidden="true" /> My Avatar
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close avatar builder">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Avatar preview + info side by side */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {/* Large avatar preview with hover preview */}
          <div className="flex-shrink-0 bg-slate-900/50 rounded-2xl p-4 border border-slate-700 relative">
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
                  className="px-3 py-1.5 bg-slate-700 rounded-lg text-white"
                  placeholder="Your name"
                  maxLength={20}
                />
                <button onClick={() => { onSetName(tempName); setEditingName(false); }} className="px-3 py-1.5 bg-yellow-500 text-slate-900 rounded-lg font-bold text-sm">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="text-lg font-bold text-white hover:text-yellow-400 transition-colors mb-1 block" aria-label={`Edit name: ${gameState.playerName || 'not set'}`}>
                {gameState.playerName || 'Click to set name'} <span className="text-sm text-slate-500">edit</span>
              </button>
            )}

            <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-yellow-400" aria-hidden="true" />
                <span className="font-bold">{gameState.coins} coins</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-400">{gameState.ownedItems.length} items owned</span>
            </div>

            {/* Currently equipped items summary */}
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Currently Equipped</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Skin', value: AVATAR_ITEMS.colors.find(c => c.id === currentAvatarNormalized.color)?.name || 'Default' },
                  { label: 'Hat', value: AVATAR_ITEMS.hats.find(h => h.id === currentAvatarNormalized.hat)?.name || 'None' },
                  { label: 'Effect', value: AVATAR_ITEMS.accessories.find(a => a.id === currentAvatarNormalized.accessory)?.name || 'None' },
                  { label: 'Face', value: AVATAR_ITEMS.faces.find(f => f.id === currentAvatarNormalized.face)?.name || 'Happy' },
                ].map(slot => (
                  <div key={slot.label} className="flex items-center gap-1.5">
                    <span className="text-slate-500">{slot.label}:</span>
                    <span className="text-yellow-400 font-bold">{slot.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evolution info */}
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Avatar Evolution</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { minLevel: 1, label: 'Basic Form', desc: 'Starting look' },
                  { minLevel: 3, label: 'Aura Glow', desc: 'Energy surrounds you' },
                  { minLevel: 5, label: 'Armor Up', desc: 'Shoulder guards + float' },
                  { minLevel: 7, label: 'Mythic Wings', desc: 'Wings + epic aura' },
                  { minLevel: 15, label: 'Ascended', desc: 'Particle trail' },
                  { minLevel: 20, label: 'Godly', desc: 'Crown halo' },
                ].map((tier) => (
                  <div key={tier.minLevel} className={`flex items-center gap-2 ${currentLevel.level >= tier.minLevel ? 'text-yellow-400' : 'text-slate-500'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${currentLevel.level >= tier.minLevel ? 'border-yellow-400 bg-yellow-400/20' : 'border-slate-600'}`}>
                      {currentLevel.level >= tier.minLevel ? '✓' : tier.minLevel}
                    </span>
                    <span className="font-bold">{tier.label}</span>
                    <span className="text-slate-500">{tier.desc}</span>
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
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="mr-1">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Rewards tab content */}
        {activeTab === 'rewards' ? (
          <div className="space-y-3 max-h-64 overflow-y-auto" role="tabpanel" aria-label="Teacher rewards">
            <p className="text-xs text-slate-400 mb-2">Spend coins on real-world rewards from your teacher!</p>
            {rewardsShopItems.map(item => (
              <div key={item.id} className="bg-slate-700 rounded-xl p-4 border border-slate-600 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 border-2 border-green-500 rounded-lg flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-yellow-400 font-bold text-sm">{item.cost} coins</p>
                  <button
                    onClick={() => handleRedeemReward(item)}
                    disabled={gameState.coins < item.cost}
                    className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold ${
                      gameState.coins >= item.cost
                        ? 'bg-green-500 text-slate-900 hover:bg-green-400'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {gameState.coins >= item.cost ? 'Redeem' : 'Not enough'}
                  </button>
                </div>
              </div>
            ))}
            {rewardsShopItems.length === 0 && (
              <p className="text-slate-500 text-center py-4">No rewards available yet. Ask your teacher!</p>
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
                    equipped ? 'border-yellow-500 bg-yellow-500/20 ring-2 ring-yellow-500/30' :
                    owned ? 'border-green-500/60 bg-green-500/10' :
                    gameState.coins >= item.cost ? 'border-slate-600 bg-slate-700 hover:border-slate-400 hover:scale-105' :
                    'border-slate-700 bg-slate-800 opacity-40'
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
                    <p className="text-xs text-yellow-400 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-yellow-400" aria-hidden="true" />{item.cost}
                    </p>
                  )}
                  {equipped && (
                    <p className="text-[10px] text-yellow-400 font-bold uppercase bg-yellow-400/10 px-1.5 rounded">Equipped</p>
                  )}
                  {owned && !equipped && (
                    <p className="text-[10px] text-green-400 font-bold uppercase">Owned</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem confirmation modal */}
      {redeemConfirm && redeemingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80" onClick={() => setRedeemConfirm(false)}>
          <div className="bg-slate-800 border-2 border-green-500 rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-green-400 mb-3">Redeem Reward?</h4>
            <p className="font-bold text-white mb-1">{redeemingItem.name}</p>
            <p className="text-sm text-slate-400 mb-3">{redeemingItem.description}</p>
            <p className="text-yellow-400 font-bold mb-3">Cost: {redeemingItem.cost} coins</p>
            {redeemingItem.directions && (
              <div className="bg-slate-700 rounded-lg p-3 mb-4 border border-slate-600">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">How to redeem:</p>
                <p className="text-sm text-white">{redeemingItem.directions}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRedeemConfirm(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg font-bold">Cancel</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mystery-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-2 border-purple-500 rounded-2xl max-w-sm w-full p-6 text-center">
        {!revealed ? (
          <>
            <div className="text-8xl mb-4 animate-bounce" aria-hidden="true">🎁</div>
            <h3 id="mystery-dialog-title" className="text-2xl font-black uppercase italic mb-4">Mystery Box!</h3>
            <button onClick={() => setRevealed(true)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase rounded-xl">
              Open Box
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4" aria-hidden="true">✨</div>
            <p className={`text-sm uppercase tracking-widest ${reward.color} mb-2`}>{reward.rarity}</p>
            <h3 className="text-2xl font-black mb-2">{reward.name}</h3>
            <p className="text-xl text-yellow-400 mb-6">{reward.desc}</p>
            <button onClick={onClose} className="w-full py-3 bg-yellow-500 text-slate-900 font-black uppercase rounded-xl">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="levelup-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 border-4 border-yellow-400 rounded-2xl max-w-sm w-full p-8 text-center" role="alert">
        <div className="flex justify-center mb-4">
          <Avatar3D avatar={avatar} level={level.level} size="md" animate={true} />
        </div>
        <h3 id="levelup-dialog-title" className="text-3xl font-black uppercase italic text-white mb-2">Level Up!</h3>
        <p className={`text-4xl font-black ${level.color} mb-2`}>Level {level.level}</p>
        <p className="text-2xl font-bold text-white mb-2">{level.title}</p>
        {level.coinsEarned > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" aria-hidden="true" />
            <span className="text-lg font-black text-yellow-200">+{level.coinsEarned} Coins</span>
          </div>
        )}
        {evoLabel && (
          <p className="text-sm font-bold text-yellow-200 bg-yellow-800/50 rounded-lg py-1.5 px-3 mb-4 inline-block">{evoLabel}</p>
        )}
        <button onClick={onClose} className="w-full py-3 bg-white text-yellow-700 font-black uppercase rounded-xl mt-2">Let's Go!</button>
      </div>
    </div>
  );
}

function AchievementModal({ achievement, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="achievement-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-4 border-yellow-500 rounded-2xl max-w-sm w-full p-8 text-center" role="alert">
        <div className="text-8xl mb-4" aria-hidden="true">{achievement.icon}</div>
        <p className="text-sm uppercase tracking-widest text-yellow-500 mb-2">Achievement Unlocked!</p>
        <h3 id="achievement-dialog-title" className="text-2xl font-black uppercase italic text-white mb-2">{achievement.title}</h3>
        <p className="text-slate-400 mb-4">{achievement.desc}</p>
        <p className="text-xl text-yellow-400 font-bold mb-6">+{achievement.xpReward} XP</p>
        <button onClick={onClose} className="w-full py-3 bg-yellow-500 text-slate-900 font-black uppercase rounded-xl">Awesome!</button>
      </div>
    </div>
  );
}

// ============== ACTIVITY CARD ==============
function ActivityCard({ path, selectedOption, onSelect, completedActivities, pendingActivities }) {
  const IconComponent = IconMap[path.icon] || BookOpen;

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`path-title-${path.id}`}>
      <div className={`flex items-center gap-3 p-4 rounded-t-xl ${path.color}`}>
        <IconComponent className="w-6 h-6" aria-hidden="true" />
        <div>
          <h2 id={`path-title-${path.id}`} className="font-black uppercase italic leading-none">{path.title}</h2>
          <span className="text-xs opacity-80 font-bold">{path.subtitle}</span>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-b-xl border-x border-b border-slate-700 flex-1 flex flex-col gap-4">
        {path.options.map((opt) => {
          const isCompleted = completedActivities.includes(opt.id);
          const isPending = pendingActivities.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(path.id, opt)}
              className={`text-left p-4 rounded-lg border-2 transition-all group ${
                isCompleted ? 'border-green-500/50 bg-green-900/20'
                : isPending ? 'border-blue-500/50 bg-blue-900/20'
                : selectedOption === opt.id ? 'border-yellow-500 bg-slate-700'
                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
              aria-label={`${opt.title}: ${opt.desc}${isCompleted ? ' - Completed' : isPending ? ' - Pending approval' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black uppercase text-slate-400 group-hover:text-yellow-500">{opt.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-500 font-bold">+{opt.xp} XP</span>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />}
                  {isPending && <Clock className="w-5 h-5 text-blue-400" aria-hidden="true" />}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{opt.title}</h3>
              <p className="text-sm text-slate-400 leading-snug">{opt.desc}</p>
              {isPending && <p className="text-xs text-blue-400 mt-2">Waiting for teacher approval...</p>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============== INSTRUCTION MODAL ==============
// Render text with basic markdown-style formatting: **bold** and *italic*
function renderFormattedText(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let key = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={key++} className="font-bold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic text-slate-200">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

// Render a single step, handling both old string format and new object format
function renderStep(step, idx) {
  // Backward compat: old steps are plain strings
  const stepObj = typeof step === 'string' ? { text: step } : step;

  return (
    <li key={idx} className="flex gap-3 text-slate-300">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-yellow-500 flex items-center justify-center text-xs font-bold border border-slate-600">{idx + 1}</span>
      <div className="text-sm leading-relaxed">
        <span>{renderFormattedText(stepObj.text)}</span>
        {stepObj.link && (
          <a
            href={stepObj.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-1 text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            {stepObj.linkText || stepObj.link}
          </a>
        )}
      </div>
    </li>
  );
}

function InstructionModal({ activity, path, onSubmit, onClose, dailyQuest, dailyCompleted, isPending, isCompleted }) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const isDailyMatch = dailyQuest && (
    (dailyQuest.targetType && activity.type === dailyQuest.targetType) ||
    (dailyQuest.targetPath && path.id === dailyQuest.targetPath)
  );

  const handleSubmit = (submissionData) => {
    onSubmit(activity, path.id, submissionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="instruction-dialog-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white" aria-label="Close activity instructions">
          <X className="w-6 h-6" aria-hidden="true" />
        </button>

        {!showSubmitForm ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500 rounded-lg" aria-hidden="true">
                <PlayCircle className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 id="instruction-dialog-title" className="text-2xl font-black uppercase italic">{activity.title}</h3>
                <p className="text-yellow-500 text-sm font-bold uppercase tracking-widest">Active Objective</p>
              </div>
            </div>

            {isDailyMatch && !dailyCompleted && (
              <div className="bg-purple-600/30 border border-purple-500 p-3 rounded-lg mb-6 flex items-center gap-2" role="note">
                <Target className="w-5 h-5 text-purple-400" aria-hidden="true" />
                <span className="text-sm text-purple-200"><strong>Daily Quest Bonus!</strong> Earn {dailyQuest.multiplier}x XP</span>
              </div>
            )}

            <div className="bg-slate-700/50 p-3 rounded-lg mb-6 flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-yellow-400">+{activity.xp} XP</span>
              {isDailyMatch && !dailyCompleted && <span className="text-purple-400 font-bold">→ +{activity.xp * dailyQuest.multiplier} XP</span>}
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest">How to Play:</h4>
              <ol className="space-y-3">
                {activity.steps.map((step, idx) => renderStep(step, idx))}
              </ol>
            </div>

            {activity.proTip && (
              <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-1 text-blue-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Pro Tip</span>
                </div>
                <p className="text-sm text-blue-100">{renderFormattedText(activity.proTip)}</p>
              </div>
            )}

            {isCompleted ? (
              <div className="text-center text-green-400 font-bold py-3" role="status">
                <CheckCircle2 className="w-6 h-6 inline mr-2" aria-hidden="true" />
                Already completed!
              </div>
            ) : isPending ? (
              <div className="text-center text-blue-400 font-bold py-3" role="status">
                <Clock className="w-6 h-6 inline mr-2" aria-hidden="true" />
                Waiting for teacher approval...
              </div>
            ) : (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-black uppercase italic rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" aria-hidden="true" /> Submit My Work
              </button>
            )}
          </>
        ) : (
          <SubmissionForm
            activityTitle={activity.title}
            onSubmit={handleSubmit}
            onCancel={() => setShowSubmitForm(false)}
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
    spendCoins,
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

  // Helper to extract pending status safely
  const pendingActivities = submissions ? submissions.filter(s => s.status === 'pending' && !s.isBoss).map(s => s.activityId) : [];
  const pendingBossIds = submissions ? submissions.filter(s => s.status === 'pending' && s.isBoss).map(s => s.activityId) : [];
  const myPendingCount = submissions ? submissions.filter(s => s.status === 'pending').length : 0;

  const handleSelect = (pathId, activity) => {
    setSelectedPath(prev => ({ ...prev, [pathId]: activity.id }));
    setActiveInstruction(activity);
    setActivePath(learningPaths.find(p => p.id === pathId));
  };

  const handleSubmitActivity = (activity, pathId, submissionData) => {
    submitActivity(activity, pathId, submissionData);
  };

  const handleSubmitBoss = (boss, submissionData) => {
    submitBossChallenge(boss, submissionData);
  };

  // Check for current boss pending status
  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const defaultBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const currentBoss = activeBoss || defaultBoss;
  const hasPendingBoss = pendingBossIds.includes(currentBoss.id);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans relative">
      <a href="#main-content" className="sr-skip-link">Skip to main content</a>
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20" aria-hidden="true">
            <Gamepad2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase mb-2">
            Level Up: Adventure Mission
          </h1>
          <p className="text-slate-400 text-lg">Choose your path. Master the content. Own the game.</p>
        </header>

        <PlayerStats
          gameState={gameState}
          getCurrentLevel={getCurrentLevel}
          getNextLevelXp={getNextLevelXp}
          onOpenProfile={() => setShowAvatarBuilder(true)}
          onOpenMysteryBox={openMysteryBox}
          onOpenSubmissions={() => setShowMySubmissions(true)}
          pendingSubmissions={myPendingCount}
        />

        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setShowTrophyCase(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-yellow-500 transition-colors"
            aria-label={`Trophies: ${gameState.unlockedAchievements.length} of ${ACHIEVEMENTS.length} unlocked`}
          >
            <Trophy className="w-5 h-5 text-yellow-500" aria-hidden="true" />
            <span className="font-bold">Trophies</span>
            <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full">
              {gameState.unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-blue-500 transition-colors"
            aria-label="View class leaderboard"
          >
            <Crown className="w-5 h-5 text-blue-400" aria-hidden="true" />
            <span className="font-bold">Leaderboard</span>
          </button>
          <button
            onClick={() => setShowLevelEconomyGuide(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-amber-400 transition-colors text-amber-300"
            aria-label="View Level Progression & Gold Guide"
          >
            <Award className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <span className="font-bold">Levels & Gold Guide</span>
          </button>
          <button
            onClick={() => { setLegalModalTab('privacy'); setShowLegalModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500 transition-colors text-slate-300 hover:text-white ml-auto"
            aria-label="View Student Data Privacy & Terms"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span className="font-bold text-sm">Privacy & Terms</span>
          </button>
        </div>

        {/* Student Spotlight Banner */}
        {classSpotlight && (
          <section className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-2 border-yellow-500/50" aria-label="Student Spotlight">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Avatar3D avatar={classSpotlight.avatar} level={(() => {
                  let lvl = 1;
                  for (const l of LEVELS) { if (classSpotlight.xp >= l.xpRequired) lvl = l.level; else break; }
                  return lvl;
                })()} size="sm" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                    {classSpotlight.category === 'star_student' && 'Star Student'}
                    {classSpotlight.category === 'most_improved' && 'Most Improved'}
                    {classSpotlight.category === 'team_player' && 'Team Player'}
                    {classSpotlight.category === 'creative_genius' && 'Creative Genius'}
                  </span>
                </div>
                <p className="font-black text-white text-lg">{classSpotlight.studentName}</p>
                <p className="text-sm text-slate-300 italic">"{classSpotlight.message}"</p>
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
          guilds={classGuilds}
          spendCoins={spendCoins}
        />
        <BossChallenge
          completedBosses={gameState.completedBossChallenges}
          onSubmit={handleSubmitBoss}
          hasPendingSubmission={hasPendingBoss}
          activeBoss={currentBoss}
        />

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
            learningPaths.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
            learningPaths.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' :
            learningPaths.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
            learningPaths.length === 5 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5' :
            learningPaths.length >= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
          aria-label="Learning paths"
        >
          {learningPaths.map((path) => (
            <ActivityCard
              key={path.id}
              path={path}
              selectedOption={selectedPath[path.id]}
              onSelect={handleSelect}
              completedActivities={gameState.completedActivities}
              pendingActivities={pendingActivities}
            />
          ))}
        </main>

        <div className="text-center pb-20">
          <button onClick={() => setShowInfo(!showInfo)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors" aria-expanded={showInfo} aria-controls="pedagogical-info">
            <Info className="w-4 h-4" aria-hidden="true" />
            {showInfo ? 'Hide Pedagogical Connections' : 'Show Pedagogical Connections'}
          </button>

          {showInfo && (
            <div id="pedagogical-info" className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-left max-w-4xl mx-auto">
              <h4 className="text-yellow-500 font-bold uppercase mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Why this works
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-bold text-slate-300 underline mb-1">Removing Barriers (UDL)</p>
                  <p className="text-slate-400 italic">"By offering 'Low Tech' options, students blocked by digital navigation can still show mastery."</p>
                </div>
                <div>
                  <p className="font-bold text-slate-300 underline mb-1">Teacher Verification</p>
                  <p className="text-slate-400 italic">"Students submit proof of work. Teachers approve submissions before XP is awarded."</p>
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
          isCompleted={gameState.completedActivities.includes(activeInstruction.id)}
        />
      )}

      {showLeaderboard && effectiveClassId && <Leaderboard classId={effectiveClassId} currentPlayerId={user?.id} onClose={() => setShowLeaderboard(false)} />}
      {showTrophyCase && <TrophyCase achievements={gameState.unlockedAchievements} onClose={() => setShowTrophyCase(false)} />}
      {showAvatarBuilder && <AvatarBuilder gameState={gameState} getCurrentLevel={getCurrentLevel} onBuy={buyAvatarItem} onEquip={equipAvatarItem} onClose={() => setShowAvatarBuilder(false)} onSetName={setPlayerName} classId={effectiveClassId} userId={user?.id} />}
      {showMySubmissions && <MySubmissions submissions={submissions} onClose={() => setShowMySubmissions(false)} />}
      {showMysteryReward && <MysteryBoxModal reward={showMysteryReward} onClose={() => setShowMysteryReward(null)} />}
      {showLevelUp && newLevel && <LevelUpModal level={newLevel} avatar={gameState.avatar} onClose={() => setShowLevelUp(false)} />}
      {showAchievement && <AchievementModal achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      <LevelEconomyGuideModal isOpen={showLevelEconomyGuide} onClose={() => setShowLevelEconomyGuide(false)} />

      <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <button
            onClick={() => { setLegalModalTab('privacy'); setShowLegalModal(true); }}
            className="hover:text-blue-400 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={() => { setLegalModalTab('terms'); setShowLegalModal(true); }}
            className="hover:text-blue-400 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={() => { setLegalModalTab('compliance'); setShowLegalModal(true); }}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1 inline-flex"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Student Data Privacy Compliance
          </button>
        </div>
        <p className="text-[11px] text-slate-600">
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

// ============== MAIN APP ROUTER ==============
function AppContent() {
  const { user, loading } = useAuth();
  const [activeViewMode, setActiveViewMode] = useState(null); // 'admin' | 'teacher' | 'student'
  const [emulationClasses, setEmulationClasses] = useState([]);
  const [emulatedClassId, setEmulatedClassId] = useState(null);

  // Load teacher's or admin's classes for student emulation
  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      backend.getClasses(user.id).then(clsList => {
        if (clsList && clsList.length > 0) {
          setEmulationClasses(clsList);
          setEmulatedClassId(prev => prev || clsList[0].id);
        }
      }).catch(e => console.error("Error loading emulation classes", e));
    }
  }, [user]);

  // Set default view mode when user logs in or role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && !activeViewMode) {
        setActiveViewMode('admin');
      } else if (user.role === 'teacher' && !activeViewMode) {
        setActiveViewMode('teacher');
      }
    } else {
      setActiveViewMode(null);
    }
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white" role="status" aria-live="polite">Loading...</div>;

  if (!user) {
    return <LoginScreen />;
  }

  const currentMode = activeViewMode || (user.role === 'admin' ? 'admin' : user.role === 'teacher' ? 'teacher' : 'student');
  const isElevatedUser = user.role === 'admin' || user.role === 'teacher';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Sticky Navigation View Switcher Bar */}
      {isElevatedUser && (
        <header className="bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {user.role === 'admin' ? (
              <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-black uppercase rounded-lg tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> System Admin
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-black uppercase rounded-lg tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Teacher
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Signed in as <strong className="text-white">{user.name || user.email}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1 hidden md:inline">Mode:</span>
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveViewMode('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentMode === 'admin'
                    ? 'bg-yellow-500 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
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
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Teacher View
            </button>

            <button
              onClick={() => setActiveViewMode('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentMode === 'student'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
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
            onSwitchToTeacher={() => setActiveViewMode('teacher')}
            onSwitchToStudent={() => setActiveViewMode('student')}
          />
        ) : currentMode === 'teacher' ? (
          <TeacherPortal
            onSwitchToAdmin={() => setActiveViewMode('admin')}
            onSwitchToStudent={() => setActiveViewMode('student')}
          />
        ) : (
          <div>
            <div className="bg-purple-950/90 border-b border-purple-800/60 p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-purple-200 shadow-md">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white uppercase tracking-wider">Student Emulation Mode</span>
                </div>
                {emulationClasses.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 text-xs">Previewing Class:</span>
                    <select
                      value={emulatedClassId || ''}
                      onChange={e => setEmulatedClassId(e.target.value)}
                      className="px-2 py-1 bg-slate-900 border border-purple-700/60 rounded text-xs text-white outline-none focus:border-yellow-400"
                    >
                      {emulationClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {emulationClasses.length === 1 && (
                  <span className="text-purple-300 text-xs">
                    Class: <strong className="text-white">{emulationClasses[0].name}</strong>
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveViewMode(user.role === 'admin' ? 'admin' : 'teacher')}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors border border-purple-400/40"
              >
                Exit Emulation
              </button>
            </div>
            <GameContent emulatedClassId={emulatedClassId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
