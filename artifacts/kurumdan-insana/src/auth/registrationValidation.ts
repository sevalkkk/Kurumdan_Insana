import type { FieldErrors, SignUpInput, LoginInput } from './types';

export const DUPLICATE_EMAIL_MESSAGE =
  'Bu e-postayla bir hesap var. Giriş yapın.';

export const GENERIC_LOGIN_ERROR =
  'E-posta veya şifre hatalı.';

export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';

export const CONSENT_ERROR_MESSAGE =
  'Devam etmek için onay kutusunu işaretleyin.';

export const PASSWORD_LENGTH_ERROR_MESSAGE =
  'Şifre en az 8 karakter olmalı.';

export const INVALID_EMAIL_FORMAT_MESSAGE =
  'Lütfen geçerli bir e-posta adresi girin.';

export const UNTRUSTED_DOMAIN_MESSAGE =
  'Lütfen geçerli ve yaygın bir e-posta sağlayıcısı kullanın.';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'outlook.com.tr',
  'yahoo.com',
  'icloud.com',
  'yandex.com',
  'yandex.com.tr',
  'proton.me',
  'protonmail.com',
  'live.com',
  'msn.com',
  'mail.com',
  'sirket.com',
]);

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

export function isTrustedDomain(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.trim().split('@').pop()?.toLowerCase();
  if (!domain) return false;
  return TRUSTED_EMAIL_DOMAINS.has(domain);
}

export type RegistrationFieldErrors = FieldErrors;
export type RegistrationInput = SignUpInput;

export function validateRegistration(
  input: SignUpInput,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.name || !input.name.trim()) {
    errors.name = 'Ad zorunludur.';
  }

  if (!input.email || !input.email.trim()) {
    errors.email = 'E-posta zorunludur.';
  } else if (!isValidEmail(input.email)) {
    errors.email = INVALID_EMAIL_FORMAT_MESSAGE;
  } else if (!isTrustedDomain(input.email)) {
    errors.email = UNTRUSTED_DOMAIN_MESSAGE;
  }

  if (!input.password) {
    errors.password = 'Şifre zorunludur.';
  } else if (input.password.length < 8) {
    errors.password = PASSWORD_LENGTH_ERROR_MESSAGE;
  }

  if (!input.consent) {
    errors.consent = CONSENT_ERROR_MESSAGE;
  }

  return errors;
}

export function validateLogin(
  input: LoginInput,
): Partial<Record<'email' | 'password', string>> {
  const errors: Partial<Record<'email' | 'password', string>> = {};

  if (!input.email || !input.email.trim()) {
    errors.email = 'E-posta zorunludur.';
  } else if (!isValidEmail(input.email)) {
    errors.email = INVALID_EMAIL_FORMAT_MESSAGE;
  }

  if (!input.password) {
    errors.password = 'Şifre zorunludur.';
  }

  return errors;
}

export function validateForgotPassword(
  email: string,
): string | undefined {
  if (!email || !email.trim()) {
    return 'E-posta zorunludur.';
  } else if (!isValidEmail(email)) {
    return INVALID_EMAIL_FORMAT_MESSAGE;
  }
  return undefined;
}
