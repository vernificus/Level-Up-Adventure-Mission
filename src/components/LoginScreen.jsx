import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Users, LogIn, UserPlus, ArrowRight, GraduationCap } from 'lucide-react';

export default function LoginScreen() {
  const { loginTeacher, registerTeacher, joinClassAsStudent } = useAuth();
  const [mode, setMode] = useState('select'); // select, teacher-login, teacher-signup, student-join
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [username, setUsername] = useState('');

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

  const handleStudentJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await joinClassAsStudent(classCode.trim().toUpperCase(), username.trim());
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const BackButton = () => (
    <button
      onClick={() => { setMode('select'); setError(''); }}
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
                <p className="text-blue-200 text-sm mt-1">Join a class and start your mission</p>
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
              <p className="text-slate-400 text-sm mt-1">Manage classes and review work</p>
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

        {/* Student Join */}
        {mode === 'student-join' && (
          <form onSubmit={handleStudentJoin} className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-6">Join Class</h2>

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
              <p className="text-xs text-slate-500 mt-1 text-center">Ask your teacher for the code</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                required
                placeholder="First Name Last Initial"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-center text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Joining...' : <><ArrowRight className="w-5 h-5" /> Start Adventure</>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
