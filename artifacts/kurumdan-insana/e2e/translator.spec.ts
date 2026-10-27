import { expect, test } from '@playwright/test';

test.describe('Step 2: Jargon Translator Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('boş metin ile çeviriye basıldığında hata mesajı gösterir', async ({ page }) => {
    // Ensure textarea is empty
    await page.locator('#corporate-text').fill('');
    await page.getByRole('button', { name: 'İç Sese Çevir', exact: false }).click();

    await expect(page.getByTestId('status-translator')).toHaveText(
      'Lütfen çevrilecek bir kurumsal metin girin.'
    );
    await expect(page.getByTestId('card-translation-result')).not.toBeVisible();
  });

  test('Örnek Metin Yükle butonu kutuyu hazır kurumsal metinle doldurur', async ({ page }) => {
    const textarea = page.locator('#corporate-text');
    await textarea.fill('');

    // Click Örnek Metin Yükle
    await page.getByTestId('button-load-sample').click();

    // Verify textarea is not empty
    await expect(textarea).not.toHaveValue('');

    // Trigger error first, then click sample to see error cleared
    await textarea.fill('');
    await page.getByRole('button', { name: 'İç Sese Çevir', exact: false }).click();
    await expect(page.getByTestId('status-translator')).toBeVisible();

    await page.getByTestId('button-load-sample').click();
    await expect(page.getByTestId('status-translator')).not.toBeVisible();
    await expect(textarea).not.toHaveValue('');
  });

  test('ton seçim butonları (Samimi Kanka, Bıkkın Çalışan, Dürüst Yönetici) yan yana seçilebilir', async ({ page }) => {
    const btnKanka = page.getByTestId('button-tone-samimi-kanka');
    const btnBikkin = page.getByTestId('button-tone-bikkin-calisan');
    const btnYonetici = page.getByTestId('button-tone-durust-yonetici');

    await expect(btnKanka).toBeVisible();
    await expect(btnBikkin).toBeVisible();
    await expect(btnYonetici).toBeVisible();

    // Select Samimi Kanka
    await btnKanka.click();
    await expect(btnKanka).toHaveClass(/active/);
    await expect(btnBikkin).not.toHaveClass(/active/);

    // Select Dürüst Yönetici
    await btnYonetici.click();
    await expect(btnYonetici).toHaveClass(/active/);
    await expect(btnKanka).not.toHaveClass(/active/);

    // Select Bıkkın Çalışan
    await btnBikkin.click();
    await expect(btnBikkin).toHaveClass(/active/);
  });

  test('İç Sese Çevir butonuna basıldığında Kurumsal Cümle ve Gerçek İç Ses alanları görüntülenir', async ({ page }) => {
    const corporateSentence = 'Bir araya gelip hizalanalım, proaktif aksiyon alalım.';
    await page.locator('#corporate-text').fill(corporateSentence);

    // Select Samimi Kanka
    await page.getByTestId('button-tone-samimi-kanka').click();
    await page.getByRole('button', { name: 'İç Sese Çevir', exact: false }).click();

    // Result card appears
    const resultCard = page.getByTestId('card-translation-result');
    await expect(resultCard).toBeVisible();

    // Verify "Kurumsal Cümle" and "Gerçek İç Ses" labels
    await expect(resultCard.getByText('KURUMSAL CÜMLE')).toBeVisible();
    await expect(resultCard.getByText('GERÇEK İÇ SES')).toBeVisible();

    // Check sentence texts
    await expect(page.getByTestId('text-corporate-sentence')).toContainText(corporateSentence);
    const humanResult = page.getByTestId('text-translation-result');
    await expect(humanResult).not.toBeEmpty();
    await expect(humanResult).toContainText('Kanka');

    // Switch tone to Dürüst Yönetici on the fly and verify updated translation
    await page.getByTestId('button-tone-durust-yonetici').click();
    await expect(page.getByTestId('text-translation-result')).not.toContainText('Kanka');
  });

  test('sonuç kutusunun sağ üstündeki Kopyala butonu kopyalar ve geçici Kopyalandı! bildirimi verir', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByTestId('button-load-sample').click();
    await page.getByRole('button', { name: 'İç Sese Çevir', exact: false }).click();

    const copyBtn = page.getByTestId('button-copy-result');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toContainText('Kopyala');

    // Click copy button
    await copyBtn.click();

    // Should show temporary "Kopyalandı!" notification
    await expect(copyBtn).toContainText('Kopyalandı!');
  });
});
