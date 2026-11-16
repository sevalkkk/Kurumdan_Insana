import { useState, useMemo, type MouseEvent } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Bookmark,
  Building2,
  Calendar,
  Check,
  Clipboard,
  Compass,
  Flame,
  Heart,
  MessageSquareText,
  Search,
  Sparkles,
  User as UserIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { TONE_OPTIONS, type TranslationTone } from '@/translation';
import { isAdminRole, type TranslationHistoryItem } from '@/auth/types';
import { Shield } from 'lucide-react';

type SortOption = 'newest' | 'most_liked';

export function ExplorePage() {
  const {
    user,
    isAuthenticated,
    publishedTranslations,
    toggleLike,
    isLiked,
    toggleFavorite,
    isFavorited,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTone, setSelectedTone] = useState<'all' | TranslationTone>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authWarning, setAuthWarning] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sadece status == 'yayinda' olan çevirileri filtrele ve sırala
  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');

    const filtered = publishedTranslations.filter((item) => {
      if (item.status !== 'yayinda') return false;

      if (selectedTone !== 'all' && item.tone !== selectedTone) {
        return false;
      }

      if (query) {
        const corp = (item.corporateText || item.corporate || '').toLocaleLowerCase('tr-TR');
        const trans = (item.translatedText || item.human || '').toLocaleLowerCase('tr-TR');
        return corp.includes(query) || trans.includes(query);
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'most_liked') {
        const diff = (b.likeCount || 0) - (a.likeCount || 0);
        if (diff !== 0) return diff;
      }
      const dateA = a.publishedAt || a.createdAt || 0;
      const dateB = b.publishedAt || b.createdAt || 0;
      return dateB - dateA;
    });
  }, [publishedTranslations, searchQuery, selectedTone, sortBy]);

  const selectedItem: TranslationHistoryItem | null = useMemo(() => {
    if (!selectedId) return null;
    return publishedTranslations.find((t) => t.id === selectedId && t.status === 'yayinda') || null;
  }, [publishedTranslations, selectedId]);

  const handleLikeClick = (e: MouseEvent, item: TranslationHistoryItem) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setAuthWarning('Beğenmek veya kaydetmek için giriş yapın.');
      return;
    }
    setAuthWarning('');
    toggleLike(item.id);
  };

  const handleFavoriteClick = (e: MouseEvent, item: TranslationHistoryItem) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setAuthWarning('Beğenmek veya kaydetmek için giriş yapın.');
      return;
    }
    setAuthWarning('');
    toggleFavorite({
      translationId: item.id,
      corporateText: item.corporateText || item.corporate,
      translatedText: item.translatedText || item.human,
      tone: item.tone,
    });
  };

  const copyText = async (e: MouseEvent, id: string, text: string) => {
    e.stopPropagation();
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
      <div className="wrap" style={{ paddingTop: '36px', paddingBottom: '80px' }}>
        {/* Üst Gezinme Çubuğu */}
        <header className="topbar" style={{ marginBottom: '40px' }}>
          <Link className="brand" href="/" data-testid="link-home">
            <span className="brand-mark" aria-hidden="true">K</span>
            <span>KURUMDAN İNSANA</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <>
                <Link className="nav-text-link" href="/history" data-testid="link-history">
                  Çevirilerim
                </Link>
                {isAdminRole(user?.role, user?.email) && (
                  <Link className="nav-admin-link" href="/admin" data-testid="link-admin-panel">
                    <Shield size={12} />
                    <span>Yönetici Paneli</span>
                  </Link>
                )}
                <span className="user-badge" data-testid="nav-user-name">
                  <span className="user-badge-dot" />
                  {user?.name}
                </span>
              </>
            ) : (
              <>
                <Link className="login-link" href="/login" data-testid="link-login">
                  Log In
                </Link>
                <Link className="signup-link" href="/sign-up" data-testid="link-sign-up">
                  Sign Up
                </Link>
              </>
            )}
            <Link className="quiet-btn" href="/" data-testid="link-back-translator">
              <ArrowLeft size={13} /> Çevirmene Dön
            </Link>
          </div>
        </header>

        {/* Giriş Yapmamış Kullanıcı Etkileşim Uyarısı */}
        {authWarning && (
          <div
            role="alert"
            data-testid="alert-auth-required"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '10px',
              background: 'rgba(255, 107, 107, 0.12)',
              border: '1px solid rgba(255, 107, 107, 0.45)',
              color: '#ff9b9b',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} color="#ff6b6b" />
              <span>{authWarning}</span>
              <Link
                href="/login"
                style={{ color: '#b8ff01', textDecoration: 'underline', marginLeft: '6px' }}
                data-testid="link-alert-login"
              >
                Giriş Yap ➔
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setAuthWarning('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff9b9b',
                cursor: 'pointer',
              }}
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Sayfa Başlığı */}
        <section className="history-section" aria-labelledby="explore-title">
          <div className="history-header" style={{ marginBottom: '28px' }}>
            <div>
              <div className="eyebrow mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={13} /> TOPLULUK SÖZLÜĞÜ • HERKESE AÇIK AKIŞ
              </div>
              <h1
                id="explore-title"
                data-testid="text-explore-title"
                style={{ margin: '10px 0 8px', fontSize: '36px', letterSpacing: '-0.04em' }}
              >
                Keşfet (Topluluk Çevirileri)
              </h1>
              <p style={{ color: '#92938c', margin: 0, fontSize: '14px' }}>
                Çalışanların paylaştığı ve onaylanarak yayına alınan gerçek ofis iç sesleri.
              </p>
            </div>
          </div>

          {/* Arama, Ton Filtre Çipleri ve Sıralama Kontrol Barı */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px',
              marginBottom: '28px',
              borderRadius: '14px',
              background: 'rgba(20, 23, 18, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Üst Satır: Arama Kutusu ve Sıralama */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              {/* Anlık Arama Inputu */}
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888982',
                  }}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Kurumsal cümle veya iç ses çevirisi ara…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-explore-search"
                  aria-label="Kurumsal cümle veya iç ses çevirisi ara"
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 38px',
                    borderRadius: '10px',
                    background: 'rgba(11, 13, 10, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#f3f5ec',
                    fontSize: '13px',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                    data-testid="button-clear-search"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#888982',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sıralama Seçenekleri: En Yeni & En Çok Beğenilen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} role="group" aria-label="Sıralama">
                <span className="mono" style={{ fontSize: '11px', color: '#888982' }}>
                  SIRALA:
                </span>
                <button
                  type="button"
                  className={`quiet-btn ${sortBy === 'newest' ? 'active' : ''}`}
                  style={
                    sortBy === 'newest'
                      ? {
                          borderColor: '#b8ff01',
                          color: '#b8ff01',
                          background: 'rgba(184, 255, 1, 0.1)',
                        }
                      : undefined
                  }
                  onClick={() => setSortBy('newest')}
                  data-testid="sort-newest"
                >
                  <Calendar size={12} />
                  <span>En Yeni</span>
                </button>
                <button
                  type="button"
                  className={`quiet-btn ${sortBy === 'most_liked' ? 'active' : ''}`}
                  style={
                    sortBy === 'most_liked'
                      ? {
                          borderColor: '#b8ff01',
                          color: '#b8ff01',
                          background: 'rgba(184, 255, 1, 0.1)',
                        }
                      : undefined
                  }
                  onClick={() => setSortBy('most_liked')}
                  data-testid="sort-most-liked"
                >
                  <Flame size={12} />
                  <span>En Çok Beğenilen</span>
                </button>
              </div>
            </div>

            {/* Alt Satır: Ton Filtre Çipleri */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
              role="group"
              aria-label="Ton Filtresi"
            >
              <span className="mono" style={{ fontSize: '11px', color: '#888982', marginRight: '4px' }}>
                TON FİLTRESİ:
              </span>
              <button
                type="button"
                className={`example-chip ${selectedTone === 'all' ? 'active' : ''}`}
                style={
                  selectedTone === 'all'
                    ? {
                        borderColor: '#b8ff01',
                        color: '#b8ff01',
                        background: 'rgba(184, 255, 1, 0.12)',
                      }
                    : undefined
                }
                onClick={() => setSelectedTone('all')}
                data-testid="filter-tone-all"
              >
                Tümü
              </button>
              {TONE_OPTIONS.map((opt) => {
                const isSelected = selectedTone === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`example-chip ${isSelected ? 'active' : ''}`}
                    style={
                      isSelected
                        ? {
                            borderColor: '#b8ff01',
                            color: '#b8ff01',
                            background: 'rgba(184, 255, 1, 0.12)',
                          }
                        : undefined
                    }
                    onClick={() => setSelectedTone(opt.id)}
                    data-testid={`filter-tone-${opt.id}`}
                  >
                    <span aria-hidden="true">{opt.emoji}</span> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Çeviri Kartları Listesi */}
          {filteredAndSorted.length === 0 ? (
            <div className="history-empty" data-testid="empty-explore-state">
              <Compass size={36} strokeWidth={1.5} color="#555650" />
              <h3>Aramanıza uygun yayında çeviri bulunamadı</h3>
              <p>Farklı bir anahtar kelime deneyebilir veya ton filtresini "Tümü" olarak sıfırlayabilirsiniz.</p>
            </div>
          ) : (
            <div className="history-grid" data-testid="list-explore-items">
              {filteredAndSorted.map((item) => {
                const toneOption =
                  TONE_OPTIONS.find((t) => t.id === item.tone) || TONE_OPTIONS[1];
                const authorDisplay = item.isAnonymous
                  ? 'Anonim Çalışan'
                  : item.authorName || 'Plaza Çalışanı';
                const publishTimestamp = item.publishedAt || item.createdAt;
                const liked = isLiked(item.id);
                const favorited = isFavorited(item.id);

                return (
                  <article
                    className="history-card"
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{ cursor: 'pointer', transition: 'border-color 0.2s ease' }}
                    data-testid={`explore-card-${item.id}`}
                  >
                    {/* Kart Üst Barı: Ton Rozeti, Yazar, Yayınlanma Tarihi */}
                    <div className="history-card-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Ton Rozeti / İkonu */}
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: 'rgba(184, 255, 1, 0.1)',
                            border: '1px solid rgba(184, 255, 1, 0.35)',
                            color: '#b8ff01',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                          data-testid={`explore-tone-${item.id}`}
                        >
                          <span aria-hidden="true">{toneOption.emoji}</span>
                          <span>{toneOption.label}</span>
                        </span>

                        {/* Paylaşan Adı (E-posta asla görünmez) */}
                        <span
                          className="mono"
                          style={{
                            fontSize: '11px',
                            color: '#d4d5ce',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          data-testid={`explore-author-${item.id}`}
                        >
                          <UserIcon size={11} color="#888982" />
                          <span>{authorDisplay}</span>
                        </span>

                        {/* Yayınlanma Tarihi */}
                        <span
                          className="mono"
                          style={{ fontSize: '10px', color: '#777872' }}
                          data-testid={`explore-date-${item.id}`}
                        >
                          •{' '}
                          {new Date(publishTimestamp).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Etkileşim Düğmeleri: Beğeni (Kalp) ve Kaydet (Favori) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="quiet-btn"
                          style={
                            liked
                              ? {
                                  borderColor: 'rgba(255, 107, 107, 0.6)',
                                  color: '#ff6b6b',
                                  background: 'rgba(255, 107, 107, 0.12)',
                                }
                              : undefined
                          }
                          onClick={(e) => handleLikeClick(e, item)}
                          data-testid={`button-like-${item.id}`}
                          aria-pressed={liked}
                          title={liked ? 'Beğeniyi Geri Al' : 'Beğen'}
                        >
                          <Heart
                            size={13}
                            fill={liked ? '#ff6b6b' : 'none'}
                            color={liked ? '#ff6b6b' : 'currentColor'}
                          />
                          <span data-testid={`explore-like-count-${item.id}`}>
                            {item.likeCount || 0}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="quiet-btn"
                          style={
                            favorited
                              ? {
                                  borderColor: 'rgba(184, 255, 1, 0.55)',
                                  color: '#b8ff01',
                                  background: 'rgba(184, 255, 1, 0.1)',
                                }
                              : undefined
                          }
                          onClick={(e) => handleFavoriteClick(e, item)}
                          data-testid={`button-favorite-${item.id}`}
                          aria-pressed={favorited}
                          title={favorited ? 'Favorilerden Çıkar' : 'Favorilere Kaydet'}
                        >
                          <Bookmark
                            size={13}
                            fill={favorited ? '#b8ff01' : 'none'}
                            color={favorited ? '#b8ff01' : 'currentColor'}
                          />
                          <span>{favorited ? 'Kaydedildi' : 'Kaydet'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Kurumsal Cümle */}
                    <div className="history-corp-wrap">
                      <span className="mono" style={{ fontSize: '9px', color: '#ff6b6b' }}>
                        KURUMSAL CÜMLE:
                      </span>
                      <p className="history-corp-text" data-testid={`explore-corporate-${item.id}`}>
                        “{item.corporateText || item.corporate}”
                      </p>
                    </div>

                    {/* Gerçek İç Ses Çevirisi */}
                    <div className="history-human-wrap">
                      <span className="mono" style={{ fontSize: '9px', color: '#b8ff01' }}>
                        GERÇEK İÇ SES:
                      </span>
                      <p className="history-human-text" data-testid={`explore-translated-${item.id}`}>
                        {item.translatedText || item.human}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Çeviri Detay Modalı */}
        {selectedItem && (
          <div
            className="admin-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-detail-title"
            data-testid="modal-translation-detail"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="admin-modal-card"
              style={{ maxWidth: '580px', width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={17} color="#B8FF01" />
                  <h3 id="modal-detail-title">Topluluk Çevirisi Detayı</h3>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setSelectedId(null)}
                  aria-label="Kapat"
                  data-testid="button-close-detail-modal"
                >
                  <X size={16} />
                </button>
              </div>

              {(() => {
                const detailTone =
                  TONE_OPTIONS.find((t) => t.id === selectedItem.tone) || TONE_OPTIONS[1];
                const detailAuthor = selectedItem.isAnonymous
                  ? 'Anonim Çalışan'
                  : selectedItem.authorName || 'Plaza Çalışanı';
                const detailDate = selectedItem.publishedAt || selectedItem.createdAt;
                const detailLiked = isLiked(selectedItem.id);
                const detailFavorited = isFavorited(selectedItem.id);

                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginBottom: '16px',
                      }}
                    >
                      <span className="result-tone-pill mono" data-testid="modal-detail-tone">
                        <span>{detailTone.emoji}</span>
                        <span>{detailTone.label}</span>
                      </span>

                      <span className="mono" style={{ fontSize: '11px', color: '#a1a1aa' }} data-testid="modal-detail-author">
                        Paylaşan: <strong style={{ color: '#f3f5ec' }}>{detailAuthor}</strong> •{' '}
                        {new Date(detailDate).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="result-field-block" style={{ marginBottom: '14px' }}>
                      <div className="result-field-title corporate-label mono">
                        <Building2 size={12} /> KURUMSAL CÜMLE
                      </div>
                      <p className="result-corporate-text" data-testid="modal-detail-corporate">
                        “{selectedItem.corporateText || selectedItem.corporate}”
                      </p>
                    </div>

                    <div className="result-field-block" style={{ marginBottom: '18px' }}>
                      <div className="result-field-title human-label mono">
                        <MessageSquareText size={12} /> GERÇEK İÇ SES ÇEVİRİSİ
                      </div>
                      <p className="result-inner-voice-text" data-testid="modal-detail-translated">
                        {selectedItem.translatedText || selectedItem.human}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="quiet-btn"
                          style={
                            detailLiked
                              ? {
                                  borderColor: 'rgba(255, 107, 107, 0.6)',
                                  color: '#ff6b6b',
                                  background: 'rgba(255, 107, 107, 0.12)',
                                }
                              : undefined
                          }
                          onClick={(e) => handleLikeClick(e, selectedItem)}
                          data-testid="modal-button-like"
                        >
                          <Heart
                            size={13}
                            fill={detailLiked ? '#ff6b6b' : 'none'}
                            color={detailLiked ? '#ff6b6b' : 'currentColor'}
                          />
                          <span data-testid="modal-detail-like-count">
                            Beğen ({selectedItem.likeCount || 0})
                          </span>
                        </button>

                        <button
                          type="button"
                          className="quiet-btn"
                          style={
                            detailFavorited
                              ? {
                                  borderColor: 'rgba(184, 255, 1, 0.55)',
                                  color: '#b8ff01',
                                  background: 'rgba(184, 255, 1, 0.1)',
                                }
                              : undefined
                          }
                          onClick={(e) => handleFavoriteClick(e, selectedItem)}
                          data-testid="modal-button-favorite"
                        >
                          <Bookmark
                            size={13}
                            fill={detailFavorited ? '#b8ff01' : 'none'}
                            color={detailFavorited ? '#b8ff01' : 'currentColor'}
                          />
                          <span>{detailFavorited ? 'Favorilerde' : 'Favorilere Kaydet'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="quiet-btn"
                        onClick={(e) =>
                          copyText(
                            e,
                            selectedItem.id,
                            selectedItem.translatedText || selectedItem.human,
                          )
                        }
                        data-testid="modal-button-copy"
                      >
                        {copiedId === selectedItem.id ? (
                          <Check size={13} color="#b8ff01" />
                        ) : (
                          <Clipboard size={13} />
                        )}
                        <span>{copiedId === selectedItem.id ? 'Kopyalandı!' : 'Çeviriyi Kopyala'}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

