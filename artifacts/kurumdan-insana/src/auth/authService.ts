import type {
  User,
  UserSession,
  UserRole,
  UserStatus,
  SignUpInput,
  LoginInput,
  FieldErrors,
  TranslationHistoryItem,
} from './types';
import {
  DUPLICATE_EMAIL_MESSAGE,
  GENERIC_LOGIN_ERROR,
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  isValidEmail,
} from './registrationValidation';

export const USERS_STORAGE_KEY = 'kurumdan_insana_users_v1';
export const SESSION_STORAGE_KEY = 'kurumdan_insana_session_v1';
export const HISTORY_STORAGE_KEY = 'kurumdan_insana_history_v1';
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

/**
 * Synchronous, standard SHA-256 implementation
 * Guarantees zero external dependencies and eliminates storing plain-text passwords in LocalStorage.
 */
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Sync(raw: string): string {
  const ascii = unescape(encodeURIComponent(raw));
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
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

/**
 * Hashes a user password using a unique salt and SHA-256
 */
export function hashPassword(password: string): string {
  return sha256Sync(`${AUTH_SALT}${password}`);
}

/**
 * Validates password with backwards-compatible support for legacy or newly hashed passwords
 */
function verifyPassword(inputPassword: string, user: User): boolean {
  const hashedInput = hashPassword(inputPassword);
  if (user.passwordHash && user.passwordHash === hashedInput) {
    return true;
  }
  // Backwards compatibility with unhashed legacy accounts if present
  if (user.password && (user.password === inputPassword || user.password === hashedInput)) {
    return true;
  }
  return false;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_master',
    name: 'Sistem Yöneticisi',
    email: 'admin@gmail.com',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    status: 'active',
    createdAt: 1730000000000,
  },
  {
    id: 'usr_demo_plaza',
    name: 'Deniz Kaya',
    email: 'deniz@sirket.com',
    passwordHash: hashPassword('Password123!'),
    role: 'user',
    status: 'active',
    createdAt: 1730000000000,
  },
];

