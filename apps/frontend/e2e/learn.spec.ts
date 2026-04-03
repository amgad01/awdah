import { test, expect } from '@playwright/test';

test.describe('Learn page', () => {
  test('shows references for FAQ items and glossary entries', async ({ page }) => {
    await page.goto('/learn?lang=en');

    await expect(
      page
        .locator('#section-salah')
        .getByRole('link', { name: 'IslamWeb: missed prayers in Hanbali fiqh' }),
    ).toBeVisible();
    await expect(
      page.locator('#section-bulugh').getByRole('link', { name: 'Sahih al-Bukhari' }),
    ).toBeVisible();
    await expect(
      page.locator('#section-product').getByRole('link', { name: 'About Awdah' }),
    ).toBeVisible();
  });
});
