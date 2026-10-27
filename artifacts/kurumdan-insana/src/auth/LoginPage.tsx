import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read optional redirect URL from query string
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTarget = searchParams.get('redirect') || '/';

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const result = login({
      email,
      password,
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

    // If the user logs in as Admin, redirect specifically to Admin Panel
    if (result.user?.role === 'admin' || email.trim().toLowerCase() === 'admin@gmail.com') {
      setLocation('/admin');
      return;
    }

    // Redirect to main app screen (or redirect target)
    setLocation(redirectTarget);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link className="auth-brand" href="/" data-testid="link-brand-home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KURUMDAN İNSANA</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow mono">HESABINA ERİŞ</span>
          <h1 id="login-title">Giriş Yap</h1>
          <p>Kurumsal cümleleri insancaya çevirmeye devam et.</p>
        </div>

        <form className="auth-form" noValidate onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">E-posta</label>
            <input
              id="login-email"
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
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              data-testid="input-login-email"
            />
            {fieldErrors.email && (
              <span className="auth-field-error" id="login-email-error" data-testid="error-login-email">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="login-password">Şifre</label>
              <Link
                className="auth-link-forgot"
                href="/forgot-password"
                data-testid="link-forgot-password"
              >
                Şifremi Unuttum
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setFormError('');
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              data-testid="input-login-password"
            />
            {fieldErrors.password && (
              <span className="auth-field-error" id="login-password-error" data-testid="error-login-password">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {formError && (
            <div className="auth-alert" role="alert" id="login-form-error" data-testid="alert-login-error">
              {formError}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
            data-testid="button-login-submit"
          >
            {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-switch">
          Hesabın yok mu? <Link href="/sign-up" data-testid="link-sign-up">Kayıt Ol</Link>
        </p>

        <Link className="auth-back-link" href="/" data-testid="link-back-to-home">
          ← Çevirmen ana ekranına dön
        </Link>
      </section>
    </main>
  );
}
