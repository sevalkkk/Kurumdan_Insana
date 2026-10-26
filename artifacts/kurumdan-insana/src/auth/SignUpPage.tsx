import { useState, type FormEvent } from 'react';
import { useSignUp } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import {
  DUPLICATE_EMAIL_MESSAGE,
  isDuplicateEmailError,
  validateRegistration,
  type RegistrationFieldErrors,
} from './registrationValidation';

type SignupStep = 'details' | 'verification';

export function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<SignupStep>('details');
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const isBusy = fetchStatus === 'fetching';

  const getAuthErrorMessage = (error: unknown) => {
    if (isDuplicateEmailError(error) || signUp.isTransferable) {
      return DUPLICATE_EMAIL_MESSAGE;
    }
    return 'Kayıt tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.';
  };

  const completeRegistration = async () => {
    const { error } = await signUp.finalize();
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setLocation('/');
  };

  const sendVerificationCode = async () => {
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setStep('verification');
    setNotice('E-posta adresinize doğrulama kodu gönderdik.');
  };

  const onSubmitDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateRegistration({
      name,
      email,
      password,
      consent,
    });
    setFieldErrors(validationErrors);
    setFormError('');
    setNotice('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const { error } = await signUp.password({
      emailAddress: email.trim(),
      password,
      unsafeMetadata: { name: name.trim() },
      legalAccepted: true,
    });

    if (isDuplicateEmailError(error) || signUp.isTransferable) {
      setFormError(DUPLICATE_EMAIL_MESSAGE);
      return;
    }

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    if (signUp.status === 'complete') {
      await completeRegistration();
      return;
    }

    if (signUp.unverifiedFields.includes('email_address')) {
      await sendVerificationCode();
      return;
    }

    setFormError('Kayıt için gerekli ek bilgiler tamamlanamadı. Lütfen tekrar deneyin.');
  };

  const onSubmitVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setNotice('');

    if (!verificationCode.trim()) {
      setFormError('Doğrulama kodu zorunludur.');
      return;
    }

    const { error } = await signUp.verifications.verifyEmailCode({
      code: verificationCode.trim(),
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    if (signUp.status === 'complete') {
      await completeRegistration();
      return;
    }

    setFormError('E-posta doğrulaması tamamlanamadı. Kodu kontrol edip tekrar deneyin.');
  };

  const onResendCode = async () => {
    setFormError('');
    setNotice('');
    await sendVerificationCode();
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KURUMDAN İNSANA</span>
        </Link>

        {step === 'details' ? (
          <>
            <div className="auth-heading">
              <span className="auth-eyebrow mono">ÇEVİRMENİN ARKASINDAKİ İNSAN</span>
              <h1 id="signup-title">Kayıt Ol</h1>
              <p>Kurumsal cümleleri çevirmeye kaldığın yerden devam et.</p>
            </div>

            <form className="auth-form" noValidate onSubmit={onSubmitDetails}>
              <div className="auth-field">
                <label htmlFor="signup-name">Ad</label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, name: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                />
                {fieldErrors.name && <span className="auth-field-error" id="signup-name-error">{fieldErrors.name}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-email">E-posta</label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, email: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                />
                {fieldErrors.email && <span className="auth-field-error" id="signup-email-error">{fieldErrors.email}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-password">Şifre</label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'signup-password-error' : 'signup-password-hint'}
                />
                {fieldErrors.password ? (
                  <span className="auth-field-error" id="signup-password-error">{fieldErrors.password}</span>
                ) : (
                  <span className="auth-hint" id="signup-password-hint">En az 8 karakter.</span>
                )}
              </div>

              <div className="auth-consent-wrap">
                <label className="auth-consent" htmlFor="signup-consent">
                  <input
                    id="signup-consent"
                    name="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => {
                      setConsent(event.target.checked);
                      setFieldErrors((previous) => ({ ...previous, consent: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.consent)}
                    aria-describedby={fieldErrors.consent ? 'signup-consent-error' : undefined}
                  />
                  <span>Aydınlatma metnini okudum, bilgilerimin üyelik amacıyla işlenmesini onaylıyorum.</span>
                </label>
                {fieldErrors.consent && <span className="auth-field-error" id="signup-consent-error">{fieldErrors.consent}</span>}
              </div>

              {formError && (
                <div className="auth-alert" role="alert">
                  {formError === DUPLICATE_EMAIL_MESSAGE ? (
                    <>
                      <span>Bu e-postayla bir hesap var. </span>
                      <Link href="/sign-in">Giriş yapın.</Link>
                    </>
                  ) : formError}
                </div>
              )}
              {notice && <p className="auth-notice" role="status">{notice}</p>}

              <button className="auth-submit" type="submit" disabled={isBusy}>
                {isBusy ? 'Kaydediliyor…' : 'Kayıt Ol'}
                {!isBusy && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="auth-switch">
              Zaten hesabın var mı? <Link href="/sign-in">Giriş yap</Link>
            </p>
            <Link className="auth-back-link" href="/">← Çevirmen ana ekranına dön</Link>
          </>
        ) : (
          <>
            <div className="auth-heading">
              <span className="auth-eyebrow mono">SON BİR ADIM</span>
              <h1 id="signup-title">E-postanı doğrula</h1>
              <p><strong>{email.trim()}</strong> adresine gönderdiğimiz kodu gir.</p>
            </div>

            <form className="auth-form" noValidate onSubmit={onSubmitVerification}>
              <div className="auth-field">
                <label htmlFor="signup-code">Doğrulama kodu</label>
                <input
                  id="signup-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  aria-invalid={Boolean(formError)}
                />
              </div>
              {formError && <div className="auth-alert" role="alert">{formError}</div>}
              {notice && <p className="auth-notice" role="status">{notice}</p>}
              <button className="auth-submit" type="submit" disabled={isBusy}>
                {isBusy ? 'Doğrulanıyor…' : 'E-postayı doğrula'}
                {!isBusy && <span aria-hidden="true">→</span>}
              </button>
            </form>
            <button className="auth-resend" type="button" onClick={onResendCode} disabled={isBusy}>
              Kodu tekrar gönder
            </button>
            <button
              className="auth-back-link auth-back-button"
              type="button"
              onClick={() => {
                setStep('details');
                setFormError('');
                setNotice('');
              }}
            >
              ← Kayıt bilgilerine dön
            </button>
          </>
        )}
      </section>
    </main>
  );
}
