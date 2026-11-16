import type {
  User,
  UserSession,
  UserRole,
  UserStatus,
  SignUpInput,
  LoginInput,
  FieldErrors,
  TranslationHistoryItem,
  TranslationStatus,
  FavoriteItem,
  LikeItem,
  ModerationLogItem,
} from './types';
import { isAdminRole } from './types';
import type { TranslationTone } from '../translation';
import {
  DUPLICATE_EMAIL_MESSAGE,
  GENERIC_LOGIN_ERROR,
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  isValidEmail,
} from './registrationValidation';
import {
  cloudFirestoreClient,
  firebaseAuthClient,
  isFirebaseConfigured,
} from '../lib/firebase';

export const USERS_STORAGE_KEY = 'kurumdan_insana_users_v1';
export const SESSION_STORAGE_KEY = 'kurumdan_insana_session_v1';
export const HISTORY_STORAGE_KEY = 'kurumdan_insana_history_v1';
export const FAVORITES_STORAGE_KEY = 'kurumdan_insana_favorites_v1';
export const LIKES_STORAGE_KEY = 'kurumdan_insana_likes_v1';
export const MODERATION_LOGS_STORAGE_KEY = 'kurumdan_insana_moderation_logs_v1';
export const RESETS_STORAGE_KEY = 'kurumdan_insana_resets_v1';

