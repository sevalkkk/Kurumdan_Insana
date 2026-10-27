import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Sparkles, ShieldAlert, Zap, Copy, Check } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

const excuses = [
  'Diğer departmanla acil bir senkronizasyon toplantım var, katılamayacağım.',
  'Müşteri tarafında canlı ortamda bloklayıcı bir case çıktı, oraya dahil olmam gerekiyor.',
  'Bu toplantıdaki gündem maddelerini asenkron olarak mail üzerinden takip etmem daha verimli olacak.',
  'Çeyrek sonu KPI raporlamasını yetiştirmem gerektiği için maalesef takvimim çakışıyor.',
  'Teknik borç temizliği için ayrılmış odaklanma (deep work) blokumdayım.',
];

export function ToolsPage() {
  const { user } = useAuth();
  const [excuse, setExcuse] = useState('');
  const [copiedExcuse, setCopiedExcuse] = useState(false);

  const [softenerInput, setSoftenerInput] = useState('');
  const [softenerOutput, setSoftenerOutput] = useState('');

  const [jargonInput, setJargonInput] = useState('');
  const [jargonScore, setJargonScore] = useState<number | null>(null);

  const generateExcuse = () => {
    const random = excuses[Math.floor(Math.random() * excuses.length)];
    setExcuse(random);
    setCopiedExcuse(false);
  };

  const copyExcuse = async () => {
    if (!excuse) return;
    try {
      await navigator.clipboard.writeText(excuse);
      setCopiedExcuse(true);
      setTimeout(() => setCopiedExcuse(false), 2000);
    } catch {
      // fallback
    }
  };

  const softenMail = () => {
    if (!softenerInput.trim()) return;
    setSoftenerOutput(
      `"Merhaba, konunun üzerinden tekrar geçip netleştirelim istedim. Zaman kısıtını göz önüne alarak önceliklendirmeyi birlikte yapabiliriz. Geri bildirimlerinizi bekliyorum."`
    );
  };

  const calculateJargon = () => {
    if (!jargonInput.trim()) return;
    const words = jargonInput.toLowerCase().split(/\s+/);
    const corporateBuzzwords = [
      'aksiyon',
      'hizalan',
      'sprint',
      'toplantı',
      'proaktif',
      'sinerji',
      'asenkron',
      'kpi',
      'onboard',
      'offboard',
      'pivot',
      'touchbase',
      'deadline',
      'feedback',
      'case',
      'eskalasyon',
      'brief',
      'update',
    ];
    let count = 0;
    words.forEach((w) => {
      if (corporateBuzzwords.some((buzz) => w.includes(buzz))) {
        count++;
      }
    });
    const percentage = Math.min(100, Math.round((count / Math.max(1, words.length)) * 100 * 2.5) || 18);
    setJargonScore(percentage);
  };

  return (
    <main className="site-shell" style={{ minHeight: '100dvh' }}>
      <div className="wrap" style={{ paddingTop: '36px', paddingBottom: '72px' }}>
        <header className="topbar" style={{ marginBottom: '40px' }}>
          <Link className="brand" href="/" data-testid="link-home">
            <span className="brand-mark" aria-hidden="true">K</span>
            <span>KURUMDAN İNSANA</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="user-badge" data-testid="nav-user-name">
              <span className="user-badge-dot" />
              {user?.name}
            </span>
            <Link className="quiet-btn" href="/" data-testid="link-back-translator">
              <ArrowLeft size={13} /> Çevirmene Dön
            </Link>
          </div>
        </header>

        <section aria-labelledby="tools-title">
          <div className="eyebrow mono">ÖZEL ÜYE MODÜLÜ</div>
          <h1 id="tools-title" style={{ margin: '10px 0 8px', fontSize: '36px', letterSpacing: '-0.04em' }}>
            Plaza Araçları
          </h1>
          <p style={{ color: '#92938c', margin: '0 0 32px', fontSize: '14px' }}>
            Toplantılardan kaçma, mail yumuşatma ve jargon yoğunluğunu ölçme araçları.
          </p>

          <div className="tools-grid">
            {/* Tool 1 */}
            <article className="tool-card" data-testid="tool-excuse-generator">
              <div className="tool-card-head">
                <div className="tool-icon">
                  <Zap size={18} />
                </div>
                <div>
                  <h3>Toplantı Kaçırma Bahanesi</h3>
                  <p>Gereksiz toplantılara katılmamak için meşru görünen kurumsal bahaneler.</p>
                </div>
              </div>
              <button className="auth-submit" style={{ width: '100%', marginTop: '16px' }} onClick={generateExcuse}>
                Rastgele Bahane Üret ➔
              </button>
              {excuse && (
                <div className="tool-result-box" data-testid="excuse-result">
                  <p>{excuse}</p>
                  <button className="quiet-btn" onClick={copyExcuse}>
                    {copiedExcuse ? <Check size={12} color="#b8ff01" /> : <Copy size={12} />}
                    {copiedExcuse ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              )}
            </article>

            {/* Tool 2 */}
            <article className="tool-card" data-testid="tool-mail-softener">
              <div className="tool-card-head">
                <div className="tool-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3>Pasif-Agresif Mail Yumuşatıcı</h3>
                  <p>Gergin veya sivri yazılmış mesajları profesyonelce yumuşatın.</p>
                </div>
              </div>
              <textarea
                className="tool-textarea"
                rows={3}
                placeholder="Örn: 'Bunu 3. kez yazıyorum, kimse okumuyor mu?'"
                value={softenerInput}
                onChange={(e) => setSoftenerInput(e.target.value)}
              />
              <button
                className="auth-submit"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={softenMail}
              >
                Mesajı Yumuşat ➔
              </button>
              {softenerOutput && (
                <div className="tool-result-box" data-testid="softener-result">
                  <p>{softenerOutput}</p>
                </div>
              )}
            </article>

            {/* Tool 3 */}
            <article className="tool-card" data-testid="tool-jargon-meter">
              <div className="tool-card-head">
                <div className="tool-icon">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3>Jargonmetre</h3>
                  <p>Metnindeki plaza dili ve buzzword yoğunluğunu yüzdelik olarak ölç.</p>
                </div>
              </div>
              <textarea
                className="tool-textarea"
                rows={3}
                placeholder="Örn: 'Proaktif olarak sprint başında hizalanıp KPI'larımızı güncelleyelim...'"
                value={jargonInput}
                onChange={(e) => setJargonInput(e.target.value)}
              />
              <button
                className="auth-submit"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={calculateJargon}
              >
                Jargon Yoğunluğunu Hesapla ➔
              </button>
              {jargonScore !== null && (
                <div className="tool-result-box" data-testid="jargon-result">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: '11px', color: '#b8ff01' }}>
                      JARGON YOĞUNLUĞU
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#b8ff01' }}>
                      %{jargonScore}
                    </span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#a5a69e' }}>
                    {jargonScore > 40
                      ? '⚠️ Tehlikeli seviye! Metniniz neredeyse tamamen plaza jargonu içeriyor. Derhal bir insana gösterin.'
                      : '✅ Kabul edilebilir seviye. Birkaç kurumsal kelime dışında hâlâ insan gibi konuşabiliyorsunuz.'}
                  </p>
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
