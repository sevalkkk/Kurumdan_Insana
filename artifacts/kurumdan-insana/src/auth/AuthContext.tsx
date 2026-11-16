import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserSession,
  SignUpInput,
  LoginInput,
  FieldErrors,
  TranslationHistoryItem,
  TranslationStatus,
  FavoriteItem,
} from './types';
import type { TranslationTone } from '../translation';
import { authService } from './authService';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  signUp: (input: SignUpInput) => Promise<{
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: FieldErrors;
  }>;
  login: (input: LoginInput) => Promise<{
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: Partial<Record<'email' | 'password', string>>;
  }>;
  forgotPassword: (email: string) => {
    success: boolean;
    message: string;
    fieldErrors?: Partial<Record<'email', string>>;
  };
  logout: () => void;
  userHistory: TranslationHistoryItem[];
  publishedTranslations: TranslationHistoryItem[];
  userFavorites: FavoriteItem[];
  saveTranslation: (
    corporate: string,
    human: string,
    tone?: TranslationTone,
    status?: TranslationStatus,
    isAnonymous?: boolean,
  ) => TranslationHistoryItem | null;
  updateTranslation: (
    translationId: string,
    payload: {
      corporateText: string;
      translatedText: string;
      tone: TranslationTone;
      isAnonymous: boolean;
      requestedStatus: 'taslak' | 'onay_bekliyor';
    },
  ) => { success: boolean; item?: TranslationHistoryItem; error?: string };
  deleteTranslation: (translationId: string) => { success: boolean; error?: string };
  toggleFavorite: (payload: {
    translationId: string;
    corporateText: string;
    translatedText: string;
    tone?: TranslationTone;
  }) => { favorited: boolean; item?: FavoriteItem };
  isFavorited: (translationId: string) => boolean;
  toggleLike: (translationId: string) => { liked: boolean; likeCount: number };
  isLiked: (translationId: string) => boolean;
  submitForApproval: (translationId: string) => { success: boolean; error?: string };
  clearHistory: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => authService.getCurrentSession());
  const [userHistory, setUserHistory] = useState<TranslationHistoryItem[]>(() => {
    const current = authService.getCurrentSession();
    const uid = current?.uid || current?.id;
    return uid ? authService.getUserHistory(uid) : [];
  });
  const [publishedTranslations, setPublishedTranslations] = useState<TranslationHistoryItem[]>(
    () => authService.getPublishedTranslations(),
  );
  const [userFavorites, setUserFavorites] = useState<FavoriteItem[]>(() => {
    const current = authService.getCurrentSession();
    const uid = current?.uid || current?.id;
    return uid ? authService.getUserFavorites(uid) : [];
  });
  const [, setLikesVersion] = useState(0);

  const syncAuth = useCallback(() => {
    const current = authService.getCurrentSession();
    setUser(current);
    setPublishedTranslations(authService.getPublishedTranslations());
    const uid = current?.uid || current?.id;
    if (uid) {
      setUserHistory(authService.getUserHistory(uid));
      setUserFavorites(authService.getUserFavorites(uid));
    } else {
      setUserHistory([]);
      setUserFavorites([]);
    }
  }, []);

  const syncHistory = useCallback(() => {
    setPublishedTranslations(authService.getPublishedTranslations());
    setLikesVersion((v) => v + 1);
    const current = authService.getCurrentSession();
    const uid = current?.uid || current?.id;
    if (uid) {
      setUserHistory(authService.getUserHistory(uid));
      setUserFavorites(authService.getUserFavorites(uid));
    } else {
      setUserHistory([]);
      setUserFavorites([]);
    }
  }, []);

  useEffect(() => {
    void authService.syncFromCloud();
    window.addEventListener('auth_state_changed', syncAuth);
    window.addEventListener('storage', syncAuth);
    window.addEventListener('history_updated', syncHistory);
    window.addEventListener('favorites_updated', syncHistory);

    return () => {
      window.removeEventListener('auth_state_changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('history_updated', syncHistory);
      window.removeEventListener('favorites_updated', syncHistory);
    };
  }, [syncAuth, syncHistory]);

  const signUp = async (input: SignUpInput) => {
    const res = await authService.signUp(input);
    if (res.success && res.user) {
      setUser(res.user);
      const uid = res.user.uid || res.user.id;
      setUserHistory(authService.getUserHistory(uid));
      setUserFavorites(authService.getUserFavorites(uid));
    }
    return res;
  };

  const login = async (input: LoginInput) => {
    const res = await authService.login(input);
    if (res.success && res.user) {
      setUser(res.user);
      const uid = res.user.uid || res.user.id;
      setUserHistory(authService.getUserHistory(uid));
      setUserFavorites(authService.getUserFavorites(uid));
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
    setUserFavorites([]);
  };

  const saveTranslation = (
    corporate: string,
    human: string,
    tone: TranslationTone = 'bikkin-calisan',
    status: TranslationStatus = 'taslak',
    isAnonymous = false,
  ): TranslationHistoryItem | null => {
    const uid = user?.uid || user?.id;
    if (uid) {
      const created = authService.addTranslationHistory(
        uid,
        corporate,
        human,
        tone,
        status,
        isAnonymous,
      );
      setUserHistory(authService.getUserHistory(uid));
      return created;
    }
    return null;
  };

  const updateTranslation = (
    translationId: string,
    payload: {
      corporateText: string;
      translatedText: string;
      tone: TranslationTone;
      isAnonymous: boolean;
      requestedStatus: 'taslak' | 'onay_bekliyor';
    },
  ) => {
    const uid = user?.uid || user?.id;
    if (!uid) return { success: false, error: 'Giriş yapmalısınız.' };
    const res = authService.updateTranslation(uid, translationId, payload);
    setUserHistory(authService.getUserHistory(uid));
    setPublishedTranslations(authService.getPublishedTranslations());
    return res;
  };

  const deleteTranslation = (translationId: string) => {
    const uid = user?.uid || user?.id;
    if (!uid) return { success: false, error: 'Giriş yapmalısınız.' };
    const res = authService.deleteTranslation(uid, translationId);
    setUserHistory(authService.getUserHistory(uid));
    setUserFavorites(authService.getUserFavorites(uid));
    setPublishedTranslations(authService.getPublishedTranslations());
    return res;
  };

  const toggleFavorite = (payload: {
    translationId: string;
    corporateText: string;
    translatedText: string;
    tone?: TranslationTone;
  }) => {
    const uid = user?.uid || user?.id;
    if (!uid) return { favorited: false };
    const res = authService.toggleFavorite(uid, payload);
    setUserFavorites(authService.getUserFavorites(uid));
    setUserHistory(authService.getUserHistory(uid));
    return res;
  };

  const isFavorited = (translationId: string): boolean => {
    const uid = user?.uid || user?.id;
    if (!uid || !translationId) return false;
    return authService.isFavorited(uid, translationId);
  };

  const toggleLike = (translationId: string) => {
    const uid = user?.uid || user?.id;
    if (!uid) return { liked: false, likeCount: 0 };
    const res = authService.toggleLike(uid, translationId);
    setPublishedTranslations(authService.getPublishedTranslations());
    setUserHistory(authService.getUserHistory(uid));
    setLikesVersion((v) => v + 1);
    return res;
  };

  const isLiked = (translationId: string): boolean => {
    const uid = user?.uid || user?.id;
    if (!uid || !translationId) return false;
    return authService.isLiked(uid, translationId);
  };

  const submitForApproval = (translationId: string) => {
    const uid = user?.uid || user?.id;
    if (!uid) return { success: false, error: 'Giriş yapmalısınız.' };
    const res = authService.updateTranslationStatus(translationId, 'onay_bekliyor', uid);
    setUserHistory(authService.getUserHistory(uid));
    return { success: res.success, error: res.error };
  };

  const clearHistory = () => {
    const uid = user?.uid || user?.id;
    if (uid) {
      authService.clearUserHistory(uid);
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
        publishedTranslations,
        userFavorites,
        saveTranslation,
        updateTranslation,
        deleteTranslation,
        toggleFavorite,
        isFavorited,
        toggleLike,
        isLiked,
        submitForApproval,
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
