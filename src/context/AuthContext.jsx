import React, { createContext, useContext, useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from session storage on mount and refresh organization data from Firestore
  useEffect(() => {
    const syncUser = async () => {
      const savedUserStr = sessionStorage.getItem('lvlup_user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          setUser(parsed);

          // If the user is a teacher or admin, refresh their latest organization & role from Firestore
          if (parsed && parsed.id && parsed.role !== 'student') {
            backend.getTeacher(parsed.id).then(freshDoc => {
              if (freshDoc) {
                setUser(prev => {
                  if (!prev || prev.id !== parsed.id) return prev;
                  const updated = {
                    ...prev,
                    role: freshDoc.role || prev.role || 'teacher',
                    organizationId: freshDoc.organizationId || null,
                    organizationName: freshDoc.organizationName || ''
                  };
                  sessionStorage.setItem('lvlup_user', JSON.stringify(updated));
                  return updated;
                });
              }
            }).catch(err => {
              console.warn("Could not refresh teacher profile:", err);
            });
          }
        } catch (e) {
          console.error("Error reading saved user session:", e);
        }
      }
      setLoading(false);
    };

    syncUser();
  }, []);

  const loginTeacher = async (email, password) => {
    try {
      const teacher = await backend.loginTeacher(email, password);
      setUser(teacher);
      sessionStorage.setItem('lvlup_user', JSON.stringify(teacher));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const registerTeacher = async (name, email, password, organizationId = null, organizationName = '') => {
    try {
      const teacher = await backend.registerTeacher(name, email, password, organizationId, organizationName);
      setUser(teacher);
      sessionStorage.setItem('lvlup_user', JSON.stringify(teacher));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginStudent = async (classId, studentId, password) => {
    try {
      const student = await backend.loginStudent(classId, studentId, password);
      setUser(student);
      sessionStorage.setItem('lvlup_user', JSON.stringify(student));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signupStudent = async (classId, name, password) => {
    try {
      const newStudent = await backend.studentSelfSignup(classId, name, password);
      const studentUser = { ...newStudent, role: 'student' };
      setUser(studentUser);
      sessionStorage.setItem('lvlup_user', JSON.stringify(studentUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const joinClassAsStudent = async (classCode, username) => {
     // Legacy method, might not be used with Roster Mode, but keeping for backward compat if needed
     // or for "Join by Code" without roster if we enable that.
     // For now, let's just use it to wrapper backend logic if we had it.
     // But `backend.joinClass` logic was: find class, create student doc.
     // We moved to `createStudent` (teacher side) and `loginStudent` (student side).
     // The 'BookOpen' -> 'Student Join' flow in LoginScreen uses `loginStudent`.
     return { success: false, error: "Use Roster Login" };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('lvlup_user');
  };

  const value = {
    user,
    loading,
    loginTeacher,
    registerTeacher,
    loginStudent,
    signupStudent,
    joinClassAsStudent,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
