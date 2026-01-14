import React, { createContext, useContext, useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from session storage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('lvlup_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
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

  const registerTeacher = async (name, email, password) => {
    try {
      const teacher = await backend.registerTeacher(name, email, password);
      setUser(teacher);
      sessionStorage.setItem('lvlup_user', JSON.stringify(teacher));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const joinClassAsStudent = async (classCode, username) => {
    try {
      const student = await backend.joinClass(classCode, username);
      setUser(student);
      sessionStorage.setItem('lvlup_user', JSON.stringify(student));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
