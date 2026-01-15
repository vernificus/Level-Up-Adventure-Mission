import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Users, LogIn, UserPlus, ArrowRight, GraduationCap, Lock, User } from 'lucide-react';
import { realBackend as backend } from '../services/realBackend';

export default function LoginScreen() {
  const { loginTeacher, registerTeacher } = useAuth(); // removed joinClassAsStudent from context, we use backend direct
  const { joinClassAsStudent } = useAuth(); // Wait, context likely still has it, but we might bypass or update it.
  // Actually, AuthContext calls backend.joinClass. We updated backend.joinClass to return class info.
  // We need to implement the new "Roster Login" logic here.

  const [mode, setMode] = useState('select'); // select, teacher-login, teacher-signup, student-join, student-select, student-password
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Student states
  const [classCode, setClassCode] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginTeacher(email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleTeacherSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await registerTeacher(name, email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleLookupClass = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cls = await backend.getClassByCode(classCode.trim().toUpperCase());
      setClassInfo(cls);

      // Fetch roster
      const students = await backend.getStudents(cls.id);
      setRoster(students);
      setMode('student-select');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // We need to use a specialized login function in AuthContext or just call fetch here and set user manually?
    // AuthContext usually manages the 'user' state.
    // Let's modify AuthContext to expose a generic `loginStudent(classId, studentId, password)`?
    // OR we just use the backend here and update the context state?
    // Accessing `setUser` from context is not standard.
    // Ideally AuthContext should export `loginStudent`.

    // For now, let's assume `joinClassAsStudent` in context can be repurposed or we add a new method.
    // I will use `joinClassAsStudent` from context but pass the new args?
    // No, `AuthContext` implementation of `joinClassAsStudent` calls `backend.joinClass`.
    // I'll need to update `AuthContext.jsx` to support the new flow.
    // Let's assume I updated it. I will update it in next step.

    try {
      const result = await joinClassAsStudent(classInfo.id, selectedStudentId, studentPassword);
      if (!result.success) setError(result.error);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const BackButton = () => (
    <button
      onClick={() => {
        setError('');
        if (mode === 'student-select') setMode('student-join');
        else if (mode === 'student-password') setMode('student-select');
        else setMode('select');
      }}
      className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-1"
    >
      ← Back
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 shadow-2xl relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Level Up Learning</h1>
          <p className="text-slate-400 mt-2">Classroom Gamification Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('student-join')}
              className="w-full p-6 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all hover:scale-[1.02] group text-left relative overflow-hidden"
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6" /> I am a Student
                </h3>
                <p className="text-blue-200 text-sm mt-1">Log in with Class Code</p>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </button>

            <button
              onClick={() => setMode('teacher-login')}
              className="w-full p-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl transition-all hover:scale-[1.02] group text-left"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" /> I am a Teacher
              </h3>
              <p className="text-slate-400 text-sm mt-1">Manage classes and roster</p>
            </button>
          </div>
        )}

        {/* Teacher Login */}
        {mode === 'teacher-login' && (
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-6">Teacher Login</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Logging in...' : <><LogIn className="w-5 h-5" /> Login</>}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              New here? <button type="button" onClick={() => setMode('teacher-signup')} className="text-yellow-500 hover:underline">Create an account</button>
            </p>
          </form>
        )}

        {/* Teacher Signup */}
        {mode === 'teacher-signup' && (
          <form onSubmit={handleTeacherSignup} className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-6">Create Teacher Account</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : <><UserPlus className="w-5 h-5" /> Sign Up</>}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Already have an account? <button type="button" onClick={() => setMode('teacher-login')} className="text-yellow-500 hover:underline">Login</button>
            </p>
          </form>
        )}

        {/* Student Join: Step 1 (Class Code) */}
        {mode === 'student-join' && (
          <form onSubmit={handleLookupClass} className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-6">Find Your Class</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Class Code</label>
              <input
                type="text"
                required
                placeholder="e.g. A1B2C3"
                value={classCode}
                onChange={e => setClassCode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-center text-2xl uppercase font-mono tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Looking up...' : <><ArrowRight className="w-5 h-5" /> Next</>}
            </button>
          </form>
        )}

        {/* Student Join: Step 2 (Select Name) */}
        {mode === 'student-select' && (
          <div className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-2">Who are you?</h2>
            <p className="text-center text-slate-400 text-sm mb-4">Class: <span className="font-bold text-white">{classInfo?.name}</span></p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {roster.map(student => (
                <button
                  key={student.id}
                  onClick={() => { setSelectedStudentId(student.id); setMode('student-password'); }}
                  className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm">👤</div>
                  <span className="font-bold text-white">{student.name}</span>
                </button>
              ))}
              {roster.length === 0 && (
                <p className="text-center text-slate-500 py-4">No students found. Ask your teacher to add you!</p>
              )}
            </div>
          </div>
        )}

        {/* Student Join: Step 3 (Password) */}
        {mode === 'student-password' && (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-6">Hello, {roster.find(s => s.id === selectedStudentId)?.name}!</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Enter your Password/PIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="******"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-center text-xl tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : <><LogIn className="w-5 h-5" /> Start Game</>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