const AUTH_SALT = 'kurumdan_insana_salt_2026_';
const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// In-memory fallback if localStorage is unavailable
const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memoryStore[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // fallback
  }
  memoryStore[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // fallback
  }
  delete memoryStore[key];
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Sync(raw: string): string {
  const ascii = unescape(encodeURIComponent(raw));
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 255) << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let blockIndex = 0; blockIndex < words.length; blockIndex += 16) {
    const w: number[] = [];
    for (let i = 0; i < 16; i++) {
      w[i] = words[blockIndex + i] | 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export function hashPassword(password: string): string {
  return sha256Sync(`${AUTH_SALT}${password}`);
}

function verifyPassword(inputPassword: string, user: User): boolean {
  const hashedInput = hashPassword(inputPassword);
  if (user.passwordHash && user.passwordHash === hashedInput) {
    return true;
  }
  if (user.password && (user.password === inputPassword || user.password === hashedInput)) {
    return true;
  }
  return false;
}

function normalizeCorporateForSearch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEFAULT_PUBLISHED_TRANSLATIONS: TranslationHistoryItem[] = [
  {
    id: 'tr_seed_pub_1',
    userId: 'usr_community_1',
    authorId: 'usr_community_1',
    authorName: 'Selin Aksoy',
    isAnonymous: false,
    corporate: 'Bir araya gelip hizalanalım, proaktif aksiyon alıp konuyu bir sonraki sprintte ele alalım.',
    corporateText: 'Bir araya gelip hizalanalım, proaktif aksiyon alıp konuyu bir sonraki sprintte ele alalım.',
    normalizedText: 'bir araya gelip hizalanalim proaktif aksiyon alip konuyu bir sonraki sprintte ele alalim',
    human: 'Kanka olay şu: Herkes başka bir şey anlamış, bir saat lak lak edip bir toplantı daha çıkaracağız.',
    translatedText: 'Kanka olay şu: Herkes başka bir şey anlamış, bir saat lak lak edip bir toplantı daha çıkaracağız.',
    tone: 'samimi-kanka',
    status: 'yayinda',
    rejectionReason: null,
    reviewedBy: 'usr_admin_master',
    reviewedAt: 1730200000000,
    likeCount: 24,
    favoriteCount: 8,
    createdAt: 1730190000000,
    updatedAt: 1730200000000,
    publishedAt: 1730200000000,
  },
  {
    id: 'tr_seed_pub_2',
    userId: 'usr_community_2',
    authorId: 'usr_community_2',
    authorName: 'Anonim Çalışan',
    isAnonymous: true,
    corporate: 'Takvimlerimize davet düşüyorum, sinerjimizi artırmak adına kısa bir sync rica ediyorum.',
    corporateText: 'Takvimlerimize davet düşüyorum, sinerjimizi artırmak adına kısa bir sync rica ediyorum.',
    normalizedText: 'takvimlerimize davet dusuyorum sinerjimizi artirmak adina kisa bir sync rica ediyorum',
    human: 'Günün en verimli saatini daha buharlaştırıyorum. Masada kamerası kapalı oturacağız.',
    translatedText: 'Günün en verimli saatini daha buharlaştırıyorum. Masada kamerası kapalı oturacağız.',
    tone: 'bikkin-calisan',
    status: 'yayinda',
    rejectionReason: null,
    reviewedBy: 'usr_admin_master',
    reviewedAt: 1730350000000,
    likeCount: 42,
    favoriteCount: 15,
    createdAt: 1730340000000,
    updatedAt: 1730350000000,
    publishedAt: 1730350000000,
  },
  {
    id: 'tr_seed_pub_3',
    userId: 'usr_community_3',
    authorId: 'usr_community_3',
    authorName: 'Mert Korkmaz',
    isAnonymous: false,
    corporate: 'Bütçe kısıtları nedeniyle kadro artışı yapamıyoruz ancak mevcut verimliliğimizi artırabiliriz.',
    corporateText: 'Bütçe kısıtları nedeniyle kadro artışı yapamıyoruz ancak mevcut verimliliğimizi artırabiliriz.',
    normalizedText: 'butce kisitlari nedeniyle kadro artisi yapamiyoruz ancak mevcut verimliligimizi artirabiliriz',
    human: 'Bütçeyi başka yere harcadık. Size zam veremem ama LinkedIn’de havalı bir unvan ve yeni sorumluluklar verebilirim.',
    translatedText: 'Bütçeyi başka yere harcadık. Size zam veremem ama LinkedIn’de havalı bir unvan ve yeni sorumluluklar verebilirim.',
    tone: 'durust-yonetici',
    status: 'yayinda',
    rejectionReason: null,
    reviewedBy: 'usr_admin_master',
    reviewedAt: 1730500000000,
    likeCount: 18,
    favoriteCount: 5,
    createdAt: 1730490000000,
    updatedAt: 1730500000000,
    publishedAt: 1730500000000,
  },
  {
    id: 'tr_seed_pending_1',
    userId: 'usr_community_4',
    authorId: 'usr_community_4',
    authorName: 'Emre Aydın',
    isAnonymous: false,
    corporate: 'Konuyu şimdilik park edelim, stakeholder feedbackleri doğrultusunda roadmapimizi optimize ederiz.',
    corporateText: 'Konuyu şimdilik park edelim, stakeholder feedbackleri doğrultusunda roadmapimizi optimize ederiz.',
    normalizedText: 'konuyu simdilik park edelim stakeholder feedbackleri dogrultusunda roadmapimizi optimize ederiz',
    human: 'Kanka bunu sessizce rafa kaldıralım, kimse hatırlamazsa sonsuza dek unutulur.',
    translatedText: 'Kanka bunu sessizce rafa kaldıralım, kimse hatırlamazsa sonsuza dek unutulur.',
    tone: 'samimi-kanka',
    status: 'onay_bekliyor',
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    likeCount: 0,
    favoriteCount: 0,
    createdAt: 1730100000000,
    updatedAt: 1730100000000,
    publishedAt: null,
  },
  {
    id: 'tr_seed_pending_2',
    userId: 'usr_community_5',
    authorId: 'usr_community_5',
    authorName: 'Anonim Çalışan',
    isAnonymous: true,
    corporate: 'Müşteri tarafındaki deadline nedeniyle bu konuyu ASAP çözmemiz gerekiyor, sahiplenme rica ediyorum.',
    corporateText: 'Müşteri tarafındaki deadline nedeniyle bu konuyu ASAP çözmemiz gerekiyor, sahiplenme rica ediyorum.',
    normalizedText: 'musteri tarafindaki deadline nedeniyle bu konuyu asap cozmemiz gerekiyor sahiplenme rica ediyorum',
    human: 'Planlama beceriksizliği son dakikada yine benim kişisel acil durumum hâline getirildi.',
    translatedText: 'Planlama beceriksizliği son dakikada yine benim kişisel acil durumum hâline getirildi.',
    tone: 'bikkin-calisan',
    status: 'onay_bekliyor',
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    likeCount: 0,
    favoriteCount: 0,
    createdAt: 1730150000000,
    updatedAt: 1730150000000,
    publishedAt: null,
  },
];

function normalizeUserDoc(u: Partial<User> & { id?: string; uid?: string; email: string; name?: string }): User {
  const uid = u.uid || u.id || `usr_${Date.now()}`;
  const displayName = u.displayName || u.name || u.email.split('@')[0];
  const isAdmin = isAdminRole(u.role);
  const role: UserRole = isAdmin ? 'yonetici' : 'kullanici';

  const isBanned = u.isActive === false || u.status === 'banned';
  const isActive = !isBanned;
  const status: UserStatus = isActive ? 'active' : 'banned';

  const passwordHash =
    u.passwordHash || (u.password ? hashPassword(u.password) : '');

  return {
    uid,
    id: uid,
    firebaseUid: u.firebaseUid || uid,
    displayName,
    name: displayName,
    email: u.email,
    passwordHash,
    role,
    isActive,
    status,
    avatarUrl: u.avatarUrl ?? null,
    bio: u.bio ?? null,
    consentAccepted: u.consentAccepted ?? true,
    publishedCount: u.publishedCount ?? 0,
    createdAt: u.createdAt || Date.now(),
    updatedAt: u.updatedAt || u.createdAt || Date.now(),
  };
}

export const DAILY_AI_LIMIT = 20;

export const authService = {
  isCloudConnected(): boolean {
    return isFirebaseConfigured();
  },

  async checkAndIncrementDailyAiQuota(uid: string): Promise<{
    allowed: boolean;
    remaining: number;
    count: number;
    limit: number;
    error?: string;
  }> {
    if (!uid) {
      return {
        allowed: false,
        remaining: 0,
        count: 0,
        limit: DAILY_AI_LIMIT,
        error: 'Yapay zekâ çeviri özelliğini kullanmak için lütfen giriş yapın.',
      };
    }

    if (!isFirebaseConfigured()) {
      return {
        allowed: false,
        remaining: 0,
        count: 0,
        limit: DAILY_AI_LIMIT,
        error: 'Sunucu veritabanı bağlantısı yapılandırılmamış.',
      };
    }

    const fbAuth = firebaseAuthClient.getStoredAuth();
    const session = this.getCurrentSession();
    const token = fbAuth?.idToken || session?.token;
    const targetUid = fbAuth?.localId || uid;
    const today = new Date().toISOString().slice(0, 10);

    const userDoc = await cloudFirestoreClient.getDoc<Record<string, unknown>>(
      'users',
      targetUid,
      token,
    );

    if (!userDoc) {
      return {
        allowed: false,
        remaining: 0,
        count: 0,
        limit: DAILY_AI_LIMIT,
        error: 'Kullanıcı profili Cloud Firestore üzerinde bulunamadı. Lütfen tekrar giriş yapın.',
      };
    }

    const currentDate = String(userDoc.dailyUsageDate || '');
    const currentCount = currentDate === today ? Number(userDoc.dailyUsageCount || 0) : 0;

    if (currentCount >= DAILY_AI_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        count: currentCount,
        limit: DAILY_AI_LIMIT,
        error: `Günlük yapay zekâ çeviri sınırınıza (${DAILY_AI_LIMIT}/${DAILY_AI_LIMIT}) ulaştınız. Yarın tekrar deneyebilirsiniz.`,
      };
    }

    const nextCount = currentCount + 1;
    const updated = await cloudFirestoreClient.setDoc(
      'users',
      targetUid,
      {
        ...userDoc,
        dailyUsageDate: today,
        dailyUsageCount: nextCount,
        updatedAt: Date.now(),
      },
      token,
    );

    if (!updated) {
      return {
        allowed: false,
        remaining: Math.max(0, DAILY_AI_LIMIT - currentCount),
        count: currentCount,
        limit: DAILY_AI_LIMIT,
        error: 'Günlük kullanım kotası güncellenemedi. Lütfen tekrar deneyin.',
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, DAILY_AI_LIMIT - nextCount),
      count: nextCount,
      limit: DAILY_AI_LIMIT,
    };
  },

  /**
   * Belirli bir uid değerine sahip kullanıcı bilgisini aktif oturumdan getirir
   */
  getUserByUid(uid: string): User | null {
    if (!uid) return null;
    const session = this.getCurrentSession();
    if (session && (session.uid === uid || session.id === uid)) {
      return {
        uid: session.uid,
        id: session.id,
        firebaseUid: session.uid,
        displayName: session.displayName,
        name: session.name,
        email: session.email,
        passwordHash: '',
        role: session.role,
        isActive: session.isActive,
        status: session.isActive ? 'active' : 'banned',
        createdAt: session.loggedInAt,
      };
    }
    return null;
  },

  getCurrentSession(): UserSession | null {
    const raw = safeGetItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && (parsed.uid || parsed.id) && parsed.email) {
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          safeRemoveItem(SESSION_STORAGE_KEY);
          return null;
        }
        const uid = parsed.uid || parsed.id;
        return {
          ...parsed,
          uid,
          id: uid,
          displayName: parsed.displayName || parsed.name,
          name: parsed.name || parsed.displayName,
          isActive: parsed.isActive ?? true,
        } as UserSession;
      }
    } catch {
      safeRemoveItem(SESSION_STORAGE_KEY);
    }
    return null;
  },

  setCurrentSession(session: UserSession | null): void {
    if (session) {
      safeSetItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      safeRemoveItem(SESSION_STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_state_changed'));
    }
  },

  async signUp(input: SignUpInput): Promise<{
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: FieldErrors;
  }> {
    const fieldErrors = validateRegistration(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    if (!isFirebaseConfigured()) {
      console.error('[AuthService] Firebase yapılandırılmamış (VITE_FIREBASE_* eksik).');
      return {
        success: false,
        error: 'Sunucu kimlik doğrulama bağlantısı yapılandırılmamış.',
      };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const now = Date.now();

    console.info('[AuthService] Firebase Auth ile kayıt başlatılıyor:', normalizedEmail);
    const fbRes = await firebaseAuthClient.signUpWithEmailPasswordResult(
      normalizedEmail,
      input.password,
    );

    if (!fbRes.ok) {
      if (fbRes.errorCode === 'EMAIL_EXISTS') {
        return {
          success: false,
          error: DUPLICATE_EMAIL_MESSAGE,
        };
      }
      return {
        success: false,
        error: `Kayıt işlemi tamamlanamadı (${fbRes.errorCode}). Lütfen bilgilerinizi kontrol edin.`,
      };
    }

    const firebaseUid = fbRes.data.localId;
    const sessionToken = fbRes.data.idToken;
    const displayName = input.name.trim();

    // Firestore `users/{uid}` dokümanını role: 'kullanici' ile oluştur
    const docToSync: Record<string, unknown> = {
      uid: firebaseUid,
      id: firebaseUid,
      displayName,
      name: displayName,
      email: normalizedEmail,
      role: 'kullanici',
      isActive: true,
      status: 'active',
      consentAccepted: Boolean(input.consent),
      publishedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await cloudFirestoreClient.setDoc(
      'users',
      firebaseUid,
      docToSync,
      sessionToken,
    );
    if (!saved) {
      console.error('[Firestore] users/{uid} profil dokümanı oluşturulamadı:', firebaseUid);
      return {
        success: false,
        error: 'Kullanıcı profili Cloud Firestore üzerinde oluşturulamadı. Lütfen tekrar deneyin.',
      };
    }
    console.info('[Firestore] users/{uid} profil dokümanı oluşturuldu:', firebaseUid);

    const session: UserSession = {
      uid: firebaseUid,
      id: firebaseUid,
      displayName,
      name: displayName,
      email: normalizedEmail,
      role: 'kullanici',
      isActive: true,
      token: sessionToken,
      loggedInAt: now,
      expiresAt: now + SESSION_EXPIRY_MS,
    };

    this.setCurrentSession(session);
    await this.syncFromCloud();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true, user: session };
  },

  async login(input: LoginInput): Promise<{
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: Partial<Record<'email' | 'password', string>>;
  }> {
    const fieldErrors = validateLogin(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    if (!isFirebaseConfigured()) {
      console.error('[AuthService] Firebase yapılandırılmamış (VITE_FIREBASE_* eksik).');
      return {
        success: false,
        error: 'Sunucu kimlik doğrulama bağlantısı yapılandırılmamış.',
      };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const now = Date.now();

    console.info('[AuthService] Firebase Auth ile giriş başlatılıyor:', normalizedEmail);
    const fbRes = await firebaseAuthClient.signInWithEmailPasswordResult(
      normalizedEmail,
      input.password,
    );

    if (!fbRes.ok) {
      return {
        success: false,
        error: GENERIC_LOGIN_ERROR,
      };
    }

    const fbAuth = fbRes.data;
    const existingProfile = await cloudFirestoreClient.getDoc<Record<string, unknown>>(
      'users',
      fbAuth.localId,
      fbAuth.idToken,
    );

    // Firestore `users/{uid}` belgesi yoksa giriş reddedilir
    if (!existingProfile) {
      console.error('[AuthService] Giriş reddedildi: Firestore users/{uid} belgesi bulunamadı:', fbAuth.localId);
      this.logout();
      return {
        success: false,
        error: 'Kullanıcı profili Cloud Firestore üzerinde bulunamadı. Lütfen yönetici ile iletişime geçin.',
      };
    }

    const isActive =
      existingProfile.isActive !== false && existingProfile.status !== 'banned';

    if (!isActive) {
      console.warn('[AuthService] Giriş reddedildi: Hesap askıya alınmış veya pasif:', fbAuth.localId);
      this.logout();
      return {
        success: false,
        error: 'Hesabınız askıya alınmıştır. Lütfen yönetici ile iletişime geçin.',
      };
    }

    const resolvedRole: UserRole = isAdminRole(
      existingProfile.role as UserRole | string | undefined,
    )
      ? 'yonetici'
      : 'kullanici';
    const resolvedName = String(
      existingProfile.displayName || existingProfile.name || normalizedEmail.split('@')[0],
    );

    const session: UserSession = {
      uid: fbAuth.localId,
      id: fbAuth.localId,
      displayName: resolvedName,
      name: resolvedName,
      email: normalizedEmail,
      role: resolvedRole,
      isActive: true,
      token: fbAuth.idToken,
      loggedInAt: now,
      expiresAt: now + SESSION_EXPIRY_MS,
    };

    this.setCurrentSession(session);
    await this.syncFromCloud();
    return { success: true, user: session };
  },

  forgotPassword(email: string): {
    success: boolean;
    message: string;
    fieldErrors?: Partial<Record<'email', string>>;
  } {
    const emailError = validateForgotPassword(email);
    if (emailError) {
      return {
        success: false,
        message: '',
        fieldErrors: { email: emailError },
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (isFirebaseConfigured()) {
      void firebaseAuthClient.sendPasswordResetEmail(normalizedEmail);
    }

    return {
      success: true,
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    };
  },

  logout(): void {
    firebaseAuthClient.setStoredAuth(null);
    this.setCurrentSession(null);
  },

  // ==========================================
  // ADMIN PANEL OPERATIONS (CLOUD FIRESTORE `users` KOLEKSİYONU)
  // ==========================================
  async adminFetchUsersFromFirestore(): Promise<{ success: boolean; users: User[]; error?: string }> {
    if (!isFirebaseConfigured()) {
      return { success: false, users: [], error: 'Firebase bağlantısı yapılandırılmamış.' };
    }
    const currentSession = this.getCurrentSession();
    const fbAuth = firebaseAuthClient.getStoredAuth();
    const token = fbAuth?.idToken || currentSession?.token;
    const cloudUsers = await cloudFirestoreClient.listDocs<User>('users', token);
    if (cloudUsers === null) {
      return {
        success: false,
        users: [],
        error: 'Cloud Firestore users koleksiyonu okunamadı. Yönetici yetkilerinizi kontrol edin.',
      };
    }
    const normalized = cloudUsers
      .filter((u) => Boolean(u && u.email))
      .map((u) => normalizeUserDoc(u))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { success: true, users: normalized };
  },

  async adminDeleteUser(targetUser: User): Promise<{ success: boolean; error?: string }> {
    const targetDocId = targetUser.firebaseUid || targetUser.uid || targetUser.id;
    if (!targetDocId) return { success: false, error: 'Kullanıcı kimliği eksik.' };

    const currentSession = this.getCurrentSession();
    if (currentSession && (currentSession.uid === targetDocId || currentSession.id === targetDocId)) {
      return { success: false, error: 'Kendi yönetici hesabınızı silemezsiniz.' };
    }

    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase bağlantısı yapılandırılmamış.' };
    }

    const fbAuth = firebaseAuthClient.getStoredAuth();
    const deleted = await cloudFirestoreClient.deleteDoc(
      'users',
      targetDocId,
      fbAuth?.idToken || currentSession?.token,
    );
    if (!deleted) {
      return { success: false, error: 'Kullanıcı Cloud Firestore üzerinden silinemedi.' };
    }

    this.clearUserHistory(targetDocId);
    this.clearUserFavorites(targetDocId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true };
  },

  async adminToggleBanUser(targetUser: User): Promise<{
    success: boolean;
    newStatus?: UserStatus;
    isActive?: boolean;
    error?: string;
  }> {
    const targetDocId = targetUser.firebaseUid || targetUser.uid || targetUser.id;
    if (!targetDocId) return { success: false, error: 'Kullanıcı kimliği eksik.' };

    const currentSession = this.getCurrentSession();
    if (currentSession && (currentSession.uid === targetDocId || currentSession.id === targetDocId)) {
      return { success: false, error: 'Kendi yönetici hesabınızı askıya alamazsınız.' };
    }

    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase bağlantısı yapılandırılmamış.' };
    }

    const currentlyBanned = targetUser.isActive === false || targetUser.status === 'banned';
    const nextIsActive = currentlyBanned;
    const newStatus: UserStatus = nextIsActive ? 'active' : 'banned';
    const now = Date.now();

    const fbAuth = firebaseAuthClient.getStoredAuth();
    const saved = await cloudFirestoreClient.setDoc(
      'users',
      targetDocId,
      {
        uid: targetDocId,
        id: targetDocId,
        displayName: targetUser.displayName || targetUser.name,
        name: targetUser.name || targetUser.displayName,
        email: targetUser.email,
        role: isAdminRole(targetUser.role) ? 'yonetici' : 'kullanici',
        isActive: nextIsActive,
        status: newStatus,
        createdAt: targetUser.createdAt || now,
        updatedAt: now,
      },
      fbAuth?.idToken || currentSession?.token,
    );

    if (!saved) {
      return { success: false, error: 'Kullanıcı durumu Cloud Firestore üzerinde güncellenemedi.' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true, newStatus, isActive: nextIsActive };
  },

  async adminUpdateUserRole(
    targetUser: User,
    nextRole: 'yonetici' | 'kullanici',
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> {
    const targetDocId = targetUser.firebaseUid || targetUser.uid || targetUser.id;
    if (!targetDocId) return { success: false, error: 'Kullanıcı kimliği eksik.' };

    const currentSession = this.getCurrentSession();
    if (currentSession && (currentSession.uid === targetDocId || currentSession.id === targetDocId)) {
      return { success: false, error: 'Kendi yönetici rolünüzü değiştiremezsiniz.' };
    }

    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase bağlantısı yapılandırılmamış.' };
    }

    const now = Date.now();
    const fbAuth = firebaseAuthClient.getStoredAuth();
    const saved = await cloudFirestoreClient.setDoc(
      'users',
      targetDocId,
      {
        uid: targetDocId,
        id: targetDocId,
        displayName: targetUser.displayName || targetUser.name,
        name: targetUser.name || targetUser.displayName,
        email: targetUser.email,
        role: nextRole,
        isActive: targetUser.isActive ?? true,
        status: targetUser.status ?? 'active',
        createdAt: targetUser.createdAt || now,
        updatedAt: now,
      },
      fbAuth?.idToken || currentSession?.token,
    );

    if (!saved) {
      return { success: false, error: 'Kullanıcı rolü Cloud Firestore üzerinde güncellenemedi.' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true, role: nextRole };
  },

  async adminCreateUser(input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!input.name || !input.name.trim()) {
      return { success: false, error: 'Ad soyad alanı zorunludur.' };
    }
    if (!input.email || !input.email.trim()) {
      return { success: false, error: 'E-posta alanı zorunludur.' };
    }
    if (!isValidEmail(input.email)) {
      return { success: false, error: 'Lütfen geçerli bir e-posta adresi girin.' };
    }
    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
    }
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase bağlantısı yapılandırılmamış.' };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const fbRes = await firebaseAuthClient.createUserWithoutSwitchingSession(
      normalizedEmail,
      input.password,
    );
    if (!fbRes.ok) {
      if (fbRes.errorCode === 'EMAIL_EXISTS') {
        return { success: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.' };
      }
      return { success: false, error: `Kullanıcı oluşturulamadı (${fbRes.errorCode}).` };
    }

    const now = Date.now();
    const uid = fbRes.data.localId;
    const normalizedRole: UserRole = isAdminRole(input.role) ? 'yonetici' : 'kullanici';

    const newUser: User = {
      uid,
      id: uid,
      firebaseUid: uid,
      displayName: input.name.trim(),
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: '',
      role: normalizedRole,
      isActive: true,
      status: 'active',
      avatarUrl: null,
      bio: null,
      consentAccepted: true,
      publishedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const currentSession = this.getCurrentSession();
    const fbAuth = firebaseAuthClient.getStoredAuth();
    const saved = await cloudFirestoreClient.setDoc(
      'users',
      uid,
      {
        uid,
        id: uid,
        displayName: newUser.displayName,
        name: newUser.name,
        email: newUser.email,
        role: normalizedRole,
        isActive: true,
        status: 'active',
        consentAccepted: true,
        publishedCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      fbAuth?.idToken || currentSession?.token,
    );

    if (!saved) {
      return { success: false, error: 'Kullanıcı profili Cloud Firestore üzerinde oluşturulamadı.' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true, user: newUser };
  },

  // ==========================================
  // TRANSLATIONS & PERSONAL HISTORY (Firestore `translations` koleksiyonu)
  // Giriş yapan kullanıcının `uid` değerine bağlı olarak saklanır.
  // ==========================================
  getAllTranslations(): TranslationHistoryItem[] {
    try {
      const raw = safeGetItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(DEFAULT_PUBLISHED_TRANSLATIONS));
        return DEFAULT_PUBLISHED_TRANSLATIONS;
      }
      const items: TranslationHistoryItem[] = JSON.parse(raw);
      return items.map((item) => ({
        ...item,
        authorId: item.authorId || item.userId,
        userId: item.userId || item.authorId,
        authorName: item.isAnonymous ? 'Anonim Çalışan' : (item.authorName || 'Çalışan'),
        isAnonymous: item.isAnonymous ?? false,
        corporateText: item.corporateText || item.corporate,
        corporate: item.corporate || item.corporateText,
        normalizedText: item.normalizedText || normalizeCorporateForSearch(item.corporateText || item.corporate || ''),
        translatedText: item.translatedText || item.human,
        human: item.human || item.translatedText,
        tone: item.tone || 'bikkin-calisan',
        status: item.status || 'taslak',
        likeCount: item.likeCount ?? 0,
        favoriteCount: item.favoriteCount ?? 0,
        updatedAt: item.updatedAt || item.createdAt,
        publishedAt: item.publishedAt ?? (item.status === 'yayinda' ? item.createdAt : null),
      }));
    } catch {
      return DEFAULT_PUBLISHED_TRANSLATIONS;
    }
  },

  /**
   * Keşfet (Topluluk Çevirileri) için sadece `status === 'yayinda'` olan çevirileri döndürür.
   */
  getPublishedTranslations(): TranslationHistoryItem[] {
    return this.getAllTranslations().filter((item) => item.status === 'yayinda');
  },

  /**
   * Yönetici Onay Kuyruğu için `status === 'onay_bekliyor'` olan çevirileri
   * en eskisi en üstte olacak şekilde (`createdAt` artan) döndürür.
   */
  getPendingTranslations(): TranslationHistoryItem[] {
    return this.getAllTranslations()
      .filter((item) => item.status === 'onay_bekliyor')
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  getUserHistory(uid: string): TranslationHistoryItem[] {
    if (!uid) return [];
    return this.getAllTranslations()
      .filter((item) => item.authorId === uid || item.userId === uid)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  addTranslationHistory(
    uid: string,
    corporate: string,
    human: string,
    tone: TranslationTone = 'bikkin-calisan',
    status: TranslationStatus = 'taslak',
    isAnonymous = false,
  ): TranslationHistoryItem | null {
    if (!uid || !corporate.trim() || !human.trim()) return null;
    try {
      const items = this.getAllTranslations();
      const userDoc = this.getUserByUid(uid);
      const session = this.getCurrentSession();
      const now = Date.now();
      const cleanCorp = corporate.trim();
      const cleanHuman = human.trim();
      const resolvedAuthorName = isAnonymous
        ? 'Anonim Çalışan'
        : userDoc?.displayName ||
        userDoc?.name ||
        session?.displayName ||
        session?.name ||
        'Plaza Çalışanı';

      const newItem: TranslationHistoryItem = {
        id: `tr_${now}_${Math.random().toString(36).substring(2, 6)}`,
        userId: uid,
        authorId: uid,
        authorName: resolvedAuthorName,
        isAnonymous: Boolean(isAnonymous),
        corporate: cleanCorp,
        corporateText: cleanCorp,
        normalizedText: normalizeCorporateForSearch(cleanCorp),
        human: cleanHuman,
        translatedText: cleanHuman,
        tone,
        status,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        likeCount: 0,
        favoriteCount: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: status === 'yayinda' ? now : null,
      };

      items.unshift(newItem);
      const trimmed = items.slice(0, 100);
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));

      if (isFirebaseConfigured()) {
        const fbAuth = firebaseAuthClient.getStoredAuth();
        const cloudAuthorId = fbAuth?.localId || uid;
        void cloudFirestoreClient.setDoc(
          'translations',
          newItem.id,
          {
            ...newItem,
            authorId: cloudAuthorId,
            userId: cloudAuthorId,
            appUserId: uid,
          } as unknown as Record<string, unknown>,
          fbAuth?.idToken || session?.token,
        );
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('history_updated'));
      }
      return newItem;
    } catch {
      return null;
    }
  },

  /**
   * Mevcut çeviri dokümanını (`translations/{translationId}`) günceller.
   * Önemli Kural: Durumu zaten `yayinda` veya `reddedildi` olan bir çeviri düzenlenip
   * kaydedildiğinde durumu otomatik olarak tekrar `onay_bekliyor` olur ve `updatedAt` güncellenir.
   */
  updateTranslation(
    uid: string,
    translationId: string,
    payload: {
      corporateText: string;
      translatedText: string;
      tone: TranslationTone;
      isAnonymous: boolean;
      requestedStatus: 'taslak' | 'onay_bekliyor';
    },
  ): { success: boolean; item?: TranslationHistoryItem; error?: string } {
    if (!uid || !translationId) {
      return { success: false, error: 'Geçersiz kullanıcı veya çeviri kimliği.' };
    }

    const items = this.getAllTranslations();
    const index = items.findIndex(
      (t) => t.id === translationId && (t.authorId === uid || t.userId === uid),
    );
    if (index === -1) {
      return { success: false, error: 'Düzenlenecek çeviri kaydı bulunamadı.' };
    }

    const current = items[index];
    const cleanCorp = payload.corporateText.trim();
    const cleanTranslated = payload.translatedText.trim();
    const now = Date.now();

    const userDoc = this.getUserByUid(uid);
    const session = this.getCurrentSession();
    const resolvedAuthorName = payload.isAnonymous
      ? 'Anonim Çalışan'
      : userDoc?.displayName ||
      userDoc?.name ||
      session?.displayName ||
      session?.name ||
      'Plaza Çalışanı';

    // Önemli Kural: Durumu zaten 'yayinda' veya 'reddedildi' olan bir çeviri düzenlenip kaydedildiğinde
    // durumu otomatik olarak tekrar 'onay_bekliyor' olur.
    const nextStatus: TranslationStatus =
      current.status === 'yayinda' || current.status === 'reddedildi'
        ? 'onay_bekliyor'
        : payload.requestedStatus;

    const updated: TranslationHistoryItem = {
      ...current,
      authorName: resolvedAuthorName,
      isAnonymous: Boolean(payload.isAnonymous),
      corporate: cleanCorp,
      corporateText: cleanCorp,
      normalizedText: normalizeCorporateForSearch(cleanCorp),
      human: cleanTranslated,
      translatedText: cleanTranslated,
      tone: payload.tone,
      status: nextStatus,
      rejectionReason: null,
      updatedAt: now,
    };

    items[index] = updated;
    safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(items));

    if (isFirebaseConfigured()) {
      const fbAuth = firebaseAuthClient.getStoredAuth();
      const cloudAuthorId = fbAuth?.localId || uid;
      void cloudFirestoreClient.setDoc(
        'translations',
        updated.id,
        {
          ...updated,
          authorId: cloudAuthorId,
          userId: cloudAuthorId,
          appUserId: uid,
        } as unknown as Record<string, unknown>,
        fbAuth?.idToken || session?.token,
      );
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history_updated'));
    }

    return { success: true, item: updated };
  },

  /**
   * Belirli bir çeviri dokümanını (`translations/{translationId}`) veritabanından tamamen siler.
   */
  deleteTranslation(
    uid: string,
    translationId: string,
  ): { success: boolean; error?: string } {
    if (!uid || !translationId) {
      return { success: false, error: 'Geçersiz kullanıcı veya çeviri kimliği.' };
    }

    const items = this.getAllTranslations();
    const target = items.find(
      (t) => t.id === translationId && (t.authorId === uid || t.userId === uid),
    );
    if (!target) {
      return { success: false, error: 'Silinecek çeviri kaydı bulunamadı.' };
    }

    const remaining = items.filter((t) => t.id !== translationId);
    safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(remaining));

    // İlişkili favori kaydını da temizle
    const allFavorites = this.getAllFavorites();
    const remainingFavorites = allFavorites.filter((f) => f.translationId !== translationId);
    if (remainingFavorites.length !== allFavorites.length) {
      safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(remainingFavorites));
    }

    const session = this.getCurrentSession();
    if (isFirebaseConfigured()) {
      void cloudFirestoreClient.deleteDoc('translations', translationId, session?.token);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history_updated'));
      window.dispatchEvent(new Event('favorites_updated'));
    }

    return { success: true };
  },

  updateTranslationStatus(
    translationId: string,
    newStatus: TranslationStatus,
    actorUid: string,
    rejectionReason?: string | null,
  ): { success: boolean; item?: TranslationHistoryItem; error?: string } {
    if (!translationId) return { success: false, error: 'Çeviri kimliği eksik.' };
    const items = this.getAllTranslations();
    const index = items.findIndex((t) => t.id === translationId);
    if (index === -1) {
      return { success: false, error: 'Çeviri kaydı bulunamadı.' };
    }

    const current = items[index];
    const previousStatus = current.status;
    const now = Date.now();

    if (newStatus === 'reddedildi' && (!rejectionReason || !rejectionReason.trim())) {
      return { success: false, error: 'Lütfen ret gerekçesi yazın.' };
    }

    const updated: TranslationHistoryItem = {
      ...current,
      status: newStatus,
      rejectionReason: newStatus === 'reddedildi' ? (rejectionReason?.trim() || null) : null,
      reviewedBy:
        newStatus === 'yayinda' || newStatus === 'reddedildi' ? actorUid : current.reviewedBy,
      reviewedAt:
        newStatus === 'yayinda' || newStatus === 'reddedildi' ? now : current.reviewedAt,
      publishedAt: newStatus === 'yayinda' ? now : current.publishedAt,
      updatedAt: now,
    };

    items[index] = updated;
    safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(items));

    const session = this.getCurrentSession();
    if (isFirebaseConfigured()) {
      const fbAuth = firebaseAuthClient.getStoredAuth();
      const payloadForCloud: Record<string, unknown> = {
        ...updated,
      };
      if (newStatus === 'onay_bekliyor' && fbAuth?.localId) {
        payloadForCloud.authorId = fbAuth.localId;
        payloadForCloud.userId = fbAuth.localId;
        payloadForCloud.appUserId = current.authorId;
      }
      void cloudFirestoreClient.setDoc(
        'translations',
        updated.id,
        payloadForCloud,
        fbAuth?.idToken || session?.token,
      );
    }

    // Yönetici kararıysa `moderation_logs` koleksiyonuna denetim kaydı ekle
    if (newStatus === 'yayinda' || newStatus === 'reddedildi') {
      this.addModerationLog({
        translationId: updated.id,
        adminId: actorUid,
        previousStatus,
        newStatus,
        reason: updated.rejectionReason,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history_updated'));
    }
    return { success: true, item: updated };
  },

  clearUserHistory(uid: string): void {
    if (!uid) return;
    try {
      const items = this.getAllTranslations();
      const toDelete = items.filter((item) => item.userId === uid || item.authorId === uid);
      const remaining = items.filter((item) => item.userId !== uid && item.authorId !== uid);
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(remaining));

      const session = this.getCurrentSession();
      if (isFirebaseConfigured()) {
        for (const doc of toDelete) {
          void cloudFirestoreClient.deleteDoc('translations', doc.id, session?.token);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('history_updated'));
      }
    } catch {
      // ignore
    }
  },

  // ==========================================
  // FAVORITES (Firestore `favorites` koleksiyonu)
  // Giriş yapan kullanıcının `uid` değerine bağlı olarak saklanır.
  // Doküman ID: `${uid}_${translationId}`
  // ==========================================
  getAllFavorites(): FavoriteItem[] {
    try {
      const raw = safeGetItem(FAVORITES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as FavoriteItem[];
    } catch {
      return [];
    }
  },

  getUserFavorites(uid: string): FavoriteItem[] {
    if (!uid) return [];
    return this.getAllFavorites().filter((fav) => fav.userId === uid);
  },

  isFavorited(uid: string, translationId: string): boolean {
    if (!uid || !translationId) return false;
    const compositeId = `${uid}_${translationId}`;
    return this.getAllFavorites().some(
      (fav) => fav.id === compositeId || (fav.userId === uid && fav.translationId === translationId),
    );
  },

  toggleFavorite(
    uid: string,
    payload: {
      translationId: string;
      corporateText: string;
      translatedText: string;
      tone?: TranslationTone;
      note?: string | null;
    },
  ): { favorited: boolean; item?: FavoriteItem } {
    if (!uid || !payload.translationId) return { favorited: false };
    const compositeId = `${uid}_${payload.translationId}`;
    const fbAuth = firebaseAuthClient.getStoredAuth();
    const cloudUserId = fbAuth?.localId || uid;
    const cloudCompositeId = `${cloudUserId}_${payload.translationId}`;
    const all = this.getAllFavorites();
    const existingIndex = all.findIndex((f) => f.id === compositeId);
    const session = this.getCurrentSession();

    const translations = this.getAllTranslations();
    const trIndex = translations.findIndex((t) => t.id === payload.translationId);

    if (existingIndex >= 0) {
      all.splice(existingIndex, 1);
      safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(all));

      if (trIndex >= 0) {
        translations[trIndex].favoriteCount = Math.max(0, (translations[trIndex].favoriteCount || 1) - 1);
        safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(translations));
      }

      if (isFirebaseConfigured()) {
        void cloudFirestoreClient.deleteDoc(
          'favorites',
          cloudCompositeId,
          fbAuth?.idToken || session?.token,
        );
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('favorites_updated'));
        window.dispatchEvent(new Event('history_updated'));
      }
      return { favorited: false };
    }

    const newFav: FavoriteItem = {
      id: compositeId,
      userId: uid,
      translationId: payload.translationId,
      corporateText: payload.corporateText.trim(),
      translatedText: payload.translatedText.trim(),
      tone: payload.tone || 'bikkin-calisan',
      note: payload.note ?? null,
      createdAt: Date.now(),
    };

    all.unshift(newFav);
    safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(all));

    if (trIndex >= 0) {
      translations[trIndex].favoriteCount = (translations[trIndex].favoriteCount || 0) + 1;
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(translations));
    }

    if (isFirebaseConfigured()) {
      void cloudFirestoreClient.setDoc(
        'favorites',
        cloudCompositeId,
        {
          ...newFav,
          id: cloudCompositeId,
          userId: cloudUserId,
          appUserId: uid,
        } as unknown as Record<string, unknown>,
        fbAuth?.idToken || session?.token,
      );
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('favorites_updated'));
      window.dispatchEvent(new Event('history_updated'));
    }
    return { favorited: true, item: newFav };
  },

  clearUserFavorites(uid: string): void {
    if (!uid) return;
    const all = this.getAllFavorites();
    const remaining = all.filter((f) => f.userId !== uid);
    safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(remaining));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('favorites_updated'));
    }
  },

  // ==========================================
  // LIKES (Firestore `likes` koleksiyonu)
  // Doküman ID: `${uid}_${translationId}`
  // ==========================================
  getAllLikes(): LikeItem[] {
    try {
      const raw = safeGetItem(LIKES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as LikeItem[];
    } catch {
      return [];
    }
  },

  getUserLikes(uid: string): LikeItem[] {
    if (!uid) return [];
    return this.getAllLikes().filter((l) => l.userId === uid);
  },

  isLiked(uid: string, translationId: string): boolean {
    if (!uid || !translationId) return false;
    const compositeId = `${uid}_${translationId}`;
    return this.getAllLikes().some(
      (l) => l.id === compositeId || (l.userId === uid && l.translationId === translationId),
    );
  },

  toggleLike(uid: string, translationId: string): { liked: boolean; likeCount: number } {
    if (!uid || !translationId) return { liked: false, likeCount: 0 };
    const compositeId = `${uid}_${translationId}`;
    const fbAuth = firebaseAuthClient.getStoredAuth();
    const cloudUserId = fbAuth?.localId || uid;
    const cloudCompositeId = `${cloudUserId}_${translationId}`;
    const allLikes = this.getAllLikes();
    const existingIndex = allLikes.findIndex((l) => l.id === compositeId);
    const session = this.getCurrentSession();

    const translations = this.getAllTranslations();
    const trIndex = translations.findIndex((t) => t.id === translationId);
    let likeCount = trIndex >= 0 ? translations[trIndex].likeCount || 0 : 0;

    if (existingIndex >= 0) {
      allLikes.splice(existingIndex, 1);
      safeSetItem(LIKES_STORAGE_KEY, JSON.stringify(allLikes));
      likeCount = Math.max(0, likeCount - 1);
      if (trIndex >= 0) {
        translations[trIndex].likeCount = likeCount;
        safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(translations));
      }
      if (isFirebaseConfigured()) {
        void cloudFirestoreClient.deleteDoc(
          'likes',
          cloudCompositeId,
          fbAuth?.idToken || session?.token,
        );
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('history_updated'));
      }
      return { liked: false, likeCount };
    }

    const newLike: LikeItem = {
      id: compositeId,
      userId: uid,
      translationId,
      createdAt: Date.now(),
    };
    allLikes.push(newLike);
    safeSetItem(LIKES_STORAGE_KEY, JSON.stringify(allLikes));
    likeCount += 1;

    if (trIndex >= 0) {
      translations[trIndex].likeCount = likeCount;
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(translations));
    }

    if (isFirebaseConfigured()) {
      void cloudFirestoreClient.setDoc(
        'likes',
        cloudCompositeId,
        {
          ...newLike,
          id: cloudCompositeId,
          userId: cloudUserId,
          appUserId: uid,
        } as unknown as Record<string, unknown>,
        fbAuth?.idToken || session?.token,
      );
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history_updated'));
    }
    return { liked: true, likeCount };
  },

  // ==========================================
  // MODERATION LOGS (Firestore `moderation_logs` koleksiyonu)
  // ==========================================
  addModerationLog(input: {
    translationId: string;
    adminId: string;
    previousStatus: TranslationStatus;
    newStatus: TranslationStatus;
    reason?: string | null;
  }): ModerationLogItem {
    const raw = safeGetItem(MODERATION_LOGS_STORAGE_KEY);
    const logs: ModerationLogItem[] = raw ? JSON.parse(raw) : [];
    const newLog: ModerationLogItem = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      translationId: input.translationId,
      adminId: input.adminId,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      reason: input.reason ?? null,
      createdAt: Date.now(),
    };
    logs.unshift(newLog);
    safeSetItem(MODERATION_LOGS_STORAGE_KEY, JSON.stringify(logs));

    const session = this.getCurrentSession();
    if (isFirebaseConfigured()) {
      void cloudFirestoreClient.setDoc(
        'moderation_logs',
        newLog.id,
        newLog as unknown as Record<string, unknown>,
        session?.token,
      );
    }
    return newLog;
  },

  /**
   * Canlı Cloud Firestore koleksiyonlarından (`translations`, `likes`, `favorites`, `users`)
   * güncel verileri çekip yerel önbellekle senkronize eder.
   */
  async syncFromCloud(): Promise<void> {
    if (!isFirebaseConfigured()) return;
    try {
      const session = this.getCurrentSession();
      const fbAuth = firebaseAuthClient.getStoredAuth();
      const token = fbAuth?.idToken || session?.token;

      // 1. Yayındaki tüm çevirileri çek (herkese açık: status == 'yayinda')
      const cloudPublished = await cloudFirestoreClient.queryByField<
        TranslationHistoryItem & { appUserId?: string }
      >('translations', 'status', 'yayinda', token);

      // 2. Oturum açmış kullanıcının kendi çevirilerini veya yöneticiyse tüm çevirileri çek
      let cloudOwnOrAdmin: Array<TranslationHistoryItem & { appUserId?: string }> = [];
      if (session?.role === 'yonetici' && token) {
        const allCloud = await cloudFirestoreClient.listDocs<
          TranslationHistoryItem & { appUserId?: string }
        >('translations', token);
        if (allCloud) cloudOwnOrAdmin = allCloud;
      } else if (fbAuth?.localId && token) {
        const ownCloud = await cloudFirestoreClient.queryByField<
          TranslationHistoryItem & { appUserId?: string }
        >('translations', 'authorId', fbAuth.localId, token);
        if (ownCloud) cloudOwnOrAdmin = ownCloud;
      }

      if (cloudPublished || cloudOwnOrAdmin.length > 0) {
        const localItems = this.getAllTranslations();
        const mergedMap = new Map<string, TranslationHistoryItem>();
        for (const item of localItems) {
          mergedMap.set(item.id, item);
        }
        const incoming = [...(cloudPublished || []), ...cloudOwnOrAdmin];
        for (const doc of incoming) {
          if (!doc || !doc.id) continue;
          const mappedOwner =
            doc.appUserId ||
            (fbAuth?.localId && doc.authorId === fbAuth.localId && session?.uid
              ? session.uid
              : doc.authorId || doc.userId);
          const existing = mergedMap.get(doc.id);
          if (!existing || (doc.updatedAt || 0) >= (existing.updatedAt || 0)) {
            mergedMap.set(doc.id, {
              ...existing,
              ...doc,
              authorId: mappedOwner,
              userId: mappedOwner,
            });
          }
        }
        safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(Array.from(mergedMap.values())));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('history_updated'));
        }
      }

      // 3. Beğenileri çek (herkese açık: allow read: if true)
      const cloudLikes = await cloudFirestoreClient.listDocs<LikeItem & { appUserId?: string }>(
        'likes',
        token,
      );
      if (cloudLikes && cloudLikes.length > 0) {
        const localLikes = this.getAllLikes();
        const likeMap = new Map<string, LikeItem>();
        for (const l of localLikes) likeMap.set(l.id, l);
        for (const cl of cloudLikes) {
          if (!cl || !cl.translationId) continue;
          const uidForApp =
            cl.appUserId ||
            (fbAuth?.localId && cl.userId === fbAuth.localId && session?.uid
              ? session.uid
              : cl.userId);
          const idForApp = `${uidForApp}_${cl.translationId}`;
          likeMap.set(idForApp, {
            id: idForApp,
            userId: uidForApp,
            translationId: cl.translationId,
            createdAt: cl.createdAt || Date.now(),
          });
        }
        safeSetItem(LIKES_STORAGE_KEY, JSON.stringify(Array.from(likeMap.values())));
      }

      // 4. Giriş yapmış kullanıcının favorilerini çek
      if (fbAuth?.localId && token && session?.uid) {
        const cloudFavs = await cloudFirestoreClient.queryByField<
          FavoriteItem & { appUserId?: string }
        >('favorites', 'userId', fbAuth.localId, token);
        if (cloudFavs && cloudFavs.length > 0) {
          const localFavs = this.getAllFavorites();
          const favMap = new Map<string, FavoriteItem>();
          for (const f of localFavs) favMap.set(f.id, f);
          for (const cf of cloudFavs) {
            if (!cf || !cf.translationId) continue;
            const idForApp = `${session.uid}_${cf.translationId}`;
            favMap.set(idForApp, {
              ...cf,
              id: idForApp,
              userId: session.uid,
            });
          }
          safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favMap.values())));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('favorites_updated'));
          }
        }
      }

      // 5. Giriş yapmış kullanıcının kendi Firestore profilinden rol/durum bilgisini doğrula
      if (fbAuth?.localId && token && session) {
        const ownProfile = await cloudFirestoreClient.getDoc<User & { appUid?: string }>(
          'users',
          fbAuth.localId,
          token,
        );
        if (!ownProfile) {
          this.logout();
          return;
        }
        const cloudRole: UserRole = isAdminRole(ownProfile.role)
          ? 'yonetici'
          : 'kullanici';
        const cloudIsActive =
          ownProfile.isActive !== false && ownProfile.status !== 'banned';

        if (!cloudIsActive) {
          this.logout();
          return;
        }

        if (session.role !== cloudRole || session.isActive !== cloudIsActive) {
          this.setCurrentSession({
            ...session,
            role: cloudRole,
            isActive: cloudIsActive,
          });
        }
      }
    } catch {
      // Ağ hatasında mevcut oturum korunur
    }
  },
};
