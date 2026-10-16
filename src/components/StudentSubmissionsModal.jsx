import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Clock, XCircle, FileText, ExternalLink,
  MessageSquare, Sparkles, Filter, Search, ArrowUpDown,
  Printer, ChevronLeft, ChevronRight, Award, Trophy,
  AlertCircle, Check, RotateCcw, Calendar, User, BookOpen
} from 'lucide-react';
import { LEVELS } from '../data/gameData';
import Avatar3D from './Avatar3D';
import { FileViewer } from './FileViewer';
import { realBackend as backend } from '../services/realBackend';

export default function StudentSubmissionsModal({
  student,
  classId,
  className = '',
  submissions = [],
  onReview,
  onClose,
  allStudents = [],
  onSelectStudent
}) {
  const [localSubmissions, setLocalSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'text', 'link', 'file', 'boss'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'xp_high'
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [submittingAction, setSubmittingAction] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

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

  if (!student) return null;

  // Calculate Student Level
  const studentLevel = LEVELS.reduce(
    (acc, l) => (student.xp || 0) >= l.xpRequired ? l : acc,
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

      setActionNotice(`Submission marked as ${newStatus}!`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      alert('Error updating submission: ' + err.message);
    } finally {
      setSubmittingAction(prev => ({ ...prev, [submissionId]: false }));
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-submissions-title"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] flex flex-col text-slate-100 overflow-hidden print:max-h-none print:m-0 print:border-none print:shadow-none print:bg-white print:text-black">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800 print:border-b-2 print:border-black">
          <div className="flex items-center gap-4">
            <div className="rounded-xl overflow-hidden bg-slate-950 p-1 border border-slate-800 flex-shrink-0 shadow-inner">
              <Avatar3D
                avatar={student.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }}
                level={studentLevel.level}
                size="md"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-green-400 print:text-green-800">
                  Student Submission Portfolio
                </span>
                {className && (
                  <span className="text-xs text-slate-400 font-medium">
                    &bull; {className}
                  </span>
                )}
              </div>
              <h2 id="student-submissions-title" className="text-2xl font-black text-white flex items-center gap-2 print:text-black">
                {student.name}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-slate-800 border border-slate-700 ${studentLevel.color} print:text-black print:border-gray-400`}>
                  Lvl {studentLevel.level} - {studentLevel.title}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 print:text-gray-600">
                {student.xp || 0} Total XP &bull; {student.coins || 0} Coins &bull; {(student.completedActivities || []).length} Activities Done
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            {/* Student Switcher dropdown & controls */}
            {allStudents.length > 1 && onSelectStudent && (
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={!hasPrev}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  title="Previous student"
                  aria-label="Previous student"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={student.id}
                  onChange={(e) => {
                    const next = allStudents.find(s => s.id === e.target.value);
                    if (next) onSelectStudent(next);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none px-1 py-0.5 max-w-[130px] sm:max-w-[170px] truncate"
                  aria-label="Select student"
                >
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={!hasNext}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  title="Next student"
                  aria-label="Next student"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Print student work portfolio"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print / Export</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── STATS RIBBON ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" /> Total Submissions
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{totalCount}</span>
              <span className="text-xs text-slate-500 font-semibold">{approvalRate}% Approved</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Approved
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-300">{approvedSubs.length}</span>
              <span className="text-xs text-emerald-400 font-bold">+{totalEarnedXp} XP</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Review
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-300">{pendingSubs.length}</span>
              {pendingSubs.length > 0 ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Needs Attention
                </span>
              ) : (
                <span className="text-xs text-slate-500">All caught up</span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/80 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" /> Needs Revision
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-300">{rejectedSubs.length}</span>
              <span className="text-xs text-slate-500">Rejected</span>
            </div>
          </div>
        </div>

        {/* ── ACTION NOTICE BANNER ── */}
        {actionNotice && (
          <div className="mb-3 px-4 py-2 bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ── FILTERS & SEARCH BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3 h-3" />
              Pending ({pendingSubs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Check className="w-3 h-3" />
              Approved ({approvedSubs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white font-black shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Needs Revision ({rejectedSubs.length})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search submitted work..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-green-500 focus:outline-none"
              aria-label="Filter by type"
            >
              <option value="all">📁 All Formats</option>
              <option value="text">✍️ Written Responses</option>
              <option value="link">🔗 Links</option>
              <option value="file">📎 Files / Media</option>
              <option value="boss">⚔️ Boss Challenges</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-green-500 focus:outline-none"
              aria-label="Sort submissions"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">⌛ Oldest First</option>
              <option value="xp_high">⭐ Highest XP</option>
            </select>
          </div>
        </div>

        {/* ── SUBMISSIONS LIST ── */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 print:overflow-visible">
          {loading ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
              <Clock className="w-8 h-8 animate-spin opacity-40" />
              <p className="text-sm">Loading {student.name}'s submission history...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-bold text-white mb-1">
                {totalCount === 0
                  ? `No Submissions Recorded Yet for ${student.name}`
                  : 'No Submissions Match Your Filters'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {totalCount === 0
                  ? `When ${student.name} completes choice board activities or boss challenges, their written responses, links, and uploaded files will be cataloged here.`
                  : 'Try selecting a different status filter or clearing your search term.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs text-green-400 hover:underline font-bold"
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
                  className={`bg-slate-800/90 border rounded-2xl p-5 shadow-lg transition-all ${
                    sub.status === 'pending'
                      ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-br from-slate-800 to-amber-950/10'
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
                          <span className="px-2 py-0.5 bg-red-950/80 text-red-300 border border-red-700/50 rounded-md text-[10px] font-black uppercase tracking-wider">
                            Boss Challenge
                          </span>
                        )}
                        {sub.activityType && !isBoss && (
                          <span className="px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-700 rounded-md text-[10px] font-bold">
                            {sub.activityType}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-md text-[11px] font-bold">
                          +{sub.xp || 0} XP
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white print:text-black leading-snug">
                        {sub.activityTitle || 'Untitled Activity'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 print:text-gray-600">
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
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : sub.status === 'pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                      } print:border-black print:text-black`}>
                        {sub.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {sub.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                        {sub.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {sub.status === 'approved' ? 'Approved' : sub.status === 'pending' ? 'Pending Review' : 'Needs Revision'}
                      </span>
                    </div>
                  </div>

                  {/* Submission Content Body */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-3 space-y-3 print:bg-gray-50 print:border-gray-300">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 print:text-gray-700">
                        {sub.submissionType === 'text' && <><MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Written Response</>}
                        {sub.submissionType === 'link' && <><ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Submitted Link</>}
                        {sub.submissionType === 'file' && <><FileText className="w-3.5 h-3.5 text-green-400" /> Attached File</>}
                        {!['text', 'link', 'file'].includes(sub.submissionType) && <>Submission Work</>}
                      </p>

                      {sub.submissionType === 'link' ? (
                        <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                          <a
                            href={sub.submissionContent}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline break-all font-mono text-xs flex items-center gap-1.5"
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
                        <div className="p-3.5 bg-slate-900/90 rounded-lg text-slate-200 text-sm leading-relaxed whitespace-pre-wrap border border-slate-800 font-sans print:text-black print:bg-white print:border-gray-300">
                          {sub.submissionContent || <span className="text-slate-500 italic">No text provided.</span>}
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                          {sub.submissionContent ? (
                            <FileViewer
                              content={sub.submissionContent}
                              fileName={sub.fileName}
                              fileType={sub.fileType}
                            />
                          ) : (
                            <span className="text-slate-500 italic text-xs">No file content attached</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Student Note */}
                    {sub.submissionNote && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                          Student Note to Teacher:
                        </span>
                        <p className="text-xs text-slate-300 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                          "{sub.submissionNote}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Teacher Feedback Display */}
                  {sub.teacherFeedback && (
                    <div className="mb-3 p-3 bg-blue-950/40 border border-blue-900/40 rounded-xl text-xs space-y-1 print:bg-gray-100 print:border-gray-400">
                      <span className="text-[11px] text-blue-400 uppercase font-bold tracking-wider block">
                        Teacher Feedback:
                      </span>
                      <p className="text-blue-100 font-medium italic">
                        "{sub.teacherFeedback}"
                      </p>
                      {sub.reviewedAt && (
                        <p className="text-[10px] text-slate-500 pt-1">
                          Reviewed: {new Date(sub.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Inline Review & Decision Controls */}
                  <div className="pt-3 border-t border-slate-700/60 print:hidden space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={feedbackVal}
                          onChange={e => setFeedbackInputs({ ...feedbackInputs, [sub.id]: e.target.value })}
                          placeholder={sub.teacherFeedback ? 'Edit feedback...' : 'Add teacher feedback or comment (optional)...'}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
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
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? 'Saving...' : 'Update Feedback'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
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
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
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
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>
            Displaying <strong>{filteredSubmissions.length}</strong> of <strong>{totalCount}</strong> submissions from {student.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
