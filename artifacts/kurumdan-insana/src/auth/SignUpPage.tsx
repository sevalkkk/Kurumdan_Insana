import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from './AuthContext';
import { DUPLICATE_EMAIL_MESSAGE } from './registrationValidation';
import type { FieldErrors } from './types';

export function SignUpPage() {
  const { signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const result = signUp({
      name,
      email,
      password,
      consent,
    });

    setIsSubmitting(false);

    if (!result.success) {
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.error) {
        setFormError(result.error);
      }
      return;
    }

    // Redirect directly to the Translator/Dashboard screen
    setLocation('/');
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <Link className="auth-brand" href="/" data-testid="link-brand-home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KURUMDAN İNSANA</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow mono">HESAP OLUŞTUR</span>
          <h1 id="signup-title">Kayıt Ol</h1>
          <p>Kurumsal cümleleri çevirmeye kaldığın yerden devam et.</p>
        </div>

        <form className="auth-form" noValidate onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-name">Ad</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
              data-testid="input-signup-name"
            />
            {fieldErrors.name && (
              <span className="auth-field-error" id="signup-name-error" data-testid="error-signup-name">
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">E-posta</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                setFormError('');
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              data-testid="input-signup-email"
            />
            {fieldErrors.email && (
              <span className="auth-field-error" id="signup-email-error" data-testid="error-signup-email">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Şifre</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'signup-password-error' : 'signup-password-hint'}
              data-testid="input-signup-password"
            />
            {fieldErrors.password ? (
              <span className="auth-field-error" id="signup-password-error" data-testid="error-signup-password">
                {fieldErrors.password}
              </span>
            ) : (
              <span className="auth-hint" id="signup-password-hint">
                En az 8 karakter.
              </span>
            )}
          </div>

          <div className="auth-consent-wrap">
            <label className="auth-consent" htmlFor="signup-consent">
              <input
                id="signup-consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setFieldErrors((prev) => ({ ...prev, consent: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.consent)}
                aria-describedby={fieldErrors.consent ? 'signup-consent-error' : undefined}
                data-testid="checkbox-signup-consent"
              />
              <span>Aydınlatma metnini okudum, bilgilerimin üyelik amacıyla işlenmesini onaylıyorum.</span>
            </label>
            {fieldErrors.consent && (
              <span className="auth-field-error" id="signup-consent-error" data-testid="error-signup-consent">
                {fieldErrors.consent}
              </span>
            )}
          </div>

          {formError && (
            <div className="auth-alert" role="alert" id="signup-form-error" data-testid="alert-signup-error">
              {formError === DUPLICATE_EMAIL_MESSAGE ? (
                <>
                  <span>Bu e-postayla bir hesap var. </span>
                  <Link href="/login">Giriş yapın.</Link>
                </>
              ) : (
                formError
              )}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
            data-testid="button-signup-submit"
          >
            {isSubmitting ? 'Kaydediliyor…' : 'Kayıt Ol'}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabın var mı? <Link href="/login" data-testid="link-to-login">Giriş yap</Link>
        </p>
        <Link className="auth-back-link" href="/" data-testid="link-back-to-home">
          ← Çevirmen ana ekranına dön
        </Link>
      </section>
    </main>
  );
}
