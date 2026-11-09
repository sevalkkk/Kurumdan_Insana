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
  ): Promise<void> {
    if (!isFirebaseConfigured()) return;
    try {
      const url = `${this.getBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken && !idToken.startsWith('sess_')) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(toFirestoreDocument(data)),
      });
    } catch {
      // Çevrimdışı veya ağ hatası durumunda yerel önbellek korunur
    }
  },

  async deleteDoc(
    collection: FirestoreCollectionName,
    docId: string,
    idToken?: string,
  ): Promise<void> {
    if (!isFirebaseConfigured()) return;
    try {
      const url = `${this.getBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
      const headers: Record<string, string> = {};
      if (idToken && !idToken.startsWith('sess_')) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      await fetch(url, {
        method: 'DELETE',
        headers,
      });
    } catch {
      // Çevrimdışı hata yutulur
    }
  },

  async listDocs<T>(collection: FirestoreCollectionName, idToken?: string): Promise<T[] | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const url = `${this.getBaseUrl()}/${collection}?key=${firebaseConfig.apiKey}&pageSize=200`;
      const headers: Record<string, string> = {};
      if (idToken && !idToken.startsWith('sess_')) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        documents?: Array<{ name?: string; fields?: Record<string, Record<string, unknown>> }>;
      };
      if (!json.documents) return [];
      return json.documents
        .map((d) => fromFirestoreDocument<T>(d))
        .filter((item): item is T => item !== null);
    } catch {
      return null;
    }
  },
};

/**
 * Firebase Authentication REST API İstemcisi (Identity Toolkit v1)
 */
export const firebaseAuthClient = {
  async signUpWithEmailPassword(
    email: string,
    password: string,
  ): Promise<{ localId: string; idToken: string } | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as { localId: string; idToken: string };
    } catch {
      return null;
    }
  },

  async signInWithEmailPassword(
    email: string,
    password: string,
  ): Promise<{ localId: string; idToken: string } | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as { localId: string; idToken: string };
    } catch {
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
      return res.ok;
    } catch {
      return false;
    }
  },
};

