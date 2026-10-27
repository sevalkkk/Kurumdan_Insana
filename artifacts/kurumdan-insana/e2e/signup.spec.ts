import { expect, test } from '@playwright/test';

test.describe.serial('User Management Module (Kullanıcı Yönetimi)', () => {
  const seedUser = {
    name: 'Deniz Kaya',
    email: 'deniz@sirket.com',
    password: 'Password123!',
  };

  test.beforeEach(async ({ page }) => {
    // Clear session before each test to guarantee consistent state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('kurumdan_insana_session_v1');
    });
  });

  // ----------------------------------------------------
  // 1. SIGN UP TESTS
  // ----------------------------------------------------
  test('1.1 Sign Up: Boş form gönderildiğinde zorunlu alan doğrulamaları tetiklenir', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-name-error')).toHaveText('Ad zorunludur.');
    await expect(page.locator('#signup-email-error')).toHaveText('E-posta zorunludur.');
    await expect(page.locator('#signup-password-error')).toHaveText('Şifre zorunludur.');
    await expect(page.locator('#signup-consent-error')).toHaveText('Devam etmek için onay kutusunu işaretleyin.');
  });

  test('1.2 Sign Up: 8 karakterden kısa şifrede "Şifre en az 8 karakter olmalı." mesajı gösterilir', async ({ page }) => {
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Mehmet Demir');
    await page.locator('#signup-email').fill('mehmet@gmail.com');
    await page.locator('#signup-password').fill('1234567'); // 7 characters
    await page.locator('#signup-consent').check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-password-error')).toHaveText('Şifre en az 8 karakter olmalı.');
  });

  test('1.3 Sign Up: Onay kutusu işaretlenmediğinde kayıt engellenir ve uyarı gösterilir', async ({ page }) => {
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Ayşe Yılmaz');
    await page.locator('#signup-email').fill('ayse@outlook.com');
    await page.locator('#signup-password').fill('GecerliSifre123!');
    // Ensure consent checkbox is unchecked
    await page.locator('#signup-consent').uncheck();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-consent-error')).toHaveText('Devam etmek için onay kutusunu işaretleyin.');
    // Check that we stay on the sign-up page
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test('1.4 Sign Up: Zaten kayıtlı bir e-posta girildiğinde doğru hata mesajı fırlatılır', async ({ page }) => {
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Kopya Hesap');
    await page.locator('#signup-email').fill(seedUser.email);
    await page.locator('#signup-password').fill('BaskaSifre123!');
    await page.locator('#signup-consent').check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-form-error')).toContainText(
      'Bu e-postayla bir hesap var. Giriş yapın.'
    );
  });

  test('1.5 Sign Up: Başarılı kayıt kullanıcıyı çevirmen ekranına yönlendirir ve oturumu başlatır', async ({ page }) => {
    const uniqueEmail = `yeni-${Date.now()}@gmail.com`;
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Burak Özdemir');
    await page.locator('#signup-email').fill(uniqueEmail);
    await page.locator('#signup-password').fill('TamGuvenli123!');
    await page.locator('#signup-consent').check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    // Directly redirects to Translator/Dashboard screen (/)
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByTestId('text-hero-title')).toBeVisible();

    // Dynamic navbar displays user name and Log Out button
    await expect(page.getByTestId('nav-user-name')).toContainText('Burak Özdemir');
    await expect(page.getByTestId('link-main-view')).toBeVisible();
    await expect(page.getByTestId('button-logout')).toBeVisible();
  });

  test('1.6 Sign Up: Yaygın sağlayıcılar (gmail.com vb.) kabul edilir; sahte alan adları ("@lksfdk.com") ve geçersiz dizgiler ("deneme") reddedilir', async ({ page }) => {
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Format Testi');
    await page.locator('#signup-password').fill('GecerliSifre123!');
    await page.locator('#signup-consent').check();

    // Case 1: Plain invalid string "deneme" (no @ or domain) -> syntax error
    await page.locator('#signup-email').fill('deneme');
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();
    await expect(page.locator('#signup-email-error')).toHaveText('Lütfen geçerli bir e-posta adresi girin.');
    await expect(page).toHaveURL(/\/sign-up$/);

    // Case 2: Fake or untrusted domain like "user@lksfdk.com" -> untrusted domain error
    await page.locator('#signup-email').fill('user@lksfdk.com');
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();
    await expect(page.locator('#signup-email-error')).toHaveText(
      'Lütfen geçerli ve yaygın bir e-posta sağlayıcısı kullanın.'
    );
    await expect(page).toHaveURL(/\/sign-up$/);

    // Case 3: Valid trusted provider email like "whfkjwehsdf@gmail.com" successfully passes and signs up
    const validRandomEmail = `whfkjwehsdf-${Date.now()}@gmail.com`;
    await page.locator('#signup-email').fill(validRandomEmail);
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    // Successfully redirects to home translator
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByTestId('nav-user-name')).toContainText('Format Testi');
  });

  // ----------------------------------------------------
  // 2. LOG IN & SESSION TESTS
  // ----------------------------------------------------
  test('2.1 Log In: Boş form gönderildiğinde zorunlu alan doğrulamaları tetiklenir', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    await expect(page.locator('#login-email-error')).toHaveText('E-posta zorunludur.');
    await expect(page.locator('#login-password-error')).toHaveText('Şifre zorunludur.');
  });

  test('2.2 Log In: Geçersiz kimlik bilgilerinde güvenli jenerik hata mesajı ("E-posta veya şifre hatalı.") tetiklenir', async ({ page }) => {
    await page.goto('/login');

    // Case A: Existing email with wrong password
    await page.locator('#login-email').fill(seedUser.email);
    await page.locator('#login-password').fill('YanlisSifre999!');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    await expect(page.locator('#login-form-error')).toHaveText('E-posta veya şifre hatalı.');

    // Case B: Non-existent email receives the exact same generic error
    await page.locator('#login-email').fill('kayitli-olmayan@sirket.com');
    await page.locator('#login-password').fill('HerhangiBirSifre123!');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    await expect(page.locator('#login-form-error')).toHaveText('E-posta veya şifre hatalı.');
  });

  test('2.3 Log In: Başarılı giriş gezinme çubuğunu dinamik olarak günceller (kullanıcı adı, ana ekran ve Log Out)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(seedUser.email);
    await page.locator('#login-password').fill(seedUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    // Redirects to main view
    await expect(page).toHaveURL(/\/?$/);

    // Dynamic navbar checks:
    // 1. Shows user name
    await expect(page.getByTestId('nav-user-name')).toBeVisible();
    await expect(page.getByTestId('nav-user-name')).toContainText(seedUser.name);

    // 2. Shows main view link
    await expect(page.getByTestId('link-main-view')).toBeVisible();
    await expect(page.getByTestId('link-main-view')).toHaveText('Çevirmen');

    // 3. Shows Log Out button
    await expect(page.getByTestId('button-logout')).toBeVisible();
  });

  test('2.4 Route Protection: Kimliği doğrulanmamış kullanıcıların korumalı sayfalara erişimini engeller ve login sayfasına yönlendirir', async ({ page }) => {
    // Attempt direct access to protected /history page
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fhistory$/);

    // Attempt direct access to protected /tools page
    await page.goto('/tools');
    await expect(page).toHaveURL(/\/login\?redirect=%2Ftools$/);
  });

  test('2.5 Log Out: "Log Out" butonu oturumu güvenle sonlandırır ve ana sayfaya döner', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.locator('#login-email').fill(seedUser.email);
    await page.locator('#login-password').fill(seedUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    await expect(page.getByTestId('button-logout')).toBeVisible();
    await expect(page.getByTestId('nav-user-name')).toContainText(seedUser.name);

    // Click Log Out button
    await page.getByTestId('button-logout').click();

    // Verify session terminated in localStorage
    const storedSession = await page.evaluate(() => localStorage.getItem('kurumdan_insana_session_v1'));
    expect(storedSession).toBeNull();

    // Dynamic navbar resets to logged out state
    await expect(page.getByTestId('link-login')).toBeVisible();
    await expect(page.getByTestId('link-sign-up')).toBeVisible();
    await expect(page.getByTestId('nav-user-name')).not.toBeVisible();
    await expect(page.getByTestId('button-logout')).not.toBeVisible();

    // Ensure home view is active
    await expect(page.getByTestId('text-hero-title')).toBeVisible();
  });

  test('2.6 Session Persistence: Sayfa yenilendiğinde (reload) oturum korunur ve şifreler LocalStorage\'ta hash olarak saklanır', async ({ page }) => {
    // 1. Sign up new user
    const persistEmail = `persist-${Date.now()}@gmail.com`;
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Gizem Yılmaz');
    await page.locator('#signup-email').fill(persistEmail);
    await page.locator('#signup-password').fill('GizemGuvenli123!');
    await page.locator('#signup-consent').check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    // Verify redirected to translator
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByTestId('nav-user-name')).toContainText('Gizem Yılmaz');

    // 2. Verify LocalStorage has hashed password, never plain text
    const usersInStorage = await page.evaluate(() => {
      const raw = localStorage.getItem('kurumdan_insana_users_v1');
      return raw ? JSON.parse(raw) : [];
    });
    const savedUser = usersInStorage.find((u: any) => u.email === persistEmail);
    expect(savedUser).toBeDefined();
    expect(savedUser.password).toBeUndefined();
    expect(savedUser.passwordHash).toBeDefined();
    expect(savedUser.passwordHash).toHaveLength(64); // Valid SHA-256 hex string
    expect(savedUser.passwordHash).not.toContain('GizemGuvenli123!');

    // 3. Reload the page
    await page.reload();

    // 4. Session must persist across reload
    await expect(page.getByTestId('nav-user-name')).toBeVisible();
    await expect(page.getByTestId('nav-user-name')).toContainText('Gizem Yılmaz');
    await expect(page.getByTestId('button-logout')).toBeVisible();
    await expect(page.getByTestId('link-main-view')).toBeVisible();
  });

  test('2.7 Log In: Geçersiz formatta ("deneme") hata verir, geçerli formatta ("whfkjwehsdf@gmail.com", "naz.com") biçim onaylanır', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-password').fill('HerhangiBirSifre123!');

    // Case 1: "deneme" (no @)
    await page.locator('#login-email').fill('deneme');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page.locator('#login-email-error')).toHaveText('Lütfen geçerli bir e-posta adresi girin.');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);

    // Case 2: "nodomain@" (no domain)
    await page.locator('#login-email').fill('nodomain@');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page.locator('#login-email-error')).toHaveText('Lütfen geçerli bir e-posta adresi girin.');

    // Case 3: Valid format like "whfkjwehsdf@gmail.com" or "user@naz.com" passes email validation and evaluates credentials
    await page.locator('#login-email').fill('whfkjwehsdf@gmail.com');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    // No email syntax error, proceeds to secure generic auth error
    await expect(page.locator('#login-email-error')).not.toBeVisible();
    await expect(page.locator('#login-form-error')).toHaveText('E-posta veya şifre hatalı.');
  });

  // ----------------------------------------------------
  // 3. FORGOT PASSWORD TESTS
  // ----------------------------------------------------
  test('3.1 Forgot Password: Boş e-posta ve format uyarısı verir, geçerli gönderimde gizlilik korumalı mesaj gösterir', async ({ page }) => {
    await page.goto('/forgot-password');

    // Empty email validation
    await page.getByRole('button', { name: 'Sıfırlama Bağlantısı Gönder', exact: true }).click();
    await expect(page.locator('#forgot-email-error')).toHaveText('E-posta zorunludur.');

    // Invalid format validation
    await page.locator('#forgot-email').fill('deneme');
    await page.getByRole('button', { name: 'Sıfırlama Bağlantısı Gönder', exact: true }).click();
    await expect(page.locator('#forgot-email-error')).toHaveText('Lütfen geçerli bir e-posta adresi girin.');

    // Registered email shows privacy message
    await page.locator('#forgot-email').fill(seedUser.email);
    await page.getByRole('button', { name: 'Sıfırlama Bağlantısı Gönder', exact: true }).click();
    await expect(page.locator('#forgot-status-message')).toHaveText(
      'Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi.'
    );

    // Unregistered email also shows exact same privacy message
    await page.locator('#forgot-email').fill('bilinmeyen@kurum.com');
    await page.getByRole('button', { name: 'Sıfırlama Bağlantısı Gönder', exact: true }).click();
    await expect(page.locator('#forgot-status-message')).toHaveText(
      'Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi.'
    );

    // Navigation back to login
    await expect(page.getByTestId('link-back-to-login')).toHaveAttribute('href', '/login');
  });
});
