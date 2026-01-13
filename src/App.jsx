import React, { useState, useRef } from 'react';
import {
  Gamepad2, Mic, BarChart3, Palette, CheckCircle2, Trophy, Rocket, Info, X, PlayCircle,
  Star, Gift, Swords, Users, User, Sparkles, Zap, Shield, Crown, Target,
  Upload, Link, Clock, CheckCheck, XCircle, ClipboardList, Lock, Eye, FileText
} from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import {
  LEVELS, ACHIEVEMENTS, GUILDS, AVATAR_ITEMS, BOSS_CHALLENGES, LEARNING_PATHS
} from './data/gameData';

const IconMap = { Mic, BarChart3, Palette };

// ============== PLAYER STATS BAR ==============
function PlayerStats({ gameState, getCurrentLevel, getNextLevelXp, onOpenProfile, onOpenMysteryBox, onOpenSubmissions, pendingSubmissions }) {
  const currentLevel = getCurrentLevel();
  const nextLevelXp = getNextLevelXp();
  const progress = ((gameState.xp - currentLevel.xpRequired) / (nextLevelXp - currentLevel.xpRequired)) * 100;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onOpenProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className={`w-12 h-12 rounded-full ${AVATAR_ITEMS.colors.find(c => c.id === gameState.avatar.color)?.value || 'bg-blue-500'} flex items-center justify-center text-2xl relative`}>
            {AVATAR_ITEMS.faces.find(f => f.id === gameState.avatar.face)?.emoji || '😊'}
            {gameState.avatar.hat !== 'none' && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg">
                {AVATAR_ITEMS.hats.find(h => h.id === gameState.avatar.hat)?.emoji}
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="font-bold text-white">{gameState.playerName || 'Player'}</p>
            <p className={`text-sm font-bold ${currentLevel.color}`}>Lv.{currentLevel.level} {currentLevel.title}</p>
          </div>
        </button>

        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">XP</span>
            <span className="text-yellow-500 font-bold">{gameState.xp} / {nextLevelXp}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="w-5 h-5 fill-yellow-400" />
            <span className="font-bold">{gameState.coins}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <Zap className="w-5 h-5" />
            <span className="font-bold">{gameState.currentStreak}</span>
          </div>
          {pendingSubmissions > 0 && (
            <button
              onClick={onOpenSubmissions}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg"
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm">{pendingSubmissions}</span>
            </button>
          )}
          {gameState.pendingMysteryBoxes > 0 && (
            <button
              onClick={onOpenMysteryBox}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg animate-pulse"
            >
              <Gift className="w-5 h-5" />
              <span className="font-bold">{gameState.pendingMysteryBoxes}</span>
            </button>
          )}
        </div>
      </div>

      {(gameState.doubleXpActive || gameState.streakShieldActive) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
          {gameState.doubleXpActive && (
            <span className="text-xs bg-pink-600/30 text-pink-300 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 2x XP Active
            </span>
          )}
          {gameState.streakShieldActive && (
            <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Streak Protected
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
    <div className={`mb-6 p-4 rounded-xl border-2 ${completed ? 'bg-green-900/30 border-green-600' : 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${completed ? 'bg-green-600' : 'bg-purple-600'}`}>
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
            <span className="text-green-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" /> Complete!
            </span>
          ) : (
            <span className="text-yellow-400 font-bold">{quest.multiplier}x XP</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== GUILD PANEL ==============
function GuildPanel({ currentGuild, onJoinGuild, guildXp }) {
  const [showGuilds, setShowGuilds] = useState(false);

  if (!currentGuild) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowGuilds(true)}
          className="w-full p-4 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl hover:border-slate-500 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Users className="w-5 h-5" />
            <span className="font-bold">Join a Guild to compete with friends!</span>
          </div>
        </button>

        {showGuilds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-lg w-full p-6">
              <h3 className="text-2xl font-black uppercase italic mb-6 text-center">Choose Your Guild</h3>
              <div className="grid grid-cols-2 gap-4">
                {GUILDS.map(guild => (
                  <button
                    key={guild.id}
                    onClick={() => { onJoinGuild(guild.id); setShowGuilds(false); }}
                    className={`p-4 rounded-xl ${guild.color} hover:opacity-90 transition-opacity text-left`}
                  >
                    <span className="text-3xl">{guild.emoji}</span>
                    <p className="font-black mt-2">{guild.name}</p>
                    <p className="text-xs opacity-80">{guild.motto}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowGuilds(false)} className="w-full mt-4 py-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white">
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const guild = GUILDS.find(g => g.id === currentGuild);

  return (
    <div className={`mb-6 p-4 rounded-xl ${guild.color} bg-opacity-30 border border-opacity-50`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{guild.emoji}</span>
          <div>
            <p className="font-black text-white">{guild.name}</p>
            <p className="text-xs opacity-80">{guild.motto}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Your Contribution</p>
          <p className="font-bold text-yellow-400">{guildXp} XP</p>
        </div>
      </div>
    </div>
  );
}

// ============== BOSS CHALLENGE ==============
function BossChallenge({ completedBosses, onSubmit, hasPendingSubmission }) {
  const [showBoss, setShowBoss] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const currentBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
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
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-slate-700' : hasPendingSubmission ? 'bg-blue-600' : 'bg-red-600'}`}>
              <Swords className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">Weekly Boss</p>
              <p className="font-black text-white">{currentBoss.name}</p>
            </div>
          </div>
          {isCompleted ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              <Crown className="w-5 h-5" /> Defeated!
            </span>
          ) : hasPendingSubmission ? (
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <Clock className="w-5 h-5" /> Pending
            </span>
          ) : (
            <span className="text-yellow-400 font-bold">+{currentBoss.reward} XP</span>
          )}
        </div>
      </button>

      {showBoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowBoss(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>

            {!showSubmitForm ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">👹</div>
                  <h3 className="text-2xl font-black uppercase italic text-red-400">{currentBoss.name}</h3>
                  <p className="text-slate-400 mt-2">{currentBoss.desc}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest">Battle Plan:</h4>
                  <ol className="space-y-3">
                    {currentBoss.steps.map((step, idx) => (
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
                  <div className="text-center text-blue-400 font-bold py-3">
                    <Clock className="w-6 h-6 inline mr-2" />
                    Waiting for teacher approval...
                  </div>
                )}
                {isCompleted && (
                  <div className="text-center text-green-400 font-bold py-3">
                    <CheckCircle2 className="w-6 h-6 inline mr-2" />
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
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB for localStorage)
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Please upload a file smaller than 5MB, or use a link instead.');
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

    onSubmit({
      type: submissionType,
      content: submissionType === 'link' ? linkValue.trim() : fileData,
      fileName: submissionType === 'file' ? fileName : null,
      fileType: submissionType === 'file' ? fileType : null,
      note: note.trim()
    });
  };

  return (
    <div>
      <h3 className="text-xl font-black uppercase italic mb-4 text-center">Submit Your Work</h3>
      <p className="text-slate-400 text-sm text-center mb-6">for: {activityTitle}</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubmissionType('link')}
          className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${submissionType === 'link' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
        >
          <Link className="w-5 h-5" /> Paste Link
        </button>
        <button
          onClick={() => setSubmissionType('file')}
          className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${submissionType === 'file' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
        >
          <Upload className="w-5 h-5" /> Upload File
        </button>
      </div>

      {submissionType === 'link' ? (
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-300 mb-2">Link to your work</label>
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
          />
          <p className="text-xs text-slate-500 mt-2">Paste a link to Google Docs, YouTube, Vocaroo, or any other website</p>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-300 mb-2">Upload your file</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.mp3,.mp4"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-6 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
          >
            {fileName ? (
              <span className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" /> {fileName}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" /> Click to select a file
              </span>
            )}
          </button>
          <p className="text-xs text-slate-500 mt-2">Images, PDFs, Documents, Audio, or Video files</p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-300 mb-2">Note to teacher (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything you want your teacher to know..."
          rows={2}
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none resize-none"
        />
      </div>

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
            <><Rocket className="w-5 h-5" /> Submit</>
          )}
        </button>
      </div>
    </div>
  );
}

// ============== FILE VIEWER COMPONENT ==============
function FileViewer({ content, fileName, fileType }) {
  if (!content) return null;

  // Check if it's an image
  if (fileType?.startsWith('image/')) {
    return (
      <div className="mt-2">
        <img src={content} alt={fileName} className="max-w-full max-h-64 rounded-lg border border-slate-600" />
      </div>
    );
  }

  // Check if it's a PDF
  if (fileType === 'application/pdf') {
    return (
      <div className="mt-2">
        <a
          href={content}
          download={fileName}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
        >
          <FileText className="w-5 h-5" /> Download PDF: {fileName}
        </a>
      </div>
    );
  }

  // Check if it's audio
  if (fileType?.startsWith('audio/')) {
    return (
      <div className="mt-2">
        <audio controls src={content} className="w-full">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Check if it's video
  if (fileType?.startsWith('video/')) {
    return (
      <div className="mt-2">
        <video controls src={content} className="max-w-full max-h-64 rounded-lg">
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Default: download link for other file types
  return (
    <div className="mt-2">
      <a
        href={content}
        download={fileName}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold"
      >
        <FileText className="w-5 h-5" /> Download: {fileName}
      </a>
    </div>
  );
}

// ============== MY SUBMISSIONS ==============
function MySubmissions({ submissions, onClose }) {
  const mySubmissions = submissions.filter(s => s.status !== 'approved' || new Date(s.reviewedAt) > new Date(Date.now() - 86400000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-500" /> My Submissions
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
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
                  <div className={`flex items-center gap-1 text-sm font-bold ${sub.status === 'pending' ? 'text-blue-400' : sub.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                    {sub.status === 'pending' && <><Clock className="w-4 h-4" /> Pending</>}
                    {sub.status === 'approved' && <><CheckCheck className="w-4 h-4" /> Approved</>}
                    {sub.status === 'rejected' && <><XCircle className="w-4 h-4" /> Try Again</>}
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

// ============== TEACHER DASHBOARD ==============
function TeacherDashboard({ submissions, onApprove, onReject, onClear, onClose }) {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

  const handleApprove = (id) => {
    onApprove(id, feedback);
    setSelectedSubmission(null);
    setFeedback('');
  };

  const handleReject = (id) => {
    onReject(id, feedback);
    setSelectedSubmission(null);
    setFeedback('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-green-500 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-green-500" /> Teacher Dashboard
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedSubmission ? (
          <div>
            <button onClick={() => setSelectedSubmission(null)} className="text-sm text-slate-400 hover:text-white mb-4">
              ← Back to list
            </button>

            <div className="bg-slate-700 rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-xl text-white">{selectedSubmission.activityTitle}</p>
                  <p className="text-sm text-slate-400">by {selectedSubmission.playerName}</p>
                  <p className="text-xs text-slate-500">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                </div>
                <span className="bg-yellow-500 text-slate-900 px-3 py-1 rounded-full font-bold text-sm">
                  +{selectedSubmission.xp} XP
                </span>
              </div>

              <div className="bg-slate-800 p-3 rounded-lg mb-4">
                <p className="text-xs text-slate-400 mb-1">Submission ({selectedSubmission.submissionType}):</p>
                {selectedSubmission.submissionType === 'link' ? (
                  <a href={selectedSubmission.submissionContent} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                    {selectedSubmission.submissionContent}
                  </a>
                ) : (
                  <div>
                    <p className="text-white text-sm mb-2">{selectedSubmission.fileName || 'Uploaded file'}</p>
                    <FileViewer
                      content={selectedSubmission.submissionContent}
                      fileName={selectedSubmission.fileName}
                      fileType={selectedSubmission.fileType}
                    />
                  </div>
                )}
              </div>

              {selectedSubmission.submissionNote && (
                <div className="bg-slate-800 p-3 rounded-lg mb-4">
                  <p className="text-xs text-slate-400 mb-1">Student note:</p>
                  <p className="text-white text-sm">{selectedSubmission.submissionNote}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-300 mb-2">Feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Great job! / Try adding more detail..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-green-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReject(selectedSubmission.id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" /> Needs Revision
              </button>
              <button
                onClick={() => handleApprove(selectedSubmission.id)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCheck className="w-5 h-5" /> Approve
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest mb-3">
                Pending Review ({pendingSubmissions.length})
              </h4>
              {pendingSubmissions.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No pending submissions</p>
              ) : (
                <div className="space-y-2">
                  {pendingSubmissions.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-left transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">{sub.activityTitle}</p>
                        <p className="text-sm text-slate-400">{sub.playerName} • {new Date(sub.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-bold text-sm">+{sub.xp} XP</span>
                        <Eye className="w-5 h-5 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reviewedSubmissions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest">
                    Recently Reviewed ({reviewedSubmissions.length})
                  </h4>
                  <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
                    Clear history
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviewedSubmissions.slice(0, 10).map(sub => (
                    <div key={sub.id} className={`p-3 rounded-lg ${sub.status === 'approved' ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-sm">{sub.activityTitle}</p>
                          <p className="text-xs text-slate-400">{sub.playerName}</p>
                        </div>
                        <span className={`text-xs font-bold ${sub.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                          {sub.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============== TEACHER PIN MODAL ==============
function TeacherPinModal({ onValidate, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (onValidate(pin)) {
      onClose(true);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-green-500 rounded-2xl max-w-sm w-full p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-green-600 rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-black uppercase italic">Teacher Access</h3>
          <p className="text-slate-400 text-sm mt-2">Enter PIN to view submissions</p>
        </div>

        <input
          type="password"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          placeholder="Enter PIN"
          maxLength={4}
          className={`w-full px-4 py-3 bg-slate-700 border-2 rounded-lg text-white text-center text-2xl tracking-widest font-bold placeholder-slate-500 focus:outline-none ${error ? 'border-red-500' : 'border-slate-600 focus:border-green-500'}`}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center mt-2">Incorrect PIN</p>}
        <p className="text-slate-500 text-xs text-center mt-2">Default: teach</p>

        <div className="flex gap-3 mt-6">
          <button onClick={() => onClose(false)} className="flex-1 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl">
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== TROPHY CASE ==============
function TrophyCase({ achievements, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" /> Trophy Case
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = achievements.includes(achievement.id);
            return (
              <div key={achievement.id} className={`p-4 rounded-xl border-2 text-center ${unlocked ? 'bg-slate-700 border-yellow-500' : 'bg-slate-800/50 border-slate-700 opacity-50'}`}>
                <div className={`text-4xl mb-2 ${unlocked ? '' : 'grayscale'}`}>{achievement.icon}</div>
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
function AvatarBuilder({ gameState, onBuy, onEquip, onClose, onSetName }) {
  const [activeTab, setActiveTab] = useState('colors');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(gameState.playerName);

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'hats', label: 'Hats' },
    { id: 'accessories', label: 'Flair' },
    { id: 'faces', label: 'Faces' },
  ];

  const items = AVATAR_ITEMS[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-2">
            <User className="w-8 h-8 text-yellow-500" /> My Avatar
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className={`w-24 h-24 rounded-full ${AVATAR_ITEMS.colors.find(c => c.id === gameState.avatar.color)?.value || 'bg-blue-500'} flex items-center justify-center text-5xl mx-auto relative`}>
            {AVATAR_ITEMS.faces.find(f => f.id === gameState.avatar.face)?.emoji || '😊'}
            {gameState.avatar.hat !== 'none' && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">
                {AVATAR_ITEMS.hats.find(h => h.id === gameState.avatar.hat)?.emoji}
              </span>
            )}
            {gameState.avatar.accessory !== 'none' && (
              <span className="absolute -bottom-1 right-0 text-2xl">
                {AVATAR_ITEMS.accessories.find(a => a.id === gameState.avatar.accessory)?.emoji}
              </span>
            )}
          </div>

          {editingName ? (
            <div className="mt-4 flex gap-2 justify-center">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="px-3 py-1 bg-slate-700 rounded-lg text-white text-center"
                placeholder="Your name"
                maxLength={20}
              />
              <button onClick={() => { onSetName(tempName); setEditingName(false); }} className="px-3 py-1 bg-yellow-500 text-slate-900 rounded-lg font-bold">
                Save
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="mt-4 text-slate-400 hover:text-white text-sm">
              {gameState.playerName || 'Click to set name'} ✏️
            </button>
          )}

          <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
            <Star className="w-4 h-4 fill-yellow-400" />
            <span className="font-bold">{gameState.coins} coins</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === tab.id ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
          {items.map(item => {
            const owned = gameState.ownedItems.includes(item.id);
            const equipped = gameState.avatar[activeTab.slice(0, -1)] === item.id;

            return (
              <button
                key={item.id}
                onClick={() => owned ? onEquip(activeTab.slice(0, -1), item.id) : gameState.coins >= item.cost && onBuy(item.id, item.cost)}
                disabled={!owned && gameState.coins < item.cost}
                className={`p-3 rounded-lg border-2 ${equipped ? 'border-yellow-500 bg-yellow-500/20' : owned ? 'border-green-500 bg-slate-700' : gameState.coins >= item.cost ? 'border-slate-600 bg-slate-700' : 'border-slate-700 bg-slate-800 opacity-50'}`}
              >
                <div className={`text-2xl mb-1 ${activeTab === 'colors' ? `w-8 h-8 rounded-full ${item.value} mx-auto` : ''}`}>
                  {activeTab !== 'colors' && (item.emoji || '—')}
                </div>
                <p className="text-xs font-bold truncate">{item.name}</p>
                {!owned && item.cost > 0 && <p className="text-xs text-yellow-400">{item.cost} 🪙</p>}
                {equipped && <p className="text-xs text-green-400">Equipped</p>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============== MYSTERY BOX MODAL ==============
function MysteryBoxModal({ reward, onClose }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-purple-500 rounded-2xl max-w-sm w-full p-6 text-center">
        {!revealed ? (
          <>
            <div className="text-8xl mb-4 animate-bounce">🎁</div>
            <h3 className="text-2xl font-black uppercase italic mb-4">Mystery Box!</h3>
            <button onClick={() => setRevealed(true)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase rounded-xl">
              Open Box
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">✨</div>
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
function LevelUpModal({ level, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 border-4 border-yellow-400 rounded-2xl max-w-sm w-full p-8 text-center">
        <div className="text-8xl mb-4">🎉</div>
        <h3 className="text-3xl font-black uppercase italic text-white mb-2">Level Up!</h3>
        <p className={`text-4xl font-black ${level.color} mb-2`}>Level {level.level}</p>
        <p className="text-2xl font-bold text-white mb-6">{level.title}</p>
        <button onClick={onClose} className="w-full py-3 bg-white text-yellow-700 font-black uppercase rounded-xl">Let's Go!</button>
      </div>
    </div>
  );
}

function AchievementModal({ achievement, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-4 border-yellow-500 rounded-2xl max-w-sm w-full p-8 text-center">
        <div className="text-8xl mb-4">{achievement.icon}</div>
        <p className="text-sm uppercase tracking-widest text-yellow-500 mb-2">Achievement Unlocked!</p>
        <h3 className="text-2xl font-black uppercase italic text-white mb-2">{achievement.title}</h3>
        <p className="text-slate-400 mb-4">{achievement.desc}</p>
        <p className="text-xl text-yellow-400 font-bold mb-6">+{achievement.xpReward} XP</p>
        <button onClick={onClose} className="w-full py-3 bg-yellow-500 text-slate-900 font-black uppercase rounded-xl">Awesome!</button>
      </div>
    </div>
  );
}

// ============== ACTIVITY CARD ==============
function ActivityCard({ path, selectedOption, onSelect, completedActivities, pendingActivities }) {
  const IconComponent = IconMap[path.icon];

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-3 p-4 rounded-t-xl ${path.color}`}>
        <IconComponent className="w-6 h-6" />
        <div>
          <h2 className="font-black uppercase italic leading-none">{path.title}</h2>
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
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black uppercase text-slate-400 group-hover:text-yellow-500">{opt.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-500 font-bold">+{opt.xp} XP</span>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {isPending && <Clock className="w-5 h-5 text-blue-400" />}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{opt.title}</h3>
              <p className="text-sm text-slate-400 leading-snug">{opt.desc}</p>
              {isPending && <p className="text-xs text-blue-400 mt-2">Waiting for teacher approval...</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============== INSTRUCTION MODAL ==============
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        {!showSubmitForm ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <PlayCircle className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic">{activity.title}</h3>
                <p className="text-yellow-500 text-sm font-bold uppercase tracking-widest">Active Objective</p>
              </div>
            </div>

            {isDailyMatch && !dailyCompleted && (
              <div className="bg-purple-600/30 border border-purple-500 p-3 rounded-lg mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
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
                {activity.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-300">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-yellow-500 flex items-center justify-center text-xs font-bold border border-slate-600">{idx + 1}</span>
                    <span className="text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-1 text-blue-400">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-sm text-blue-100">{activity.proTip}</p>
            </div>

            {isCompleted ? (
              <div className="text-center text-green-400 font-bold py-3">
                <CheckCircle2 className="w-6 h-6 inline mr-2" />
                Already completed!
              </div>
            ) : isPending ? (
              <div className="text-center text-blue-400 font-bold py-3">
                <Clock className="w-6 h-6 inline mr-2" />
                Waiting for teacher approval...
              </div>
            ) : (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-black uppercase italic rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" /> Submit My Work
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

// ============== MAIN APP ==============
export default function App() {
  const {
    gameState,
    submissions,
    getCurrentLevel,
    getNextLevelXp,
    getDailyQuest,
    submitActivity,
    submitBossChallenge,
    approveSubmission,
    rejectSubmission,
    clearReviewedSubmissions,
    validateTeacherPin,
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
  } = useGameState();

  const [selectedPath, setSelectedPath] = useState({ path1: null, path2: null, path3: null });
  const [activeInstruction, setActiveInstruction] = useState(null);
  const [activePath, setActivePath] = useState(null);
  const [showTrophyCase, setShowTrophyCase] = useState(false);
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [showTeacherPin, setShowTeacherPin] = useState(false);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);

  const dailyQuest = getDailyQuest();

  const pendingActivities = submissions.filter(s => s.status === 'pending' && !s.isBoss).map(s => s.activityId);
  const pendingBossIds = submissions.filter(s => s.status === 'pending' && s.isBoss).map(s => s.activityId);
  const myPendingCount = submissions.filter(s => s.status === 'pending').length;

  const handleSelect = (pathId, activity) => {
    setSelectedPath(prev => ({ ...prev, [pathId]: activity.id }));
    setActiveInstruction(activity);
    setActivePath(LEARNING_PATHS.find(p => p.id === pathId));
  };

  const handleSubmitActivity = (activity, pathId, submissionData) => {
    submitActivity(activity, pathId, submissionData);
  };

  const handleSubmitBoss = (boss, submissionData) => {
    submitBossChallenge(boss, submissionData);
  };

  const handleTeacherPinResult = (success) => {
    setShowTeacherPin(false);
    if (success) {
      setShowTeacherDashboard(true);
    }
  };

  // Check for current boss pending status
  const today = new Date();
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
  const currentBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
  const hasPendingBoss = pendingBossIds.includes(currentBoss.id);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20">
            <Gamepad2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase mb-2">
            Level Up: 5th Grade Mission
          </h1>
          <p className="text-slate-400 text-lg">Choose your path. Master the content. Own the game.</p>
        </div>

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
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold">Trophies</span>
            <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full">
              {gameState.unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </button>
          <button
            onClick={() => setShowTeacherPin(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-green-500 transition-colors ml-auto"
          >
            <Lock className="w-5 h-5 text-green-500" />
            <span className="font-bold">Teacher</span>
          </button>
        </div>

        <DailyQuestBanner quest={dailyQuest} completed={gameState.dailyQuestCompleted} />
        <GuildPanel currentGuild={gameState.guild} onJoinGuild={joinGuild} guildXp={gameState.guildXpContributed} />
        <BossChallenge
          completedBosses={gameState.completedBossChallenges}
          onSubmit={handleSubmitBoss}
          hasPendingSubmission={hasPendingBoss}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {LEARNING_PATHS.map((path) => (
            <ActivityCard
              key={path.id}
              path={path}
              selectedOption={selectedPath[path.id]}
              onSelect={handleSelect}
              completedActivities={gameState.completedActivities}
              pendingActivities={pendingActivities}
            />
          ))}
        </div>

        <div className="text-center pb-20">
          <button onClick={() => setShowInfo(!showInfo)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors">
            <Info className="w-4 h-4" />
            {showInfo ? 'Hide Pedagogical Connections' : 'Show Pedagogical Connections'}
          </button>

          {showInfo && (
            <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-left max-w-4xl mx-auto">
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

      {showTrophyCase && <TrophyCase achievements={gameState.unlockedAchievements} onClose={() => setShowTrophyCase(false)} />}
      {showAvatarBuilder && <AvatarBuilder gameState={gameState} onBuy={buyAvatarItem} onEquip={equipAvatarItem} onClose={() => setShowAvatarBuilder(false)} onSetName={setPlayerName} />}
      {showMySubmissions && <MySubmissions submissions={submissions} onClose={() => setShowMySubmissions(false)} />}
      {showTeacherPin && <TeacherPinModal onValidate={validateTeacherPin} onClose={handleTeacherPinResult} />}
      {showTeacherDashboard && <TeacherDashboard submissions={submissions} onApprove={approveSubmission} onReject={rejectSubmission} onClear={clearReviewedSubmissions} onClose={() => setShowTeacherDashboard(false)} />}
      {showMysteryReward && <MysteryBoxModal reward={showMysteryReward} onClose={() => setShowMysteryReward(null)} />}
      {showLevelUp && newLevel && <LevelUpModal level={newLevel} onClose={() => setShowLevelUp(false)} />}
      {showAchievement && <AchievementModal achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
    </div>
  );
}
