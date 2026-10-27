import { useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  Clipboard,
  Clock3,
  Copy,
  HeartHandshake,
  LogOut,
  MessageSquareText,
  RotateCcw,
  Share2,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SignUpPage } from './auth/SignUpPage';
import { LoginPage } from './auth/LoginPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminRoute } from './auth/AdminRoute';
import { HistoryPage } from './pages/HistoryPage';
import { ToolsPage } from './pages/ToolsPage';
import { AdminPage } from './pages/AdminPage';
import NotFound from './pages/not-found';
import {
  SAMPLE_TEXTS,
  TONE_OPTIONS,
  translateText,
  type TranslationTone,
} from './translation';

const examples = [
  'Bir araya gelip hizalanalım',
  'Proaktif aksiyon alalım',
  'Bunu bir sonraki sprintte ele alalım',
  'Takvimlerimize davet düşüyorum',
];

const glossary = [
  { corporate: 'Bir araya gelip hizalanalım', human: 'Herkes aynı şeyi farklı anladı. Bir toplantı daha yapalım.' },
  { corporate: 'Proaktif aksiyon alalım', human: 'Sorun büyümeden bir şey yapalım, ne olduğu sonra belli olur.' },
  { corporate: 'Bunu bir sonraki sprintte ele alalım', human: 'Şu an uğraşmak istemiyorum. İki hafta sonra yine konuşuruz.' },
  { corporate: 'Takvimlerimize davet düşüyorum', human: 'Bu konuyu maille çözemeyiz diye hepinizin vaktini alacağım.' },
];

const audience = [
  'Toplantıdan Toplantıya Koşanlar',
  'Pasif-Agresif Mail Mağdurları',
  'Plaza Dilinden Bıkanlar',
];

const benefitItems = [
  { icon: <Clock3 size={16} strokeWidth={1.7} />, title: 'Zaman kazandırır', copy: 'Üç paragraf kurumsal mailin özünü tek cümlede yakala.' },
  { icon: <HeartHandshake size={16} strokeWidth={1.7} />, title: 'Kurumsal stresi azaltır', copy: 'Jargonu görünce gelen göz seğirmesine küçük bir mola.' },
  { icon: <MessageSquareText size={16} strokeWidth={1.7} />, title: 'Daha net iletişim', copy: 'İstenen şeyi dolambaçsız, anlaşılır hâle getir.' },
  { icon: <Sparkles size={16} strokeWidth={1.7} />, title: 'Daha samimi ofis dili', copy: 'İnsan gibi konuşmak için yönetim kurulu kararı gerekmez.' },
];

const faqs = [
  { question: 'Şirket maillerim kaydediliyor mu?', answer: 'Hayır. Yazdığınız metin yalnızca bu sayfada, tarayıcınızda işlenir; hiçbir yere gönderilmez veya kaydedilmez.' },
  { question: 'Ücretsiz mi?', answer: 'Evet. Kurumdan İnsana ücretsiz bir mini araçtır; kullanmak için hesap açmanız gerekmez.' },
  { question: 'Hangi tonlarda çeviri yapıyor?', answer: 'Samimi Kanka, Bıkkın Çalışan ve Dürüst Yönetici tonlarında; dürüst, esprili ve iç sesli tercüme üretir.' },
  { question: 'Kendi kurumsal cümlemi ekleyebilir miyim?', answer: 'Elbette. Metin alanına istediğiniz cümleyi yapıştırın ve dilediğiniz tonu seçerek anında iç sese dönüştürün.' },
];

const rawBase = import.meta.env.BASE_URL || '/';
const basePath = rawBase.replace(/\/$/, '');

