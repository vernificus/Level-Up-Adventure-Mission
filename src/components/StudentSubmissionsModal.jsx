import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Clock, XCircle, FileText, ExternalLink,
  MessageSquare, Sparkles, Filter, Search, ArrowUpDown,
  Printer, ChevronLeft, ChevronRight, Award, Trophy,
  AlertCircle, Check, RotateCcw, Calendar, User, BookOpen,
  Zap, AlertTriangle, Video
} from 'lucide-react';
import { LEVELS } from '../data/gameData';
import { FileViewer } from './FileViewer';
import { realBackend as backend } from '../services/realBackend';
import ActivityDirectionsCard from './ActivityDirectionsCard';

export default function StudentSubmissionsModal({
  student,
  classId,
  className = '',
  submissions = [],
  onReview,
  onClose,
  allStudents = [],
  onSelectStudent,
  classActivities = [],
  activeBoss = null
}) {
  const [currentStudent, setCurrentStudent] = useState(student);
  const [localSubmissions, setLocalSubmissions] = useState([]);
  const [loadedClassActivities, setLoadedClassActivities] = useState(classActivities || []);
  const [loadedActiveBoss, setLoadedActiveBoss] = useState(activeBoss || null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'text', 'link', 'file', 'boss'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'xp_high'
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [submittingAction, setSubmittingAction] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    setCurrentStudent(student);
  }, [student]);

  // Load activities and active boss if not provided via props
  useEffect(() => {
    if (classActivities && classActivities.length > 0) {
      setLoadedClassActivities(classActivities);
    } else if (classId) {
      backend.getClassActivities(classId).then(acts => {
        if (acts && acts.length > 0) setLoadedClassActivities(acts);
      }).catch(() => {});
    }
  }, [classActivities, classId]);

  useEffect(() => {
    if (activeBoss) {
      setLoadedActiveBoss(activeBoss);
    } else if (classId) {
      backend.getActiveBoss(classId).then(boss => {
        if (boss) setLoadedActiveBoss(boss);
      }).catch(() => {});
    }
  }, [activeBoss, classId]);

  // Load student submissions
  useEffect(() => {
    if (!student) return;

    let isMounted = true;
    setLoading(true);

    const loadSubmissions = async () => {
      try {
        // Filter from passed submissions first if available
        let matching = (submissions || []).filter(s =>
          s.studentId === student.id ||
          (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())
        );

        // Fetch directly from backend to ensure complete historical records
        const backendSubs = await backend.getStudentSubmissions(student.id);
        
        // Merge without duplicates by ID
        const mergedMap = new Map();
        [...matching, ...backendSubs].forEach(sub => {
          if (sub && sub.id) {
            mergedMap.set(sub.id, sub);
          }
        });

        const merged = Array.from(mergedMap.values());
        if (isMounted) {
          setLocalSubmissions(merged);
        }
      } catch (err) {
        console.error('Error loading student submissions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [student, submissions]);

  if (!currentStudent) return null;

  // Calculate Student Level
  const studentLevel = LEVELS.reduce(
    (acc, l) => (currentStudent.xp || 0) >= l.xpRequired ? l : acc,
    LEVELS[0]
  );

  // Student metrics
  const totalCount = localSubmissions.length;
  const pendingSubs = localSubmissions.filter(s => s.status === 'pending');
  const approvedSubs = localSubmissions.filter(s => s.status === 'approved');
  const rejectedSubs = localSubmissions.filter(s => s.status === 'rejected');
  const totalEarnedXp = approvedSubs.reduce((acc, s) => acc + (parseInt(s.xp) || 0), 0);
  const approvalRate = totalCount > 0 ? Math.round((approvedSubs.length / totalCount) * 100) : 0;

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    return localSubmissions
      .filter(s => {
        // Status filter
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;

        // Type filter
        if (typeFilter === 'boss') {
          if (!s.isBoss && s.pathId !== 'boss' && s.activityType !== 'Boss Challenge') return false;
        } else if (typeFilter !== 'all') {
          if (s.submissionType !== typeFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (s.activityTitle || '').toLowerCase();
          const note = (s.submissionNote || '').toLowerCase();
          const textContent = typeof s.submissionContent === 'string' ? s.submissionContent.toLowerCase() : '';
          const teacherFb = (s.teacherFeedback || '').toLowerCase();
          const type = (s.activityType || '').toLowerCase();
          return title.includes(q) || note.includes(q) || textContent.includes(q) || teacherFb.includes(q) || type.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
        }
        if (sortBy === 'xp_high') {
          return (parseInt(b.xp) || 0) - (parseInt(a.xp) || 0);
        }
        return 0;
      });
  }, [localSubmissions, statusFilter, typeFilter, searchQuery, sortBy]);

  // Handle Review or Decision Change
  const handleReviewSubmission = async (submissionId, newStatus) => {
    const feedback = feedbackInputs[submissionId] !== undefined
      ? feedbackInputs[submissionId]
      : (localSubmissions.find(s => s.id === submissionId)?.teacherFeedback || '');

    setSubmittingAction(prev => ({ ...prev, [submissionId]: true }));
    try {
      if (onReview) {
        await onReview(submissionId, newStatus, feedback);
      } else {
        await backend.reviewSubmission(submissionId, newStatus, feedback);
      }

      // Update local state immediately
      setLocalSubmissions(prev =>
        prev.map(s => s.id === submissionId ? {
          ...s,
          status: newStatus,
          teacherFeedback: feedback,
          reviewedAt: new Date().toISOString()
        } : s)
      );

      // Refresh student metrics so header shows newly awarded XP and level
      try {
        const refreshed = await backend.getStudent(currentStudent.id);
        if (refreshed) {
          setCurrentStudent(refreshed);
          if (onSelectStudent) onSelectStudent(refreshed);
        }
      } catch (e) {
        console.warn('Could not refresh student metrics in modal:', e);
      }

      setActionNotice(`Submission marked as ${newStatus}!`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      alert('Error updating submission: ' + err.message);
    } finally {
      setSubmittingAction(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  // Auto-sync approved submissions XP to student profile
  const handleSyncModalStudent = async () => {
    setSubmittingAction(prev => ({ ...prev, sync: true }));
    try {
      const res = await backend.syncStudentSubmissions(currentStudent.id);
      const refreshed = await backend.getStudent(currentStudent.id);
      if (refreshed) {
        setCurrentStudent(refreshed);
        if (onSelectStudent) onSelectStudent(refreshed);
      }
      setActionNotice(`Successfully tallied ${currentStudent.name}'s XP to ${res.newXp} XP!`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert('Error tallying student XP: ' + err.message);
    } finally {
      setSubmittingAction(prev => ({ ...prev, sync: false }));
    }
  };

  // Student Switcher navigation
  const currentIndex = allStudents.findIndex(s => s.id === student.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allStudents.length - 1;

  const handlePrevStudent = () => {
    if (hasPrev && onSelectStudent) {
      onSelectStudent(allStudents[currentIndex - 1]);
    }
  };

  const handleNextStudent = () => {
    if (hasNext && onSelectStudent) {
      onSelectStudent(allStudents[currentIndex + 1]);
    }
  };

  // Print summary report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-submissions-title"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-5xl w-full p-4 sm:p-5 shadow-2xl my-auto max-h-[94vh] flex flex-col text-slate-900 overflow-hidden print:max-h-none print:m-0 print:border-none print:shadow-none print:bg-white print:text-black">

        {/* ── HEADER (No Avatar, Maximum Space for History) ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 print:border-b-2 print:border-black flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="student-submissions-title" className="text-xl sm:text-2xl font-display font-bold text-slate-900 flex items-center gap-2 print:text-black leading-tight">
                {currentStudent.name}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 ${studentLevel.color} print:text-black print:border-gray-400`}>
                Lvl {studentLevel.level} - {studentLevel.title}
              </span>
              <span className="text-xs text-slate-600 hidden sm:inline print:inline">
                &bull; {currentStudent.xp || 0} XP &bull; {currentStudent.coins || 0} Coins &bull; {(currentStudent.completedActivities || []).length} Activities Done
              </span>
              {className && (
                <span className="text-xs text-green-800 font-medium hidden md:inline">
                  &bull; {className}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 sm:hidden print:hidden leading-tight mt-0.5">
              {currentStudent.xp || 0} XP &bull; {currentStudent.coins || 0} Coins &bull; {(currentStudent.completedActivities || []).length} Done {className ? `• ${className}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            {/* Student Switcher dropdown & controls */}
            {allStudents.length > 1 && onSelectStudent && (
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={!hasPrev}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 transition-colors"
                  title="Previous student"
                  aria-label="Previous student"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={student.id}
                  onChange={(e) => {
                    const next = allStudents.find(s => s.id === e.target.value);
                    if (next) onSelectStudent(next);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none px-1 py-0.5 max-w-[120px] sm:max-w-[160px] truncate cursor-pointer"
                  aria-label="Select student"
                >
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-50 text-slate-900">
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={!hasNext}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 transition-colors"
                  title="Next student"
                  aria-label="Next student"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Print student work portfolio"
            >
              <Printer className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── UNSYNCED XP BANNER: Detects when approved submissions haven't tallied to student balance ── */}
        {totalEarnedXp > (currentStudent.xp || 0) && (
          <div className="my-2 p-3 bg-amber-50 border border-amber-500/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800 print:hidden flex-shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                Approved submissions tally to <strong>{totalEarnedXp} XP</strong>, but <strong>{currentStudent.name}</strong> currently only has <strong>{currentStudent.xp || 0} XP</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncModalStudent}
              disabled={submittingAction.sync}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              <span>{submittingAction.sync ? 'Tallying...' : `Sync to ${totalEarnedXp} XP (+${totalEarnedXp - (currentStudent.xp || 0)} XP)`}</span>
            </button>
          </div>
        )}

        {/* ── ACTION NOTICE BANNER ── */}
        {actionNotice && (
          <div className="my-1.5 px-3 py-1 bg-emerald-50 border border-emerald-600/40 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 animate-fadeIn print:hidden flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ── PRINT-ONLY STATS ── */}
        <div className="hidden print:flex items-center gap-4 text-xs font-semibold py-1.5 border-b border-black mb-2">
          <span>Total: <strong>{totalCount}</strong> ({approvalRate}% Approved)</span>
          <span>Approved: <strong>{approvedSubs.length}</strong> (+{totalEarnedXp} XP)</span>
          <span>Pending: <strong>{pendingSubs.length}</strong></span>
          <span>Needs Revision: <strong>{rejectedSubs.length}</strong></span>
        </div>

        {/* ── UNIFIED FILTER TABS & SEARCH CONTROLS (Single sleek toolbar) ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 my-2 print:hidden flex-shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 bg-slate-50 rounded-full text-[10px] text-slate-700 font-bold border border-slate-200">
                {totalCount}
              </span>
              <span className="text-[10px] text-slate-600 font-normal hidden sm:inline">({approvalRate}%)</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-emerald-800 hover:text-emerald-800'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approved</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              }`}>
                {approvedSubs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-amber-800 hover:text-amber-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}>
                {pendingSubs.length}
              </span>
              {pendingSubs.length > 0 && statusFilter !== 'pending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-rose-700 hover:text-rose-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Needs Revision</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-700 border border-rose-300'
              }`}>
                {rejectedSubs.length}
              </span>
            </button>
          </div>

          {/* Search, Formats & Sort Controls */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end min-w-[240px]">
            <div className="relative flex-1 min-w-[130px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search responses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs placeholder:text-slate-600 focus:border-green-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold focus:border-green-500 focus:outline-none"
              aria-label="Filter by type"
            >
              <option value="all">📁 All Formats</option>
              <option value="text">✍️ Written</option>
              <option value="link">🔗 Links</option>
              <option value="file">📎 Files</option>
              <option value="video">🎥 Video</option>
              <option value="boss">⚔️ Boss</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold focus:border-green-500 focus:outline-none"
              aria-label="Sort submissions"
            >
              <option value="newest">🕒 Newest</option>
              <option value="oldest">⌛ Oldest</option>
              <option value="xp_high">⭐ Highest XP</option>
            </select>
          </div>
        </div>

        {/* ── SUBMISSIONS LIST ── */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 print:overflow-visible">
          {loading ? (
            <div className="text-center py-16 text-slate-600 flex flex-col items-center justify-center gap-2">
              <Clock className="w-8 h-8 animate-spin opacity-40" />
              <p className="text-sm">Loading {student.name}'s submission history...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {totalCount === 0
                  ? `No Submissions Recorded Yet for ${student.name}`
                  : 'No Submissions Match Your Filters'}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {totalCount === 0
                  ? `When ${student.name} completes choice board activities or boss challenges, their written responses, links, and uploaded files will be cataloged here.`
                  : 'Try selecting a different status filter or clearing your search term.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs text-green-800 hover:underline font-bold"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            filteredSubmissions.map(sub => {
              const isSubmitting = submittingAction[sub.id] || false;
              const feedbackVal = feedbackInputs[sub.id] !== undefined
                ? feedbackInputs[sub.id]
                : (sub.teacherFeedback || '');

              const isBoss = sub.isBoss || sub.pathId === 'boss' || sub.activityType === 'Boss Challenge';

              return (
                <article
                  key={sub.id}
                  className={`bg-white border rounded-2xl p-5 shadow-lg transition-all ${
                    sub.status === 'pending'
                      ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-br from-white to-amber-50'
                      : sub.status === 'approved'
                      ? 'border-emerald-500/30 hover:border-emerald-500/50'
                      : 'border-rose-500/30 hover:border-rose-500/50'
                  } print:border print:border-black print:bg-white print:p-4 print:mb-4`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isBoss && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Boss Challenge
                          </span>
                        )}
                        {sub.activityType && !isBoss && (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold">
                            {sub.activityType}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-500/30 rounded-md text-[11px] font-bold">
                          +{sub.xp || 0} XP
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 print:text-black leading-snug">
                        {sub.activityTitle || 'Untitled Activity'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-600 flex items-center gap-1 print:text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(sub.submittedAt || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                        sub.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : sub.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-rose-50 text-rose-700 border border-rose-300'
                      } print:border-black print:text-black`}>
                        {sub.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />}
                        {sub.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-800 animate-spin" />}
                        {sub.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                        {sub.status === 'approved' ? 'Approved' : sub.status === 'pending' ? 'Pending Review' : 'Needs Revision'}
                      </span>
                    </div>
                  </div>

                  {/* Activity Directions for Teacher Evaluation */}
                  <ActivityDirectionsCard
                    submission={sub}
                    classActivities={loadedClassActivities}
                    activeBoss={loadedActiveBoss}
                    defaultExpanded={sub.status === 'pending'}
                    className="print:border-gray-400 print:bg-white"
                  />

                  {/* Submission Content Body */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3 space-y-3 print:bg-gray-50 print:border-gray-300">
                    <div>
                      <p className="text-[11px] text-slate-600 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 print:text-slate-400">
                        {sub.submissionType === 'text' && <><MessageSquare className="w-3.5 h-3.5 text-purple-700" /> Written Response</>}
                        {sub.submissionType === 'link' && <><ExternalLink className="w-3.5 h-3.5 text-blue-700" /> Submitted Link</>}
                        {sub.submissionType === 'file' && <><FileText className="w-3.5 h-3.5 text-green-800" /> Attached File</>}
                        {sub.submissionType === 'video' && <><Video className="w-3.5 h-3.5 text-red-700" /> Video Recording</>}
                        {!['text', 'link', 'file', 'video'].includes(sub.submissionType) && <>Submission Work</>}
                      </p>

                      {sub.submissionType === 'link' ? (
                        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <a
                            href={sub.submissionContent}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-700 hover:underline break-all font-mono text-xs flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span>{sub.submissionContent}</span>
                          </a>
                          <a
                            href={sub.submissionContent}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0 print:hidden"
                          >
                            Open Link
                          </a>
                        </div>
                      ) : sub.submissionType === 'text' ? (
                        <div className="p-3.5 bg-slate-50 rounded-lg text-slate-800 text-sm leading-relaxed whitespace-pre-wrap border border-slate-200 font-sans print:text-black print:bg-white print:border-gray-300">
                          {sub.submissionContent || <span className="text-slate-600 italic">No text provided.</span>}
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          {sub.submissionContent ? (
                            <FileViewer
                              content={sub.submissionContent}
                              fileName={sub.fileName}
                              fileType={sub.fileType}
                              submissionId={sub.id}
                              isChunked={sub.isChunked}
                            />
                          ) : (
                            <span className="text-slate-600 italic text-xs">No file content attached</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Student Note */}
                    {sub.submissionNote && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] text-slate-600 uppercase font-bold tracking-wider block mb-1">
                          Student Note to Teacher:
                        </span>
                        <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          "{sub.submissionNote}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Teacher Feedback Display */}
                  {sub.teacherFeedback && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 print:bg-gray-100 print:border-gray-400">
                      <span className="text-[11px] text-blue-700 uppercase font-bold tracking-wider block">
                        Teacher Feedback:
                      </span>
                      <p className="text-blue-800 font-medium italic">
                        "{sub.teacherFeedback}"
                      </p>
                      {sub.reviewedAt && (
                        <p className="text-[10px] text-slate-600 pt-1">
                          Reviewed: {new Date(sub.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Inline Review & Decision Controls */}
                  <div className="pt-3 border-t border-slate-200 print:hidden space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={feedbackVal}
                          onChange={e => setFeedbackInputs({ ...feedbackInputs, [sub.id]: e.target.value })}
                          placeholder={sub.teacherFeedback ? 'Edit feedback...' : 'Add teacher feedback or comment (optional)...'}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-600 focus:border-green-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Needs Revision
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'approved')}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve (+{sub.xp || 0} XP)</span>
                            </button>
                          </>
                        ) : sub.status === 'approved' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'approved')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? 'Saving...' : 'Update Feedback'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Change to Needs Revision
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? 'Saving...' : 'Update Feedback'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'approved')}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Change to Approved (+{sub.xp || 0} XP)</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <span>
            Displaying <strong>{filteredSubmissions.length}</strong> of <strong>{totalCount}</strong> submissions from {student.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
