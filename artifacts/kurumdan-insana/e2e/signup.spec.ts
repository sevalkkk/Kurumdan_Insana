import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test.describe.serial('Kayıt ol', () => {
  let registeredTestEmail = '';

  test('boş formda zorunlu alanları ve onayı bildirir', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-name-error')).toHaveText('Ad zorunludur.');
    await expect(page.locator('#signup-email-error')).toHaveText('E-posta zorunludur.');
    await expect(page.locator('#signup-password-error')).toHaveText('Şifre zorunludur.');
    await expect(page.locator('#signup-consent-error')).toHaveText(
      'Devam etmek için onay kutusunu işaretleyin.',
    );
  });

  test('8 karakterden kısa şifreyi reddeder', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Ad', { exact: true }).fill('Test Kullanıcı');
    await page.getByLabel('E-posta', { exact: true }).fill('short+clerk_test@example.com');
    await page.getByLabel('Şifre', { exact: true }).fill('1234567');
    await page.getByLabel(
      'Aydınlatma metnini okudum, bilgilerimin üyelik amacıyla işlenmesini onaylıyorum.',
    ).check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-password-error')).toHaveText(
      'Şifre en az 8 karakter olmalı.',
    );
  });

  test('onay kutusu seçilmeden kayda izin vermez', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Ad', { exact: true }).fill('Test Kullanıcı');
    await page.getByLabel('E-posta', { exact: true }).fill('no-consent+clerk_test@example.com');
    await page.getByLabel('Şifre', { exact: true }).fill('TestPass123!');
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.locator('#signup-consent-error')).toHaveText(
      'Devam etmek için onay kutusunu işaretleyin.',
    );
  });

  test('geliştirme test e-postasını doğrular ve çevirmen ana ekranına gider', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/sign-up');

    registeredTestEmail = `qa-${Date.now()}+clerk_test@example.com`;
    await page.getByLabel('Ad', { exact: true }).fill('Test Kullanıcı');
    await page.getByLabel('E-posta', { exact: true }).fill(registeredTestEmail);
    await page.getByLabel('Şifre', { exact: true }).fill('QAOnly-Password-845!');
    await page.getByLabel(
      'Aydınlatma metnini okudum, bilgilerimin üyelik amacıyla işlenmesini onaylıyorum.',
    ).check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();
    await page.getByLabel('Doğrulama kodu').fill('424242');
    await page.getByRole('button', { name: 'E-postayı doğrula', exact: true }).click();

    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:25993';
    await expect(page).toHaveURL(new URL('/', baseURL).toString());
    await expect(page.getByTestId('text-hero-title')).toBeVisible();
  });

  test('aynı e-posta ile tekrar kayıt isteğini reddeder', async ({ page }) => {
    test.skip(!registeredTestEmail, 'Önce başarılı test kaydı tamamlanmalı.');
    await setupClerkTestingToken({ page });
    await page.goto('/sign-up');
    await page.getByLabel('Ad', { exact: true }).fill('Tekrar Deneme');
    await page.getByLabel('E-posta', { exact: true }).fill(registeredTestEmail);
    await page.getByLabel('Şifre', { exact: true }).fill('AnotherPass-845!');
    await page.getByLabel(
      'Aydınlatma metnini okudum, bilgilerimin üyelik amacıyla işlenmesini onaylıyorum.',
    ).check();
    await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'Bu e-postayla bir hesap var. Giriş yapın.',
    );
  });
});
