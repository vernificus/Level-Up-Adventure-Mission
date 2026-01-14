import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { realBackend as backend } from '../services/realBackend';
import {
  Users, Plus, LogOut, BookOpen, ClipboardList, CheckCircle2,
  XCircle, Clock, ChevronRight, GraduationCap, Copy
} from 'lucide-react';
import { FileViewer } from './FileViewer'; // Updated import

export default function TeacherPortal() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    loadClasses();
  }, [user.id]);

  useEffect(() => {
    if (selectedClass) {
      loadSubmissions(selectedClass.id);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const data = await backend.getClasses(user.id);
    setClasses(data);
  };

  const loadSubmissions = async (classId) => {
    setLoading(true);
    const data = await backend.getSubmissions(classId);
    setSubmissions(data);
    setLoading(false);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      await backend.createClass(user.id, newClassName);
      setNewClassName('');
      setCreatingClass(false);
      loadClasses();
    } catch (error) {
      console.error(error);
      alert('Failed to create class: ' + error.message + '\n\nMake sure Firestore is enabled and Security Rules allow writes.');
    }
  };

  const handleReview = async (submissionId, status, feedback) => {
    await backend.reviewSubmission(submissionId, status, feedback);
    loadSubmissions(selectedClass.id); // Refresh
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Class code copied!');
  };

  // Filter submissions
  const pending = submissions.filter(s => s.status === 'pending');
  const reviewed = submissions.filter(s => s.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic">Teacher Portal</h1>
              <p className="text-slate-400">Welcome, {user.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar: Class List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Your Classes</h2>
              <button
                onClick={() => setCreatingClass(true)}
                className="text-green-400 hover:text-green-300"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {creatingClass && (
              <form onSubmit={handleCreateClass} className="mb-4 bg-slate-800 p-3 rounded-lg border border-slate-600">
                <input
                  autoFocus
                  type="text"
                  placeholder="Class Name"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 rounded text-sm text-white mb-2"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-xs font-bold py-1 rounded">Create</button>
                  <button type="button" onClick={() => setCreatingClass(false)} className="flex-1 bg-slate-600 text-xs font-bold py-1 rounded">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${selectedClass?.id === cls.id ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <div className="font-bold text-lg">{cls.name}</div>
                  <div className="flex justify-between items-center mt-2 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {cls.studentCount || 0} Students</span>
                    <span className="font-mono bg-black/20 px-2 rounded text-xs">Code: {cls.code}</span>
                  </div>
                </button>
              ))}
              {classes.length === 0 && !creatingClass && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  No classes yet.<br/>Click + to create one.
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedClass ? (
              <div>
                <div className="bg-slate-800 p-6 rounded-2xl mb-8 border border-slate-700 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedClass.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-400 text-sm">Class Code:</span>
                      <code className="text-xl font-mono font-bold text-green-400 tracking-widest">{selectedClass.code}</code>
                      <button onClick={() => copyCode(selectedClass.code)} className="text-slate-500 hover:text-white">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-white">{pending.length}</p>
                    <p className="text-slate-400 text-xs uppercase font-bold">Pending Reviews</p>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12 text-slate-500">Loading submissions...</div>
                ) : (
                  <>
                    <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Reviews ({pending.length})
                    </h3>

                    {pending.length === 0 ? (
                      <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500 mb-8">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        No pending submissions. You're all caught up!
                      </div>
                    ) : (
                      <div className="space-y-4 mb-8">
                        {pending.map(sub => (
                          <SubmissionCard key={sub.id} submission={sub} onReview={handleReview} />
                        ))}
                      </div>
                    )}

                    {reviewed.length > 0 && (
                      <>
                        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2 border-t border-slate-700 pt-8">
                          <CheckCircle2 className="w-4 h-4" /> Reviewed History
                        </h3>
                        <div className="opacity-60 hover:opacity-100 transition-opacity space-y-4">
                          {reviewed.slice(0, 5).map(sub => (
                             <div key={sub.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                               <div>
                                 <p className="font-bold text-white">{sub.playerName}</p>
                                 <p className="text-sm text-slate-400">{sub.activityTitle}</p>
                               </div>
                               <div className={`px-3 py-1 rounded-full text-xs font-bold ${sub.status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                 {sub.status.toUpperCase()}
                               </div>
                             </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl min-h-[400px]">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a class to view dashboard</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ submission, onReview }) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-lg text-white">{submission.activityTitle}</h4>
          <p className="text-blue-400 font-bold">{submission.playerName}</p>
        </div>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
          {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-slate-800">
        <p className="text-xs text-slate-500 uppercase font-bold mb-2">Submission Content:</p>
        {submission.submissionType === 'link' ? (
          <a href={submission.submissionContent} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all block p-2 bg-slate-800 rounded">
            {submission.submissionContent}
          </a>
        ) : (
          <div className="p-2 bg-slate-800 rounded">
            {submission.submissionContent ? (
               <div className="text-blue-400 flex items-center gap-2">
                 <FileViewer content={submission.submissionContent} fileName={submission.fileName} fileType={submission.fileType} />
               </div>
            ) : (
              <span className="text-slate-500 italic">No content?</span>
            )}
          </div>
        )}

        {submission.submissionNote && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Student Note:</p>
            <p className="text-slate-300 text-sm italic">"{submission.submissionNote}"</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Feedback</label>
          <input
            type="text"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Nice work!"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => onReview(submission.id, 'rejected', feedback)}
          className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          Reject
        </button>
        <button
          onClick={() => onReview(submission.id, 'approved', feedback)}
          className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          Approve (+{submission.xp} XP)
        </button>
      </div>
    </div>
  );
}
