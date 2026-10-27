import { useState, useEffect, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  LogOut,
  X,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { authService } from '@/auth/authService';
import type { User, UserRole } from '@/auth/types';

export function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add User Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = () => {
    const list = authService.adminGetUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();

    const handleUpdate = () => loadUsers();
    window.addEventListener('auth_users_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('auth_users_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const handleToggleBan = (targetUser: User) => {
    const res = authService.adminToggleBanUser(targetUser.id);
    if (!res.success) {
      showNotification('error', res.error || 'İşlem gerçekleştirilemedi.');
      return;
    }
    const actionText = res.newStatus === 'banned' ? 'askıya alındı' : 'aktifleştirildi';
    showNotification('success', `${targetUser.name} (${targetUser.email}) hesabı başarıyla ${actionText}.`);
    loadUsers();
  };

  const handleDeleteUser = (targetUser: User) => {
    if (!window.confirm(`${targetUser.name} (${targetUser.email}) kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }
    const res = authService.adminDeleteUser(targetUser.id);
    if (!res.success) {
      showNotification('error', res.error || 'Kullanıcı silinemedi.');
      return;
    }
    showNotification('success', `${targetUser.name} kullanıcısı sistemden başarıyla silindi.`);
    loadUsers();
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    const res = authService.adminCreateUser({
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setModalError(res.error || 'Kullanıcı eklenirken bir hata oluştu.');
      return;
    }

    showNotification('success', `${newName} kullanıcısı başarıyla sisteme eklendi.`);
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setIsModalOpen(false);
    loadUsers();
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.role && u.role.toLowerCase().includes(query)) ||
      (u.status && u.status.toLowerCase().includes(query))
    );
  });

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status !== 'banned').length;
  const bannedUsersCount = users.filter((u) => u.status === 'banned').length;
  const adminUsersCount = users.filter((u) => u.role === 'admin' || u.email === 'admin@gmail.com').length;

  return (
    <main className="admin-shell site-shell" style={{ minHeight: '100dvh', backgroundColor: '#0D0F12' }}>
      <div className="wrap" style={{ paddingTop: '28px', paddingBottom: '80px' }}>
        {/* Admin Top Navigation */}
        <header className="topbar" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link className="brand" href="/" data-testid="link-home">
              <span className="brand-mark" aria-hidden="true">K</span>
              <span>KURUMDAN İNSANA</span>
            </Link>
            <span className="admin-tag-pill mono" data-testid="badge-admin-panel">
              <Shield size={11} />
              ADMIN PANEL
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="user-badge" data-testid="nav-user-name">
              <span className="user-badge-dot" style={{ backgroundColor: '#B8FF01' }} />
              {user?.name}
            </span>
            <Link className="quiet-btn" href="/" data-testid="link-admin-back-translator">
              <ArrowLeft size={13} />
              <span>Çevirmene Dön</span>
            </Link>
            <button
              className="logout-btn"
              type="button"
              onClick={handleLogout}
              data-testid="button-logout"
              title="Oturumu Güvenle Kapat"
            >
              <LogOut size={12} />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Global Action Notification */}
        {notification && (
          <div
            className={`admin-notification ${notification.type}`}
            role="status"
            data-testid="alert-admin-notification"
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} color="#B8FF01" />
            ) : (
              <AlertTriangle size={16} color="#ff6b6b" />
            )}
            <span>{notification.message}</span>
            <button
              type="button"
              className="admin-notification-close"
              onClick={() => setNotification(null)}
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Page Heading */}
        <section className="admin-header-section" aria-labelledby="admin-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div className="eyebrow mono" style={{ color: '#B8FF01' }}>
                KONTROL VE YÖNETİM MERKEZİ
              </div>
              <h1 id="admin-title" className="admin-title" data-testid="text-admin-title">
                Yönetici Paneli
              </h1>
              <p className="admin-subtitle">
                LocalStorage üzerinde kayıtlı tüm kullanıcıları denetle, askıya al, sil veya sisteme yeni hesap tanımla.
              </p>
            </div>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={() => {
                setModalError('');
                setIsModalOpen(true);
              }}
              data-testid="button-open-add-user"
            >
              <UserPlus size={15} />
              <span>Yeni Kullanıcı Ekle</span>
            </button>
          </div>
        </section>

        {/* Admin Metric Cards */}
        <section className="admin-metrics-grid" aria-label="Kullanıcı istatistikleri">
          <div className="admin-metric-card" data-testid="card-metric-total">
            <div className="metric-icon-wrap">
              <Users size={18} color="#B8FF01" />
            </div>
            <div>
              <div className="metric-label mono">TOPLAM KAYITLI</div>
              <div className="metric-value" data-testid="text-metric-total">{totalUsersCount}</div>
            </div>
          </div>

          <div className="admin-metric-card" data-testid="card-metric-active">
            <div className="metric-icon-wrap" style={{ background: 'rgba(184, 255, 1, 0.1)' }}>
              <ShieldCheck size={18} color="#B8FF01" />
            </div>
            <div>
              <div className="metric-label mono">AKTİF HESAP</div>
              <div className="metric-value" data-testid="text-metric-active">{activeUsersCount}</div>
            </div>
          </div>

          <div className="admin-metric-card" data-testid="card-metric-banned">
            <div className="metric-icon-wrap" style={{ background: 'rgba(255, 99, 99, 0.1)' }}>
              <ShieldAlert size={18} color="#ff6363" />
            </div>
            <div>
              <div className="metric-label mono">ASKIYA ALINAN</div>
              <div className="metric-value" style={{ color: '#ff7a7a' }} data-testid="text-metric-banned">
                {bannedUsersCount}
              </div>
            </div>
          </div>

          <div className="admin-metric-card" data-testid="card-metric-admin">
            <div className="metric-icon-wrap">
              <Shield size={18} color="#B8FF01" />
            </div>
            <div>
              <div className="metric-label mono">YÖNETİCİ SAYISI</div>
              <div className="metric-value">{adminUsersCount}</div>
            </div>
          </div>
        </section>

        {/* Users Table Card */}
        <section className="admin-card-surface" aria-labelledby="users-table-heading">
          <div className="admin-card-head">
            <div>
              <h2 id="users-table-heading" className="admin-card-title">
                Kayıtlı Kullanıcı Listesi ({filteredUsers.length})
              </h2>
              <span className="mono" style={{ fontSize: '11px', color: '#888982' }}>
                KAYNAK: window.localStorage ('kurumdan_insana_users_v1')
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="admin-search-wrap">
                <Search size={14} className="search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="İsim veya e-posta ara…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-admin-search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="quiet-btn"
                onClick={loadUsers}
                title="Listeyi Yenile"
                data-testid="button-refresh-users"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="admin-empty-state" data-testid="empty-users-state">
              <Users size={32} strokeWidth={1.5} color="#555650" />
              <h3>Kullanıcı Bulunamadı</h3>
              <p>Arama kriterlerinize uyan kullanıcı kaydı bulunmuyor.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table" data-testid="table-admin-users">
                <thead>
                  <tr>
                    <th>Kullanıcı Adı</th>
                    <th>E-posta</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th style={{ textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isCurrentAdmin = u.id === user?.id || u.email.toLowerCase() === 'admin@gmail.com';
                    const isBanned = u.status === 'banned';

                    return (
                      <tr key={u.id} data-testid={`row-user-${u.id}`}>
                        <td>
                          <div className="user-name-cell">
                            <span className="user-avatar-initial" aria-hidden="true">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong className="user-name-text">{u.name}</strong>
                              {isCurrentAdmin && (
                                <span className="current-user-tag mono">Mevcut Oturum</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mono user-email-text" data-testid={`text-email-${u.id}`}>
                            {u.email}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`role-pill mono ${u.role === 'admin' || u.email === 'admin@gmail.com' ? 'admin' : 'user'}`}
                            data-testid={`badge-role-${u.id}`}
                          >
                            {u.role === 'admin' || u.email === 'admin@gmail.com' ? 'YÖNETİCİ' : 'KULLANICI'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-pill mono ${isBanned ? 'banned' : 'active'}`}
                            data-testid={`badge-status-${u.id}`}
                          >
                            <span className="status-dot" aria-hidden="true" />
                            {isBanned ? 'ASKIDA (BAN)' : 'AKTİF'}
                          </span>
                        </td>
                        <td style={{ color: '#888982', fontSize: '12px' }} className="mono">
                          {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions">
                            {!isCurrentAdmin ? (
                              <>
                                {/* Ban / Unban Button */}
                                <button
                                  type="button"
                                  className={`action-btn-ban ${isBanned ? 'unban' : 'ban'}`}
                                  onClick={() => handleToggleBan(u)}
                                  data-testid={`button-ban-user-${u.id}`}
                                  title={isBanned ? 'Kullanıcı Engelini Kaldır' : 'Kullanıcıyı Askıya Al'}
                                >
                                  {isBanned ? (
                                    <>
                                      <ShieldCheck size={13} />
                                      <span>Aktifleştir</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldAlert size={13} />
                                      <span>Askıya Al</span>
                                    </>
                                  )}
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  className="action-btn-delete"
                                  onClick={() => handleDeleteUser(u)}
                                  data-testid={`button-delete-user-${u.id}`}
                                  title="Kullanıcıyı Tamamen Sil"
                                >
                                  <Trash2 size={13} />
                                  <span>Sil</span>
                                </button>
                              </>
                            ) : (
                              <span className="protected-admin-pill mono" title="Ana yönetici hesabı korumalıdır">
                                Korumalı
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Yeni Kullanıcı Ekle */}
        {isModalOpen && (
          <div
            className="admin-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-add-user-title"
            data-testid="modal-add-user"
          >
            <div className="admin-modal-card">
              <div className="admin-modal-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={18} color="#B8FF01" />
                  <h3 id="modal-add-user-title">Yeni Kullanıcı Oluştur</h3>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Kapat"
                  data-testid="button-modal-close"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="admin-modal-desc">
                Sisteme yönetici yetkisiyle doğrudan yeni kullanıcı hesabı ekleyin. Hesap anında LocalStorage'a yazılır.
              </p>

              {modalError && (
                <div className="auth-alert" role="alert" data-testid="alert-modal-error" style={{ marginBottom: '16px' }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCreateUser} noValidate className="auth-form">
                <div className="auth-field">
                  <label htmlFor="admin-add-name">Ad Soyad</label>
                  <input
                    id="admin-add-name"
                    type="text"
                    required
                    placeholder="Örn: Naz Karahan"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setModalError('');
                    }}
                    data-testid="input-admin-name"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="admin-add-email">E-posta</label>
                  <input
                    id="admin-add-email"
                    type="email"
                    required
                    placeholder="Örn: naz@gmail.com"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setModalError('');
                    }}
                    data-testid="input-admin-email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="admin-add-password">Şifre</label>
                  <input
                    id="admin-add-password"
                    type="password"
                    required
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setModalError('');
                    }}
                    data-testid="input-admin-password"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="admin-add-role">Kullanıcı Rolü</label>
                  <select
                    id="admin-add-role"
                    className="admin-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    data-testid="select-admin-role"
                  >
                    <option value="user">Standart Kullanıcı (user)</option>
                    <option value="admin">Yönetici (admin)</option>
                  </select>
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="quiet-btn"
                    onClick={() => setIsModalOpen(false)}
                    data-testid="button-modal-cancel"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="admin-primary-btn"
                    disabled={isSubmitting}
                    data-testid="button-modal-submit"
                  >
                    {isSubmitting ? 'Kaydediliyor…' : 'Kullanıcıyı Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
