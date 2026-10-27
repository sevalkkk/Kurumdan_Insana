import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Check, Clipboard, Trash2, Clock, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

export function HistoryPage() {
  const { user, userHistory, clearHistory } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
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

        <section className="history-section" aria-labelledby="history-title">
          <div className="history-header">
            <div>
              <div className="eyebrow mono">KİŞİSEL ARŞİV</div>
              <h1 id="history-title" style={{ margin: '10px 0 8px', fontSize: '36px', letterSpacing: '-0.04em' }}>
                Geçmiş Çevirilerim
              </h1>
              <p style={{ color: '#92938c', margin: 0, fontSize: '14px' }}>
                Giriş yapmışken çevirdiğin plaza cümleleri ve insanca karşılıkları.
              </p>
            </div>
            {userHistory.length > 0 && (
              <button
                className="quiet-btn"
                style={{ borderColor: 'rgba(255,100,100,0.3)', color: '#ff8888' }}
                onClick={clearHistory}
                data-testid="button-clear-history"
              >
                <Trash2 size={13} /> Geçmişi Temizle
              </button>
            )}
          </div>

          {userHistory.length === 0 ? (
            <div className="history-empty" data-testid="empty-history-state">
              <Clock size={36} strokeWidth={1.5} color="#555650" />
              <h3>Henüz kayıtlı çevirin yok</h3>
              <p>Çevirmen ana ekranında cümle çevirdikçe burada otomatik olarak saklanır.</p>
              <Link className="top-link" href="/" style={{ marginTop: '16px', display: 'inline-block' }}>
                Hemen Cümle Çevir ➔
              </Link>
            </div>
          ) : (
            <div className="history-grid" data-testid="list-history-items">
              {userHistory.map((item) => (
                <article className="history-card" key={item.id} data-testid={`history-item-${item.id}`}>
                  <div className="history-card-top">
                    <span className="mono" style={{ fontSize: '10px', color: '#777872' }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      className="quiet-btn"
                      onClick={() => copyText(item.id, item.human)}
                      data-testid={`button-copy-${item.id}`}
                    >
                      {copiedId === item.id ? <Check size={12} color="#b8ff01" /> : <Clipboard size={12} />}
                      {copiedId === item.id ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>

                  <div className="history-corp-wrap">
                    <span className="mono" style={{ fontSize: '9px', color: '#ff6b6b' }}>
                      PLAZA DİLİ:
                    </span>
                    <p className="history-corp-text">{item.corporate}</p>
                  </div>

                  <div className="history-human-wrap">
                    <span className="mono" style={{ fontSize: '9px', color: '#b8ff01' }}>
                      İÇ SES / TERCÜME:
                    </span>
                    <p className="history-human-text">{item.human}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
