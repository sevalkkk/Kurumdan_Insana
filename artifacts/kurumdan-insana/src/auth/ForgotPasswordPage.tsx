import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useAuth } from './AuthContext';

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setStatusMessage('');
    setIsSubmitting(true);

    const result = forgotPassword(email);

    setIsSubmitting(false);

    if (!result.success) {
      if (result.fieldErrors?.email) {
        setEmailError(result.fieldErrors.email);
      }
      return;
    }

    // In all cases for privacy, show the exact same message
    setStatusMessage(result.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-title">
        <Link className="auth-brand" href="/" data-testid="link-brand-home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KURUMDAN İNSANA</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow mono">GÜVENLİ ERİŞİM</span>
          <h1 id="forgot-title">Şifremi Unuttum</h1>
          <p>Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.</p>
        </div>

        <form className="auth-form" noValidate onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">E-posta</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
                setStatusMessage('');
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              data-testid="input-forgot-email"
            />
            {emailError && (
              <span className="auth-field-error" id="forgot-email-error" data-testid="error-forgot-email">
                {emailError}
              </span>
            )}
          </div>

          {statusMessage && (
            <div
              className="auth-status-box"
              role="status"
              data-testid="status-forgot-password"
            >
              <span className="auth-status-icon" aria-hidden="true">✓</span>
              <span id="forgot-status-message">{statusMessage}</span>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
            data-testid="button-forgot-submit"
          >
            {isSubmitting ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <Link
          className="auth-back-link"
          href="/login"
          data-testid="link-back-to-login"
        >
          ← Giriş Ekranına Dön
        </Link>
      </section>
    </main>
  );
}
