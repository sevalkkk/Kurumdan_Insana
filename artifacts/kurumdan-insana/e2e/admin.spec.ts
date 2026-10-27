import { expect, test } from '@playwright/test';

test.describe.serial('Admin Panel Module (Yönetici Paneli)', () => {
  const adminUser = {
    email: 'admin@gmail.com',
    password: 'admin123',
    name: 'Sistem Yöneticisi',
  };

  const standardUser = {
    email: 'deniz@sirket.com',
    password: 'Password123!',
    name: 'Deniz Kaya',
  };

  test.beforeEach(async ({ page }) => {
    // Automatically accept confirm dialogs like delete user
    page.on('dialog', (dialog) => dialog.accept());

    // Reset session and users to clean state before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('kurumdan_insana_session_v1');
      localStorage.removeItem('kurumdan_insana_users_v1');
    });
  });

  // ----------------------------------------------------
  // 1. ADMIN CREDENTIALS & REDIRECTION
  // ----------------------------------------------------
  test('1. Admin Credentials: admin@gmail.com / admin123 ile giriş yapıldığında /admin paneline yönlendirilir', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill(adminUser.email);
    await page.locator('#login-password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    // Must be redirected specifically to the Admin Panel
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('[data-testid="text-admin-title"]')).toHaveText('Yönetici Paneli');
    await expect(page.locator('[data-testid="badge-admin-panel"]')).toBeVisible();

    // Check header displays admin indicators
    await expect(page.locator('[data-testid="nav-user-name"]')).toContainText(adminUser.name);
  });

  // ----------------------------------------------------
  // 2. ADMIN DASHBOARD FEATURES (USER TABLE, STATS)
  // ----------------------------------------------------
  test('2.1 Dashboard: Kayıtlı kullanıcı tablosu isim, e-posta ve durumları listeler', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.locator('#login-email').fill(adminUser.email);
    await page.locator('#login-password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/);

    // Verify user table and metrics exist
    await expect(page.locator('[data-testid="table-admin-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-metric-total"]')).toBeVisible();

    // Both admin and default seed user (Deniz Kaya) should be displayed
    await expect(page.getByText('admin@gmail.com')).toBeVisible();
    await expect(page.getByText('deniz@sirket.com')).toBeVisible();
  });

  test('2.2 Dashboard Action 1: Ban / Askıya Al işlemi kullanıcının durumunu günceller', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(adminUser.email);
    await page.locator('#login-password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/);

    // Find the ban button for standard user
    const standardUserRow = page.locator('tr').filter({ hasText: 'deniz@sirket.com' });
    await expect(standardUserRow).toBeVisible();

    // Status should initially be AKTİF
    await expect(standardUserRow.getByText('AKTİF')).toBeVisible();

    // Click "Askıya Al" button
    const banButton = standardUserRow.getByRole('button', { name: /Askıya Al/i });
    await banButton.click();

    // Check that success alert pops up
    await expect(page.locator('[data-testid="alert-admin-notification"]')).toContainText('askıya alındı');

    // Status pill should now show "ASKIDA (BAN)"
    await expect(standardUserRow.getByText('ASKIDA (BAN)')).toBeVisible();

    // Now verify that the banned user is blocked from logging in
    await page.locator('[data-testid="button-logout"]').click();
    await page.goto('/login');

    await page.locator('#login-email').fill(standardUser.email);
    await page.locator('#login-password').fill(standardUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    await expect(page.locator('[data-testid="alert-login-error"]')).toContainText('Hesabınız askıya alınmıştır');
  });

  test('2.3 Dashboard Action 1: Kullanıcı silme (Delete) işlemi kullanıcıyı sistemden kaldırır', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(adminUser.email);
    await page.locator('#login-password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/);

    const standardUserRow = page.locator('tr').filter({ hasText: 'deniz@sirket.com' });
    await expect(standardUserRow).toBeVisible();

    // Click "Sil" button (dialog handled in beforeEach)
    const deleteBtn = standardUserRow.getByRole('button', { name: /Sil/i });
    await deleteBtn.click();

    // Notification appears
    await expect(page.locator('[data-testid="alert-admin-notification"]')).toContainText('başarıyla silindi');

    // User should no longer exist in the table
    await expect(page.getByText('deniz@sirket.com')).not.toBeVisible();
  });

  test('2.4 Dashboard Action 2: Modal form ile sisteme yeni kullanıcı eklenir', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(adminUser.email);
    await page.locator('#login-password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/);

    // Open "Yeni Kullanıcı Ekle" modal
    await page.locator('[data-testid="button-open-add-user"]').click();
    await expect(page.locator('[data-testid="modal-add-user"]')).toBeVisible();

    // Fill new user details
    const newUserData = {
      name: 'Buse Yıldız',
      email: 'buse@gmail.com',
      password: 'SecretPassword123!',
    };

    await page.locator('[data-testid="input-admin-name"]').fill(newUserData.name);
    await page.locator('[data-testid="input-admin-email"]').fill(newUserData.email);
    await page.locator('[data-testid="input-admin-password"]').fill(newUserData.password);
    await page.locator('[data-testid="select-admin-role"]').selectOption('user');

    // Submit modal form
    await page.locator('[data-testid="button-modal-submit"]').click();

    // Modal closes and success notification appears
    await expect(page.locator('[data-testid="modal-add-user"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="alert-admin-notification"]')).toContainText('başarıyla sisteme eklendi');

    // Newly added user appears in the table
    const table = page.locator('[data-testid="table-admin-users"]');
    await expect(table.getByText(newUserData.name)).toBeVisible();
    await expect(table.getByText(newUserData.email)).toBeVisible();
  });

  // ----------------------------------------------------
  // 3. SECURITY & ROUTE PROTECTION
  // ----------------------------------------------------
  test('3.1 Security: Giriş yapmamış kullanıcı /admin adresine erişemez, /login sayfasına yönlendirilir', async ({ page }) => {
    // Attempt direct access to admin panel
    await page.goto('/admin');

    // Must be redirected to login page with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin/);
  });

  test('3.2 Security: Standart kullanıcı /admin adresine erişemez ve ana sayfaya yönlendirilir', async ({ page }) => {
    // Log in as regular user
    await page.goto('/login');
    await page.locator('#login-email').fill(standardUser.email);
    await page.locator('#login-password').fill(standardUser.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();

    // Standard user lands on translator (home)
    await expect(page).toHaveURL(/\/$/);

    // Standart user must NOT see the "Yönetici" navbar link
    await expect(page.locator('[data-testid="link-admin-panel"]')).not.toBeVisible();

    // Attempt direct navigation to /admin
    await page.goto('/admin');

    // Route guard must prevent access and bounce back to home screen
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-testid="text-hero-title"]')).toBeVisible();
  });
});
