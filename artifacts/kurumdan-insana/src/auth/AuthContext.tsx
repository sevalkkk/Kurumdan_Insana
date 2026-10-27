import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserSession,
  SignUpInput,
  LoginInput,
  FieldErrors,
  TranslationHistoryItem,
} from './types';
import { authService } from './authService';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  signUp: (input: SignUpInput) => {
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: FieldErrors;
  };
  login: (input: LoginInput) => {
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: Partial<Record<'email' | 'password', string>>;
  };
  forgotPassword: (email: string) => {
    success: boolean;
    message: string;
    fieldErrors?: Partial<Record<'email', string>>;
  };
  logout: () => void;
  userHistory: TranslationHistoryItem[];
  saveTranslation: (corporate: string, human: string) => void;
  clearHistory: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => authService.getCurrentSession());
  const [userHistory, setUserHistory] = useState<TranslationHistoryItem[]>(() => {
    const current = authService.getCurrentSession();
    return current ? authService.getUserHistory(current.id) : [];
  });

  const syncAuth = useCallback(() => {
    const current = authService.getCurrentSession();
    setUser(current);
    if (current) {
      setUserHistory(authService.getUserHistory(current.id));
    } else {
      setUserHistory([]);
    }
  }, []);

  const syncHistory = useCallback(() => {
    const current = authService.getCurrentSession();
    if (current) {
      setUserHistory(authService.getUserHistory(current.id));
    } else {
      setUserHistory([]);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('auth_state_changed', syncAuth);
    window.addEventListener('storage', syncAuth);
    window.addEventListener('history_updated', syncHistory);

    return () => {
      window.removeEventListener('auth_state_changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('history_updated', syncHistory);
    };
  }, [syncAuth, syncHistory]);

  const signUp = (input: SignUpInput) => {
    const res = authService.signUp(input);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const login = (input: LoginInput) => {
    const res = authService.login(input);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const forgotPassword = (email: string) => {
    return authService.forgotPassword(email);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setUserHistory([]);
  };

  const saveTranslation = (corporate: string, human: string) => {
    if (user) {
      authService.addTranslationHistory(user.id, corporate, human);
      setUserHistory(authService.getUserHistory(user.id));
    }
  };

  const clearHistory = () => {
    if (user) {
      authService.clearUserHistory(user.id);
      setUserHistory([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        signUp,
        login,
        forgotPassword,
        logout,
        userHistory,
        saveTranslation,
        clearHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
