export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'banned';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
  createdAt: number;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
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

export interface TranslationHistoryItem {
  id: string;
  userId: string;
  corporate: string;
  human: string;
  createdAt: number;
}
