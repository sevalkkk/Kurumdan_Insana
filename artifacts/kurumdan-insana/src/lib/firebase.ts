/**
 * Firebase Firestore & Firebase Authentication Bağlantı Katmanı
 *
 * `.env` dosyasında `VITE_FIREBASE_API_KEY` ve `VITE_FIREBASE_PROJECT_ID` tanımlandığında
 * doğrudan Firebase Authentication (Identity Toolkit v1) ve Cloud Firestore (v1) API'leri
 * ile haberleşir. Anahtarlar henüz tanımlanmadığında ise aynı koleksiyon ve doküman şemasını
 * (`users`, `translations`, `favorites`, `likes`, `moderation_logs`) yerel veritabanı
 * yedeği (fallback) üzerinde çalıştırır.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.trim().length > 5 &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.trim().length > 2,
  );
}

export type FirestoreCollectionName =
  | 'users'
  | 'translations'
  | 'favorites'
  | 'likes'
  | 'moderation_logs';

export interface StoredFirebaseAuth {
  localId: string;
  idToken: string;
  refreshToken?: string;
  email: string;
  updatedAt: number;
  expiresAt?: number;
}

const FB_AUTH_STORAGE_KEY = 'kurumdan_insana_fb_auth_v1';

// Firestore Value -> JSON Dönüştürücü
function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(valObj: Record<string, unknown>): unknown {
  if ('nullValue' in valObj) return null;
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('timestampValue' in valObj) return new Date(String(valObj.timestampValue)).getTime();
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('arrayValue' in valObj) {
    const arr = (valObj.arrayValue as { values?: Record<string, unknown>[] })?.values || [];
    return arr.map((item) => fromFirestoreValue(item));
  }
  if ('mapValue' in valObj) {
    const fields =
      (valObj.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields || {};
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function toFirestoreDocument(data: Record<string, unknown>): {
  fields: Record<string, unknown>;
} {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }
  return { fields };
}

export function fromFirestoreDocument<T>(doc: {
  name?: string;
  fields?: Record<string, Record<string, unknown>>;
}): T | null {
  if (!doc || !doc.fields) return null;
  const result: Record<string, unknown> = {};
  for (const [key, valObj] of Object.entries(doc.fields)) {
    result[key] = fromFirestoreValue(valObj);
  }
  if (doc.name && !result.id) {
    const parts = doc.name.split('/');
    result.id = parts[parts.length - 1];
  }
  return result as T;
}

async function resolveFreshBearerToken(explicitToken?: string): Promise<string | null> {
  if (explicitToken && !explicitToken.startsWith('sess_')) {
    const stored = firebaseAuthClient.getStoredAuth();
    if (
      stored &&
      stored.idToken === explicitToken &&
      stored.expiresAt &&
      Date.now() > stored.expiresAt - 60_000
    ) {
      const refreshed = await firebaseAuthClient.refreshIdToken();
      if (refreshed) return refreshed;
    }
    return explicitToken;
  }
  const stored = firebaseAuthClient.getStoredAuth();
  if (!stored) return null;
  if (stored.expiresAt && Date.now() > stored.expiresAt - 60_000) {
    const refreshed = await firebaseAuthClient.refreshIdToken();
    if (refreshed) return refreshed;
  }
  return stored.idToken || null;
}

/**
 * Cloud Firestore REST API Senkronizasyonu (Gerçek Firebase Projesi Bağlandığında Aktifleşir)
 */