function HomePage() {
  const { user, isAuthenticated, logout, saveTranslation, userHistory } = useAuth();
  const [, setLocation] = useLocation();

  const [input, setInput] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [result, setResult] = useState('');
  const [tone, setTone] = useState<TranslationTone>('bikkin-calisan');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const sampleIndexRef = useRef(0);

  const loadSample = () => {
    const nextSample = SAMPLE_TEXTS[sampleIndexRef.current % SAMPLE_TEXTS.length];
    sampleIndexRef.current += 1;
    setInput(nextSample);
    setErrorMessage('');
    textAreaRef.current?.focus();
  };

  const chooseExample = (text: string) => {
    setInput(text);
    setErrorMessage('');
    executeTranslation(text, tone);
  };

  const handleToneChange = (newTone: TranslationTone) => {
    setTone(newTone);
    if (submittedText.trim()) {
      const updated = translateText(submittedText.trim(), newTone);
      setResult(updated);
      if (isAuthenticated) {
        saveTranslation(submittedText.trim(), updated);
      }
    }
  };

  const executeTranslation = (textToTranslate = input, currentTone = tone) => {
    const clean = textToTranslate.trim();
    if (!clean) {
      setErrorMessage('Lütfen çevrilecek bir kurumsal metin girin.');
      setResult('');
      setSubmittedText('');
      textAreaRef.current?.focus();
      return;
    }

    setErrorMessage('');
    setIsTranslating(true);

    const translated = translateText(clean, currentTone);
    setResult(translated);
    setSubmittedText(clean);
    setIsTranslating(false);

    if (isAuthenticated) {
      saveTranslation(clean, translated);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    executeTranslation();
  };

  const newSentence = () => {
    setInput('');
    setSubmittedText('');
    setResult('');
    setErrorMessage('');
    textAreaRef.current?.focus();
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const shareOnX = () => {
    const shareText = `Kurumdan İnsana (${TONE_OPTIONS.find((t) => t.id === tone)?.label}): “${result}”`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const activeToneLabel = TONE_OPTIONS.find((t) => t.id === tone)?.label || 'Bıkkın Çalışan';

  return (
    <main className="site-shell">
      <section className="hero" id="cevir">
        <div className="wrap">
          <header className="topbar">
            <a className="brand" href="#cevir" aria-label="Kurumdan İnsana ana sayfa" data-testid="link-home">
              <span className="brand-mark" aria-hidden="true">K</span>
              <span>KURUMDAN İNSANA</span>
            </a>
            <nav className="top-nav" aria-label="Ana gezinme">
              <a href="#nasil-calisir" data-testid="link-about">Nasıl çalışır?</a>
              <a href="#sozluk" data-testid="link-glossary">Mini sözlük</a>

              {/* Dynamic Navbar: If not logged in, show Log In and Sign Up */}
              {!isAuthenticated ? (
                <>
                  <Link className="login-link" href="/login" data-testid="link-login">
                    Log In
                  </Link>
                  <Link className="signup-link" href="/sign-up" data-testid="link-sign-up">
                    Sign Up
                  </Link>
                </>
              ) : (
                /* Dynamic Navbar: If logged in, show the user's name, main app view, and Log Out button */
                <>
                  <Link className="nav-text-link" href="/" data-testid="link-main-view">
                    Çevirmen
                  </Link>
                  <Link className="nav-text-link" href="/history" data-testid="link-history">
                    Geçmiş {userHistory.length > 0 && <span className="nav-badge">{userHistory.length}</span>}
                  </Link>
                  <Link className="nav-text-link" href="/tools" data-testid="link-tools">
                    Araçlar
                  </Link>
                  {(user?.role === 'admin' || user?.email === 'admin@gmail.com') && (
                    <Link className="nav-admin-link" href="/admin" data-testid="link-admin-panel">
                      <Shield size={12} />
                      <span>Yönetici</span>
                    </Link>
                  )}
                  <span className="user-badge" data-testid="nav-user-name">
                    <span className="user-badge-dot" aria-hidden="true" />
                    {user?.name}
                  </span>
                  <button
                    className="logout-btn"
                    type="button"
                    onClick={handleLogout}
                    data-testid="button-logout"
                    title="Oturumu Güvenle Kapat"
                  >
                    <LogOut size={12} aria-hidden="true" />
                    <span>Log Out</span>
                  </button>
                </>
              )}

              <a className="top-link" href="#cevir" data-testid="link-translate">
                Cümlemi çevir <ArrowRight size={13} />
              </a>
            </nav>
          </header>

          <div className="hero-inner">
            <div className="eyebrow mono">Ofis jargonuna insan müdahalesi</div>
            <h1 data-testid="text-hero-title">Kurumdan<br /><span>İnsana.</span></h1>
            <p className="hero-copy">Toplantıdan sağ çıkmış cümleleri, insanların gerçekten söylediği hâle getir. Kısa, dürüst, biraz da iç sesli.</p>

            <div className="translator" aria-label="Kurumsal jargon çevirmeni">
              {/* Header with Load Sample Text button */}
              <div className="translator-head mono">
                <span>CÜMLEYİ BURAYA BIRAK</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="load-sample-btn"
                    data-testid="button-load-sample"
                    onClick={loadSample}
                    title="Hazır kurumsal örnek metin yükle"
                  >
                    <Sparkles size={12} />
                    <span>Örnek Metin Yükle</span>
                  </button>
                  <span className="live-indicator">
                    <i className="live-dot" aria-hidden="true" /> {isAuthenticated ? `hesap: ${user?.name}` : 'yerel işlem'}
                  </span>
                </div>
              </div>

              {/* Translation Form */}
              <form className="translate-form-vertical" noValidate onSubmit={onSubmit}>
                <label className="sr-only" htmlFor="corporate-text">Çevrilecek kurumsal metin</label>
                <textarea
                  ref={textAreaRef}
                  id="corporate-text"
                  data-testid="input-corporate-text"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      executeTranslation();
                    }
                  }}
                  placeholder="Örn: Proaktif aksiyon alıp konuyu bir sonraki sprintte ele alalım. Takvimlerinize davet düşüyorum."
                  rows={4}
                  maxLength={1000}
                />

                <div className="translator-foot">
                  <span>Hiçbir yere gönderilmez. Doğrudan tarayıcında işlenir.</span>
                  <span className="char-count" data-testid="text-character-count">{input.length} / 1000</span>
                </div>

                {/* Tone Selector Buttons: Samimi Kanka, Bıkkın Çalışan, Dürüst Yönetici */}
                <div className="tone-selector-container">
                  <div className="tone-selector-header mono">
                    <span>ÇEVİRİ TONU SEÇİMİ</span>
                    <span style={{ color: '#b8ff01' }}>Aktif: {activeToneLabel}</span>
                  </div>
                  <div className="tone-buttons-row" role="radiogroup" aria-label="Çeviri Tonu">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={tone === opt.id}
                        className={`tone-button ${tone === opt.id ? 'active' : ''}`}
                        data-testid={`button-tone-${opt.id}`}
                        onClick={() => handleToneChange(opt.id)}
                      >
                        <span className="tone-icon" aria-hidden="true">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validation Error Message */}
                {errorMessage && (
                  <div className="translator-error-banner" role="alert" data-testid="status-translator">
                    <AlertCircle size={15} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Translate Button: İç Sese Çevir */}
                <button
                  className="submit-btn"
                  style={{ width: '100%', marginTop: '16px', minHeight: '52px' }}
                  data-testid="button-translate"
                  type="submit"
                  disabled={isTranslating}
                >
                  {isTranslating ? 'İç Sese Dönüştürülüyor…' : 'İç Sese Çevir ➔'}
                  <span>CTRL + ENTER</span>
                </button>
              </form>

              {/* Sample Chips */}
              <div className="examples" aria-label="Hızlı deneme cümleleri">
                <span className="examples-label mono">HIZLI ÖRNEKLER</span>
                {examples.map((example, index) => (
                  <button
                    className="example-chip"
                    type="button"
                    key={example}
                    onClick={() => chooseExample(example)}
                    data-testid={`button-example-${index + 1}`}
                  >
                    {example}
                  </button>
                ))}
              </div>

              {/* Result Box */}
              {result && (
                <div className="result-box-wrapper" aria-live="polite" data-testid="card-translation-result">
                  <div className="result-box-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="result-tone-pill mono">
                        <Sparkles size={11} /> {activeToneLabel}
                      </span>
                      <span className="mono" style={{ fontSize: '10px', color: '#777c6d' }}>
                        AKILLI İÇ SES TERCÜMESİ
                      </span>
                    </div>

                    {/* Copy Button at Top-Right Corner of Result Box */}
                    <button
                      className={`result-copy-top-btn ${copied ? 'copied' : ''}`}
                      type="button"
                      onClick={copyResult}
                      data-testid="button-copy-result"
                      title="Tercüme metnini kopyala"
                    >
                      {copied ? <Check size={13} color="#11140b" /> : <Copy size={13} />}
                      <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
                    </button>
                  </div>

                  {/* Clearly Labeled: Kurumsal Cümle */}
                  <div className="result-field-block">
                    <div className="result-field-title corporate-label mono">
                      <Building2 size={12} /> KURUMSAL CÜMLE
                    </div>
                    <p className="result-corporate-text" data-testid="text-corporate-sentence">
                      “{submittedText}”
                    </p>
                  </div>

                  {/* Clearly Labeled: Gerçek İç Ses */}
                  <div className="result-field-block">
                    <div className="result-field-title human-label mono">
                      <MessageSquareText size={12} /> GERÇEK İÇ SES
                    </div>
                    <p className="result-inner-voice-text" data-testid="text-translation-result">
                      {result}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="result-footer-actions">
                    <div className="result-footer-left">
                      <button
                        className="quiet-btn"
                        type="button"
                        onClick={copyResult}
                        data-testid="button-copy-result-alt"
                      >
                        {copied ? <Check size={12} color="#b8ff01" /> : <Clipboard size={12} />}
                        {copied ? 'Kopyalandı!' : 'Metni Kopyala'}
                      </button>
                      <button
                        className="quiet-btn"
                        type="button"
                        onClick={shareOnX}
                        data-testid="button-share-x"
                      >
                        <Share2 size={12} /> X’te Paylaş
                      </button>
                      <button
                        className="quiet-btn"
                        type="button"
                        onClick={newSentence}
                        data-testid="button-new-sentence"
                      >
                        <RotateCcw size={12} /> Yeni Cümle
                      </button>
                    </div>

                    {isAuthenticated && (
                      <span className="result-saved-badge mono">
                        <Check size={12} /> Kişisel geçmişe kaydedildi
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="nasil-calisir">
        <div className="wrap">
          <div className="section-kicker mono"><b>01 /</b> NEDEN BÖYLE BİR ŞEY VAR?</div>
          <div className="section-heading">
            <h2>Çünkü bazen “<em>hizalanalım</em>” demek, sadece konuşmamız gerekiyor demek.</h2>
            <p>Plaza dili işin kendisinden daha uzun sürüyorsa, tercümanlık bizden. Jargonu alır, içimizden geçen cümleye yaklaştırırız.</p>
          </div>
          <div className="about-panel" data-testid="panel-about">
            <div className="about-stamp" aria-hidden="true"><div className="stamp-orbit" /><div className="stamp-type">İNSAN<small>İŞ YERİ DİLİ / SÖZLÜK NO. 01</small></div></div>
            <div className="about-copy">
              <p>Bu küçük araç, kurumsal cümlelerin arkasındaki asıl niyeti görünür kılmak için var. Biraz mizah, biraz iç ses; kimseyi değil, gereksiz jargonu hedef alıyor.</p>
              <p>Metniniz tarayıcınızdan dışarı çıkmaz. Tercüme burada, anında ve sadece sizin için yapılır.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="audience-title">
        <div className="wrap">
          <div className="section-kicker mono"><b>02 /</b> TANIDIK GELDİ Mİ?</div>
          <div className="section-heading">
            <h2 id="audience-title">Bu cümleler <em>bir yerden</em> tanıdık.</h2>
            <p>İş yerinde “tam olarak ne demek istiyor?” diye düşündüğün olduysa, doğru masadasın.</p>
          </div>
          <div className="audience-grid">
            {audience.map((title, index) => (
              <article className="audience-card" key={title} data-testid={`card-audience-${index + 1}`}>
                <span className="card-number">0{index + 1} / PLAZA GERÇEĞİ</span>
                <h3>{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="sozluk">
        <div className="wrap">
          <div className="section-kicker mono"><b>03 /</b> CEP SÖZLÜĞÜ</div>
          <div className="section-heading">
            <h2>Kurumsal cümle.<br /><em>İnsanca karşılığı.</em></h2>
            <p>Serbest çeviri. Akademik geçerliliği yok, toplantı sonrası geçerliliği yüksek.</p>
          </div>
          <div className="glossary-list" data-testid="list-glossary">
            {glossary.map((entry, index) => (
              <div className="glossary-row" key={entry.corporate} data-testid={`row-glossary-${index + 1}`}>
                <p className="glossary-corp">{entry.corporate}</p>
                <span className="glossary-arrow" aria-hidden="true">→</span>
                <p className="glossary-human">{entry.human}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-kicker mono"><b>04 /</b> KÜÇÜK BİR NEFES</div>
          <div className="section-heading">
            <h2>İş aynı iş.<br /><em>En azından cümleler net.</em></h2>
            <p>İş yerini bir anda değiştiremeyiz. Ama ne dendiğini daha hızlı anlayabiliriz.</p>
          </div>
          <div className="benefit-grid" data-testid="list-benefits">
            {benefitItems.map((benefit, index) => (
              <article className="benefit" key={benefit.title} data-testid={`card-benefit-${index + 1}`}>
                <div className="benefit-icon" aria-hidden="true">{benefit.icon}</div>
                <h3>{benefit.title}</h3>
                <p>{benefit.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="sss">
        <div className="wrap">
          <div className="section-kicker mono"><b>05 /</b> SIK SORULANLAR</div>
          <div className="section-heading">
            <h2>İçin rahat <em>olsun.</em></h2>
            <p>Gizlilik ve kullanım hakkında kısa, net cevaplar. Kurumsal dolambaç yok.</p>
          </div>
          <div className="faq-list" data-testid="list-faq">
            {faqs.map((faq, index) => (
              <details className="faq-item" key={faq.question} data-testid={`faq-item-${index + 1}`}>
                <summary data-testid={`faq-question-${index + 1}`}>{faq.question}</summary>
                <div className="faq-answer" data-testid={`faq-answer-${index + 1}`}>{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-main">
            <a className="brand" href="#cevir" data-testid="link-footer-home">
              <span className="brand-mark" aria-hidden="true">K</span>
              <span>KURUMDAN İNSANA</span>
            </a>
            <p className="footer-note">Kurumsal jargonun arasına sıkışmış gerçek cümlelere küçük bir tercüman. İnsan insana, arada toplantısız.</p>
            <a className="quiet-btn" href="#cevir" data-testid="link-footer-translate">Bir cümle çevir <ArrowDown size={13} /></a>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kurumdan İnsana</span>
            <span>Bu sayfa metninizi saklamaz. Cidden.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/kayit-ol" component={SignUpPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/sign-in" component={LoginPage} />
      <Route path="/giris-yap" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/sifremi-unuttum" component={ForgotPasswordPage} />
      <Route path="/history">{() => <ProtectedRoute component={HistoryPage} />}</Route>
      <Route path="/gecmis">{() => <ProtectedRoute component={HistoryPage} />}</Route>
      <Route path="/tools">{() => <ProtectedRoute component={ToolsPage} />}</Route>
      <Route path="/araclar">{() => <ProtectedRoute component={ToolsPage} />}</Route>
      <Route path="/admin">{() => <AdminRoute component={AdminPage} />}</Route>
      <Route path="/yonetici">{() => <AdminRoute component={AdminPage} />}</Route>
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
