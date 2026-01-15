import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { realBackend as backend } from '../services/realBackend';
import {
  Users, Plus, LogOut, BookOpen, ClipboardList, CheckCircle2,
  XCircle, Clock, ChevronRight, GraduationCap, Copy, Trash2, Edit, RefreshCw // <-- Add RefreshCw here
} from 'lucide-react';
import { FileViewer } from './FileViewer';

export default function TeacherPortal() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' or 'students'

  useEffect(() => {
    loadClasses();
  }, [user.id]);

  useEffect(() => {
    let unsubscribe;
    if (selectedClass) {
      setLoading(true);

      // Load Students
      backend.getStudents(selectedClass.id).then(data => {
        setStudents(data);
      });

      // Subscribe to Submissions (Real-time)
      unsubscribe = backend.subscribeToSubmissions(selectedClass.id, (data) => {
        setSubmissions(data);
        setLoading(false);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedClass]);

  const loadClasses = async () => {
    const data = await backend.getClasses(user.id);
    setClasses(data);
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

  const handleDeleteClass = async (classId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this class? This cannot be undone.')) {
      try {
        await backend.deleteClass(classId);
        if (selectedClass?.id === classId) setSelectedClass(null);
        loadClasses();
      } catch (error) {
        alert('Error deleting class: ' + error.message);
      }
    }
  };

  const handleReview = async (submissionId, status, feedback) => {
    await backend.reviewSubmission(submissionId, status, feedback);
    // No need to reload, subscription handles it
  };

 const handleRefresh = async () => {
  if (!selectedClass) {
    loadClasses();
    return;
  }
  setLoading(true);
  await loadClasses();
  const data = await backend.getStudents(selectedClass.id);
  setStudents(data);
  setLoading(false);
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
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`w-full p-4 rounded-xl text-left transition-all cursor-pointer relative group ${selectedClass?.id === cls.id ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <div className="font-bold text-lg pr-6">{cls.name}</div>
                  <div className="flex justify-between items-center mt-2 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {cls.studentCount || 0} Students</span>
                    <span className="font-mono bg-black/20 px-2 rounded text-xs">Code: {cls.code}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteClass(cls.id, e)}
                    className="absolute top-2 right-2 p-2 text-red-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
                <div className="bg-slate-800 p-6 rounded-2xl mb-6 border border-slate-700">
                  <div className="flex justify-between items-start">
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
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="Refresh data"
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white">{pending.length}</p>
                        <p className="text-slate-400 text-xs uppercase font-bold">Pending Reviews</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-3xl font-black text-white">{students.length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Students</p>
                    </div>
                    <div className="text-right border-l border-slate-600 pl-4">
                      <p className="text-3xl font-black text-white">{pending.length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Pending</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-700">
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'submissions' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Submissions
                  </button>
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'students' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Students
                  </button>
                </div>

                {activeTab === 'students' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-slate-500">No students yet.</div>
                    ) : (
                      students.map(student => (
                        <div key={student.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg`}>
                              {/* Avatar placeholder - ideally fetch actual avatar */}
                              👤
                            </div>
                            <div>
                              <p className="font-bold text-white">{student.name}</p>
                              <p className="text-xs text-slate-400">XP: {student.xp} • Lvl {Math.floor(student.xp/500)+1}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'submissions' && (
                  <>
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