export const cloudFirestoreClient = {
  getBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
  },

  async setDoc(
    collection: FirestoreCollectionName,
    docId: string,
    data: Record<string, unknown>,
    idToken?: string,
  ): Promise<boolean> {
    if (!isFirebaseConfigured()) {
      console.warn(`[Firestore] setDoc(${collection}/${docId}) atlandı: Firebase yapılandırılmamış.`);
      return false;
    }
    try {
      const url = `${this.getBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = await resolveFreshBearerToken(idToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(toFirestoreDocument(data)),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[Firestore] setDoc(${collection}/${docId}) başarısız: HTTP ${res.status}`, errBody);
        return false;
      }
      console.info(`[Firestore] setDoc(${collection}/${docId}) başarılı.`);
      return true;
    } catch (err) {
      console.error(`[Firestore] setDoc(${collection}/${docId}) ağ hatası:`, err);
      return false;
    }
  },

  async getDoc<T>(
    collection: FirestoreCollectionName,
    docId: string,
    idToken?: string,
  ): Promise<T | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const url = `${this.getBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {};
      const token = await resolveFreshBearerToken(idToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (res.status !== 404) {
          console.warn(`[Firestore] getDoc(${collection}/${docId}) başarısız: HTTP ${res.status}`);
        }
        return null;
      }
      const doc = (await res.json()) as {
        name?: string;
        fields?: Record<string, Record<string, unknown>>;
      };
      return fromFirestoreDocument<T>(doc);
    } catch (err) {
      console.error(`[Firestore] getDoc(${collection}/${docId}) ağ hatası:`, err);
      return null;
    }
  },

  async deleteDoc(
    collection: FirestoreCollectionName,
    docId: string,
    idToken?: string,
  ): Promise<boolean> {
    if (!isFirebaseConfigured()) return false;
    try {
      const url = `${this.getBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {};
      const token = await resolveFreshBearerToken(idToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        console.warn(`[Firestore] deleteDoc(${collection}/${docId}) başarısız: HTTP ${res.status}`);
      }
      return res.ok;
    } catch (err) {
      console.error(`[Firestore] deleteDoc(${collection}/${docId}) ağ hatası:`, err);
      return false;
    }
  },

  async listDocs<T>(collection: FirestoreCollectionName, idToken?: string): Promise<T[] | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const url = `${this.getBaseUrl()}/${collection}?key=${firebaseConfig.apiKey}&pageSize=200`;
      const headers: Record<string, string> = {};
      const token = await resolveFreshBearerToken(idToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`[Firestore] listDocs(${collection}) başarısız: HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as {
        documents?: Array<{ name?: string; fields?: Record<string, Record<string, unknown>> }>;
      };
      if (!json.documents) return [];
      return json.documents
        .map((d) => fromFirestoreDocument<T>(d))
        .filter((item): item is T => item !== null);
    } catch (err) {
      console.error(`[Firestore] listDocs(${collection}) ağ hatası:`, err);
      return null;
    }
  },

  async queryByField<T>(
    collection: FirestoreCollectionName,
    fieldPath: string,
    value: string | number | boolean,
    idToken?: string,
  ): Promise<T[] | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const url = `${this.getBaseUrl()}:runQuery?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = await resolveFreshBearerToken(idToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collection }],
            where: {
              fieldFilter: {
                field: { fieldPath },
                op: 'EQUAL',
                value: toFirestoreValue(value),
              },
            },
          },
        }),
      });
      if (!res.ok) {
        console.warn(`[Firestore] queryByField(${collection}.${fieldPath}) başarısız: HTTP ${res.status}`);
        return null;
      }
      const rows = (await res.json()) as Array<{
        document?: { name?: string; fields?: Record<string, Record<string, unknown>> };
      }>;
      if (!Array.isArray(rows)) return [];
      return rows
        .map((row) => (row.document ? fromFirestoreDocument<T>(row.document) : null))
        .filter((item): item is T => item !== null);
    } catch (err) {
      console.error(`[Firestore] queryByField(${collection}.${fieldPath}) ağ hatası:`, err);
      return null;
    }
  },
};

export interface FirebaseAuthCredentials {
  localId: string;
  idToken: string;
  refreshToken?: string;
}

export type FirebaseAuthResult =
  | { ok: true; data: FirebaseAuthCredentials }
  | { ok: false; errorCode: string; errorMessage: string; isNetworkError?: boolean };

