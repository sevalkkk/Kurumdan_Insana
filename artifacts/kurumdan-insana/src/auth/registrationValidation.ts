export type RegistrationFieldErrors = Partial<
  Record<'name' | 'email' | 'password' | 'consent', string>
>;

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  consent: boolean;
}

export const DUPLICATE_EMAIL_MESSAGE =
  'Bu e-postayla bir hesap var. Giriş yapın.';

export function validateRegistration(
  input: RegistrationInput,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};

  if (!input.name.trim()) {
    errors.name = 'Ad zorunludur.';
  }

  if (!input.email.trim()) {
    errors.email = 'E-posta zorunludur.';
  }

  if (!input.password) {
    errors.password = 'Şifre zorunludur.';
  } else if (input.password.length < 8) {
    errors.password = 'Şifre en az 8 karakter olmalı.';
  }

  if (!input.consent) {
    errors.consent = 'Devam etmek için onay kutusunu işaretleyin.';
  }

  return errors;
}

function collectErrorText(error: unknown, depth = 0): string[] {
  if (depth > 3 || error == null) {
    return [];
  }

  if (typeof error === 'string') {
    return [error];
  }

  if (Array.isArray(error)) {
    return error.flatMap((item) => collectErrorText(item, depth + 1));
  }

  if (typeof error !== 'object') {
    return [];
  }

  const record = error as Record<string, unknown>;
  return [
    record.code,
    record.message,
    record.longMessage,
    record.errorMessage,
    ...collectErrorText(record.errors, depth + 1),
    ...collectErrorText(record.data, depth + 1),
  ].flatMap((value) => (typeof value === 'string' ? [value] : []));
}

export function isDuplicateEmailError(error: unknown): boolean {
  const message = collectErrorText(error).join(' ').toLowerCase();
  return /form_identifier_exists|identifier_exists|email_address_exists|already (exists|taken|in use)|email.{0,30}(exists|taken|in use)/.test(
    message,
  );
}
