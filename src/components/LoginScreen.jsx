import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Users, LogIn, UserPlus, ArrowRight, GraduationCap, Lock, User, UserCheck, Building2, ShieldCheck, Shield } from 'lucide-react';
import { realBackend as backend } from '../services/realBackend';
import LegalModal from './LegalModal';

export default function LoginScreen() {
  const { loginTeacher, registerTeacher, loginStudent, signupStudent } = useAuth();

  const [mode, setMode] = useState('select'); // select, teacher-login, teacher-signup, admin-login, student-join, student-select, student-password, student-signup
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('privacy');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Organization signup states
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOrgName, setSelectedOrgName] = useState('');

  // Student states
  const [classCode, setClassCode] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Student self-signup states
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Load organizations on mount
  useEffect(() => {
    (async () => {
      try {
        const orgs = await backend.getOrganizations();
        setOrganizations(orgs);
      } catch (err) {
        console.error("Could not fetch organizations for login screen:", err);
      }
    })();
  }, []);

  // Auto-fill class code from URL parameter (e.g. ?code=A1B2C3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      const code = codeParam.trim().toUpperCase();
      setClassCode(code);
      setMode('student-join');
      // Auto-lookup the class
      (async () => {
        setLoading(true);
        try {
          const cls = await backend.getClassByCode(code);
          if (cls?.archived) {
            throw new Error('This class has been archived by the teacher. Please contact your teacher for assistance.');
          }
          setClassInfo(cls);
          const students = await backend.getStudents(cls.id);
          setRoster(students);
          setMode('student-select');
        } catch (err) {
          setError(err.message);
        }
        setLoading(false);
      })();
    }
  }, []);

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
    const result = await registerTeacher(name, email, password, selectedOrgId, selectedOrgName);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleLookupClass = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cls = await backend.getClassByCode(classCode.trim().toUpperCase());
      if (cls?.archived) {
        throw new Error('This class has been archived by the teacher. Please contact your teacher for assistance.');
      }
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

    try {
      const result = await loginStudent(classInfo.id, selectedStudentId, studentPassword);
      if (!result.success) setError(result.error);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleStudentSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!signupName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!signupPassword.trim()) {
      setError('Please set a password.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await signupStudent(classInfo.id, signupName.trim(), signupPassword);
      if (!result.success) setError(result.error);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const BackButton = () => (
    <button
      type="button"
      onClick={() => {
        setError('');
        if (mode === 'student-select') setMode('student-join');
        else if (mode === 'student-password') setMode('student-select');
        else if (mode === 'student-signup') setMode('student-select');
        else setMode('select');
      }}
      className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-1"
      aria-label="Go back"
    >
      <span aria-hidden="true">←</span> Back
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 shadow-2xl relative">

        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full mb-4 shadow-lg" aria-hidden="true">
            <GraduationCap className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Level Up Learning</h1>
          <p className="text-slate-400 mt-2">Classroom Gamification Platform</p>
        </header>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-200 text-sm text-center" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        {mode === 'select' && (
          <nav className="space-y-4" aria-label="Login options">
            <button
              onClick={() => setMode('student-join')}
              className="w-full p-6 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all hover:scale-[1.02] group text-left relative overflow-hidden shadow-lg"
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6" aria-hidden="true" /> I am a Student
                </h3>
                <p className="text-blue-200 text-sm mt-1">Log in with Class Code</p>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </button>

            <button
              onClick={() => setMode('teacher-login')}
              className="w-full p-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl transition-all hover:scale-[1.02] group text-left shadow-lg"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" aria-hidden="true" /> I am a Teacher
              </h3>
              <p className="text-slate-400 text-sm mt-1">Manage classes, roster, and choice boards</p>
            </button>

            <button
              onClick={() => setMode('admin-login')}
              className="w-full p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-yellow-500/50 rounded-xl transition-all group text-left"
            >
              <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" /> Overall System Admin
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Manage organizations, teachers, and template deployment</p>
            </button>
          </nav>
        )}

        {/* Teacher / Admin Login */}
        {(mode === 'teacher-login' || mode === 'admin-login') && (
          <form onSubmit={handleTeacherLogin} className="space-y-4" aria-labelledby="teacher-login-heading">
            <BackButton />
            <div className="text-center mb-6">
              <h2 id="teacher-login-heading" className="text-xl font-bold text-white">
                {mode === 'admin-login' ? 'System Admin Login' : 'Teacher Login'}
              </h2>
              {mode === 'admin-login' && (
                <p className="text-xs text-yellow-400 mt-1">Sign in with administrator credentials</p>
              )}
            </div>

            <div>
              <label htmlFor="teacher-email" className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                id="teacher-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="teacher-password" className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                id="teacher-password"
                type="password"
                required
                autoComplete="current-password"
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
              {loading ? 'Logging in...' : <><LogIn className="w-5 h-5" aria-hidden="true" /> Login</>}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              New here? <button type="button" onClick={() => setMode('teacher-signup')} className="text-yellow-500 hover:underline">Create an account</button>
            </p>
          </form>
        )}

        {/* Teacher Signup */}
        {mode === 'teacher-signup' && (
          <form onSubmit={handleTeacherSignup} className="space-y-4" aria-labelledby="teacher-signup-heading">
            <BackButton />
            <h2 id="teacher-signup-heading" className="text-xl font-bold text-white text-center mb-6">Create Teacher Account</h2>

            <div>
              <label htmlFor="signup-name" className="block text-sm text-slate-400 mb-1">Full Name</label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="signup-org" className="block text-sm text-slate-400 mb-1">Organization (School / District)</label>
              <select
                id="signup-org"
                value={selectedOrgId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedOrgId(id);
                  const found = organizations.find(o => o.id === id);
                  setSelectedOrgName(found ? found.name : '');
                }}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="">No Organization / Independent</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                id="signup-password"
                type="password"
                required
                autoComplete="new-password"
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
              {loading ? 'Creating Account...' : <><UserPlus className="w-5 h-5" aria-hidden="true" /> Sign Up</>}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Already have an account? <button type="button" onClick={() => setMode('teacher-login')} className="text-yellow-500 hover:underline">Login</button>
            </p>
          </form>
        )}

        {/* Student Join: Step 1 (Class Code) */}
        {mode === 'student-join' && (
          <form onSubmit={handleLookupClass} className="space-y-4" aria-labelledby="student-join-heading">
            <BackButton />
            <h2 id="student-join-heading" className="text-xl font-bold text-white text-center mb-6">Find Your Class</h2>

            <div>
              <label htmlFor="class-code" className="block text-sm text-slate-400 mb-1">Class Code</label>
              <input
                id="class-code"
                type="text"
                required
                placeholder="e.g. A1B2C3"
                value={classCode}
                onChange={e => setClassCode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-center text-2xl uppercase font-mono tracking-widest"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Looking up...' : <><ArrowRight className="w-5 h-5" aria-hidden="true" /> Next</>}
            </button>
          </form>
        )}

        {/* Student Join: Step 2 (Select Name) */}
        {mode === 'student-select' && (
          <div className="space-y-4">
            <BackButton />
            <h2 className="text-xl font-bold text-white text-center mb-2">Who are you?</h2>
            <p className="text-center text-slate-400 text-sm mb-4">Class: <span className="font-bold text-white">{classInfo?.name}</span></p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar" role="list" aria-label="Student roster">
              {roster.map(student => (
                <button
                  key={student.id}
                  role="listitem"
                  onClick={() => { setSelectedStudentId(student.id); setMode('student-password'); }}
                  className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm" aria-hidden="true">👤</div>
                  <span className="font-bold text-white">{student.name}</span>
                </button>
              ))}
              {roster.length === 0 && (
                <p className="text-center text-slate-500 py-4" role="status">No students yet. Be the first to join!</p>
              )}
            </div>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <button
                onClick={() => { setError(''); setMode('student-signup'); }}
                className="w-full p-4 bg-green-600 hover:bg-green-500 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5 text-white" aria-hidden="true" />
                <span className="font-bold text-white">I'm New - Create My Account</span>
              </button>
            </div>
          </div>
        )}

        {/* Student Join: Step 3 (Password) */}
        {mode === 'student-password' && (
          <form onSubmit={handleStudentLogin} className="space-y-4" aria-labelledby="student-password-heading">
            <BackButton />
            <h2 id="student-password-heading" className="text-xl font-bold text-white text-center mb-6">Hello, {roster.find(s => s.id === selectedStudentId)?.name}!</h2>

            <div>
              <label htmlFor="student-pin" className="block text-sm text-slate-400 mb-1">Enter your Password/PIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="student-pin"
                  type="password"
                  required
                  autoFocus
                  placeholder="******"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-center text-xl tracking-widest"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : <><LogIn className="w-5 h-5" aria-hidden="true" /> Start Game</>}
            </button>
          </form>
        )}

        {/* Student Self-Signup */}
        {mode === 'student-signup' && (
          <form onSubmit={handleStudentSignup} className="space-y-4" aria-labelledby="student-signup-heading">
            <BackButton />
            <h2 id="student-signup-heading" className="text-xl font-bold text-white text-center mb-2">Create Your Account</h2>
            <p className="text-center text-slate-400 text-sm mb-4">Joining: <span className="font-bold text-white">{classInfo?.name}</span></p>

            <div>
              <label htmlFor="student-signup-name" className="block text-sm text-slate-400 mb-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="student-signup-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter your name"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="student-signup-password" className="block text-sm text-slate-400 mb-1">Create a Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="student-signup-password"
                  type="password"
                  required
                  placeholder="Choose a password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="student-signup-confirm" className="block text-sm text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="student-signup-confirm"
                  type="password"
                  required
                  placeholder="Type password again"
                  value={signupConfirmPassword}
                  onChange={e => setSignupConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : <><UserPlus className="w-5 h-5" aria-hidden="true" /> Join Class & Start Playing</>}
            </button>
          </form>
        )}

        {/* Legal & Compliance Footer */}
        <div className="mt-8 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => { setLegalTab('privacy'); setLegalModalOpen(true); }}
              className="hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Privacy Policy
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => { setLegalTab('terms'); setLegalModalOpen(true); }}
              className="hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Terms of Service
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => { setLegalTab('compliance'); setLegalModalOpen(true); }}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 inline-flex"
            >
              <Shield className="w-3 h-3 text-emerald-400" /> FERPA & COPPA Compliant
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Protected under Federal & State Student Privacy Laws. Zero ads & zero data selling.
          </p>
        </div>
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