async function performIdentityToolkitAuth(
  endpoint: 'accounts:signUp' | 'accounts:signInWithPassword',
  email: string,
  password: string,
): Promise<FirebaseAuthResult> {
  if (!isFirebaseConfigured()) {
    console.warn(`[Firebase Auth] ${endpoint} atlandı: VITE_FIREBASE_API_KEY veya VITE_FIREBASE_PROJECT_ID tanımlı değil.`);
    return {
      ok: false,
      errorCode: 'FIREBASE_NOT_CONFIGURED',
      errorMessage: 'Firebase yapılandırılmamış.',
      isNetworkError: true,
    };
  }
  try {
    console.info(`[Firebase Auth] ${endpoint} isteği gönderiliyor:`, email.trim().toLowerCase());
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      localId?: string;
      idToken?: string;
      refreshToken?: string;
      expiresIn?: string;
      error?: { message?: string; code?: number };
    };
    if (!res.ok || !json.localId || !json.idToken) {
      const errorCode = json.error?.message || `HTTP_${res.status}`;
      console.error(`[Firebase Auth] ${endpoint} başarısız:`, res.status, errorCode);
      return {
        ok: false,
        errorCode,
        errorMessage: errorCode,
      };
    }
    const data: FirebaseAuthCredentials = {
      localId: json.localId,
      idToken: json.idToken,
      refreshToken: json.refreshToken,
    };
    firebaseAuthClient.setStoredAuth({
      localId: data.localId,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      email: email.trim().toLowerCase(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + Number(json.expiresIn || 3600) * 1000,
    });
    console.info(`[Firebase Auth] ${endpoint} başarılı. UID:`, data.localId);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.error(`[Firebase Auth] ${endpoint} ağ hatası:`, err);
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: message,
      isNetworkError: true,
    };
  }
}

/**
 * Firebase Authentication REST API İstemcisi (Identity Toolkit v1)
 */
export const firebaseAuthClient = {
  getStoredAuth(): StoredFirebaseAuth | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(FB_AUTH_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredFirebaseAuth;
    } catch {
      return null;
    }
  },

  setStoredAuth(auth: StoredFirebaseAuth | null): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (auth) {
        window.localStorage.setItem(FB_AUTH_STORAGE_KEY, JSON.stringify(auth));
      } else {
        window.localStorage.removeItem(FB_AUTH_STORAGE_KEY);
      }
    } catch {
      // ignore storage error
    }
  },

  async signUpWithEmailPasswordResult(
    email: string,
    password: string,
  ): Promise<FirebaseAuthResult> {
    return performIdentityToolkitAuth('accounts:signUp', email, password);
  },

  async signInWithEmailPasswordResult(
    email: string,
    password: string,
  ): Promise<FirebaseAuthResult> {
    return performIdentityToolkitAuth('accounts:signInWithPassword', email, password);
  },

  async signUpWithEmailPassword(
    email: string,
    password: string,
  ): Promise<FirebaseAuthCredentials | null> {
    const res = await this.signUpWithEmailPasswordResult(email, password);
    return res.ok ? res.data : null;
  },

  async signInWithEmailPassword(
    email: string,
    password: string,
  ): Promise<FirebaseAuthCredentials | null> {
    const res = await this.signInWithEmailPasswordResult(email, password);
    return res.ok ? res.data : null;
  },

  async refreshIdToken(): Promise<string | null> {
    if (!isFirebaseConfigured()) return null;
    const stored = this.getStoredAuth();
    if (!stored?.refreshToken) return null;
    try {
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: stored.refreshToken,
          }),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        id_token: string;
        refresh_token?: string;
        expires_in?: string;
        user_id?: string;
      };
      this.setStoredAuth({
        ...stored,
        localId: data.user_id || stored.localId,
        idToken: data.id_token,
        refreshToken: data.refresh_token || stored.refreshToken,
        updatedAt: Date.now(),
        expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
      });
      return data.id_token;
    } catch (err) {
      console.error('[Firebase Auth] Token yenileme hatası:', err);
      return null;
    }
  },

  async sendPasswordResetEmail(email: string): Promise<boolean> {
    if (!isFirebaseConfigured()) return false;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
        },
      );
      if (!res.ok) {
        console.error('[Firebase Auth] sendPasswordResetEmail başarısız: HTTP', res.status);
      }
      return res.ok;
    } catch (err) {
      console.error('[Firebase Auth] sendPasswordResetEmail ağ hatası:', err);
      return false;
    }
  },
};