function initUsers(): User[] {
  const stored = safeGetItem(USERS_STORAGE_KEY);
  if (!stored) {
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let modified = false;
      const normalized = parsed.map((u: User) => {
        let userMod = false;
        let passwordHash = u.passwordHash;
        if (!passwordHash && u.password) {
          passwordHash = hashPassword(u.password);
          userMod = true;
        }

        const role: UserRole = u.role || (u.email.toLowerCase() === 'admin@gmail.com' ? 'admin' : 'user');
        const status: UserStatus = u.status || 'active';

        if (role !== u.role || status !== u.status || userMod) {
          modified = true;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash,
            role,
            status,
            createdAt: u.createdAt || Date.now(),
          };
        }
        return u;
      });

      // Ensure master admin user always exists and has admin privileges
      const adminDefault = DEFAULT_USERS.find((u) => u.email === 'admin@gmail.com')!;
      const adminFound = normalized.find(
        (u: User) => u.email.toLowerCase() === 'admin@gmail.com'
      );
      if (!adminFound) {
        normalized.unshift(adminDefault);
        modified = true;
      } else if (adminFound.role !== 'admin' || !adminFound.passwordHash) {
        adminFound.role = 'admin';
        adminFound.passwordHash = adminDefault.passwordHash;
        modified = true;
      }

      if (modified) {
        safeSetItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
  } catch {
    // corrupted, reset to default
  }
  safeSetItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export const authService = {
  getUsers(): User[] {
    return initUsers();
  },

  getCurrentSession(): UserSession | null {
    const raw = safeGetItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
        // Enforce 7-day session expiration
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          safeRemoveItem(SESSION_STORAGE_KEY);
          return null;
        }
        return parsed as UserSession;
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

  signUp(input: SignUpInput): {
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: FieldErrors;
  } {
    const fieldErrors = validateRegistration(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    const users = this.getUsers();
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = users.find(
      (u) => u.email.trim().toLowerCase() === normalizedEmail,
    );

    if (existing) {
      return {
        success: false,
        error: DUPLICATE_EMAIL_MESSAGE,
      };
    }

    // Securely hash password before saving to LocalStorage
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(input.password),
      role: 'user',
      status: 'active',
      createdAt: Date.now(),
    };

    users.push(newUser);
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Create session (without storing password or hash in session object)
    const session: UserSession = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: 'user',
      token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      loggedInAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    };

    this.setCurrentSession(session);
    return { success: true, user: session };
  },

  login(input: LoginInput): {
    success: boolean;
    user?: UserSession;
    error?: string;
    fieldErrors?: Partial<Record<'email' | 'password', string>>;
  } {
    const fieldErrors = validateLogin(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    const users = this.getUsers();
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = users.find(
      (u) =>
        u.email.trim().toLowerCase() === normalizedEmail &&
        verifyPassword(input.password, u),
    );

    if (!user) {
      // Secure generic error message
      return {
        success: false,
        error: GENERIC_LOGIN_ERROR,
      };
    }

    if (user.status === 'banned') {
      return {
        success: false,
        error: 'Hesabınız askıya alınmıştır. Lütfen yönetici ile iletişime geçin.',
      };
    }

    const role: UserRole = user.role || (normalizedEmail === 'admin@gmail.com' ? 'admin' : 'user');

    const session: UserSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      loggedInAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    };

    this.setCurrentSession(session);
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

    // Record reset request audit log in LocalStorage
    const users = this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);

    if (exists) {
      try {
        const resetsRaw = safeGetItem(RESETS_STORAGE_KEY) || '[]';
        const resets = JSON.parse(resetsRaw);
        resets.push({
          email: normalizedEmail,
          token: `reset_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          requestedAt: Date.now(),
        });
        safeSetItem(RESETS_STORAGE_KEY, JSON.stringify(resets));
      } catch {
        // ignore reset log error
      }
    }

    // Always return privacy-safe confirmation
    return {
      success: true,
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    };
  },

  logout(): void {
    this.setCurrentSession(null);
  },

  // ==========================================
  // ADMIN PANEL OPERATIONS
  // ==========================================
  adminGetUsers(): User[] {
    return this.getUsers();
  },

  adminDeleteUser(userId: string): { success: boolean; error?: string } {
    if (!userId) return { success: false, error: 'Kullanıcı kimliği eksik.' };

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      return { success: false, error: 'Kendi yönetici hesabınızı silemezsiniz.' };
    }

    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'Kullanıcı bulunamadı.' };
    }
    if (target.email.toLowerCase() === 'admin@gmail.com') {
      return { success: false, error: 'Ana yönetici hesabı silinemez.' };
    }

    const remaining = users.filter((u) => u.id !== userId);
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(remaining));

    this.clearUserHistory(userId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
      window.dispatchEvent(new Event('auth_state_changed'));
    }
    return { success: true };
  },

  adminToggleBanUser(userId: string): { success: boolean; newStatus?: UserStatus; error?: string } {
    if (!userId) return { success: false, error: 'Kullanıcı kimliği eksik.' };

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      return { success: false, error: 'Kendi yönetici hesabınızı askıya alamazsınız.' };
    }

    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı.' };
    }
    if (user.email.toLowerCase() === 'admin@gmail.com') {
      return { success: false, error: 'Ana yönetici hesabı askıya alınamaz.' };
    }

    const newStatus: UserStatus = user.status === 'banned' ? 'active' : 'banned';
    user.status = newStatus;

    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
      window.dispatchEvent(new Event('auth_state_changed'));
    }
    return { success: true, newStatus };
  },

  adminCreateUser(input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): { success: boolean; user?: User; error?: string } {
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

    const users = this.getUsers();
    const normalizedEmail = input.email.trim().toLowerCase();
    const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      return { success: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(input.password),
      role: input.role || 'user',
      status: 'active',
      createdAt: Date.now(),
    };

    users.push(newUser);
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_users_updated'));
    }
    return { success: true, user: newUser };
  },

  // ==========================================
  // TRANSLATION HISTORY
  // ==========================================
  getUserHistory(userId: string): TranslationHistoryItem[] {
    if (!userId) return [];
    try {
      const raw = safeGetItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const items: TranslationHistoryItem[] = JSON.parse(raw);
      return items.filter((item) => item.userId === userId);
    } catch {
      return [];
    }
  },

  addTranslationHistory(userId: string, corporate: string, human: string): void {
    if (!userId || !corporate.trim() || !human.trim()) return;
    try {
      const raw = safeGetItem(HISTORY_STORAGE_KEY);
      const items: TranslationHistoryItem[] = raw ? JSON.parse(raw) : [];
      items.unshift({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        corporate: corporate.trim(),
        human: human.trim(),
        createdAt: Date.now(),
      });
      // Keep last 50 entries
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('history_updated'));
      }
    } catch {
      // ignore
    }
  },

  clearUserHistory(userId: string): void {
    if (!userId) return;
    try {
      const raw = safeGetItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const items: TranslationHistoryItem[] = JSON.parse(raw);
      const remaining = items.filter((item) => item.userId !== userId);
      safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(remaining));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('history_updated'));
      }
    } catch {
      // ignore
    }
  },
};
