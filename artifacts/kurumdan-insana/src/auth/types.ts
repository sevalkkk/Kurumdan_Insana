import type { TranslationTone } from '../translation';

export type UserRole = 'kullanici' | 'yonetici' | 'user' | 'admin';
export type UserStatus = 'active' | 'banned';

export type TranslationStatus = 'taslak' | 'onay_bekliyor' | 'yayinda' | 'reddedildi';

/**
 * Firestore `users` koleksiyonu doküman şeması
 */
export interface User {
  uid: string;
  id: string; // uid ile aynı (geriye dönük uyumluluk)
  firebaseUid?: string; // Firebase Auth localId (Firestore users/{firebaseUid} doküman kimliği)
  displayName: string;
  name: string; // displayName ile aynı
  email: string;
  password?: string;
  passwordHash: string;
  role: UserRole; // Varsayılan: 'kullanici', Yönetici: 'yonetici'
  isActive: boolean; // Varsayılan: true
  status?: UserStatus; // isActive === true ? 'active' : 'banned'
  avatarUrl?: string | null;
  bio?: string | null;
  consentAccepted?: boolean;
  publishedCount?: number;
  dailyUsageDate?: string;
  dailyUsageCount?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface UserSession {
  uid: string;
  id: string;
  displayName: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  token?: string;
  loggedInAt: number;
  expiresAt?: number;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  consent: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'consent', string>>;

/**
 * Firestore `translations` koleksiyonu doküman şeması
 * Hem kişisel geçmiş/taslakları hem de topluluk onay kuyruğunu temsil eder.
 */
export interface TranslationHistoryItem {
  id: string;
  userId: string; // authorId ile eşdeğer (uid)
  authorId: string; // Kullanıcının uid değeri
  authorName: string; // Denormalize yazar adı
  isAnonymous: boolean;
  corporate: string; // Geriye dönük uyumluluk
  corporateText: string; // Orijinal kurumsal cümle
  normalizedText: string; // Arama için normalize edilmiş metin
  human: string; // Geriye dönük uyumluluk
  translatedText: string; // Çevrilen gerçek iç ses metni
  tone: TranslationTone; // 'samimi-kanka' | 'bikkin-calisan' | 'durust-yonetici'
  status: TranslationStatus; // 'taslak' | 'onay_bekliyor' | 'yayinda' | 'reddedildi'
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: number | null;
  likeCount: number;
  favoriteCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number | null;
}

/**
 * Firestore `favorites` koleksiyonu doküman şeması
 * Doküman ID: `${userId}_${translationId}`
 */
export interface FavoriteItem {
  id: string; // Composite Key: `${userId}_${translationId}`
  userId: string; // Giriş yapan kullanıcının uid değeri
  translationId: string;
  corporateText: string;
  translatedText: string;
  tone: TranslationTone;
  note?: string | null;
  createdAt: number;
}

/**
 * Firestore `likes` koleksiyonu doküman şeması
 * Doküman ID: `${userId}_${translationId}`
 */
export interface LikeItem {
  id: string; // Composite Key: `${userId}_${translationId}`
  userId: string; // Giriş yapan kullanıcının uid değeri
  translationId: string;
  createdAt: number;
}

/**
 * Firestore `moderation_logs` koleksiyonu doküman şeması
 */
export interface ModerationLogItem {
  id: string;
  translationId: string;
  adminId: string;
  previousStatus: TranslationStatus;
  newStatus: TranslationStatus;
  reason?: string | null;
  createdAt: number;
}

export function isAdminRole(role?: UserRole | string): boolean {
  return role === 'yonetici' || role === 'admin';
}
