import { test, expect } from '@playwright/test';

test.describe('Public auth routing', () => {
  test('opens signup directly from the auth query parameter', async ({ page }) => {
    await page.goto('/?auth=signup');
    await expect(page.getByTestId('signup-email')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('signup-confirm-password')).toBeVisible();
  });

  test('opens forgot-password directly from the auth query parameter', async ({ page }) => {
    await page.goto('/?auth=forgot');
    await expect(page.getByRole('heading', { name: /forgot|reset/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByLabel(/email/i).last()).toBeVisible();
  });

  test('public shell create-account CTA keeps signup view active', async ({ page }) => {
    await page.goto('/learn');
    await page
      .getByRole('link', { name: /create account|sign up/i })
      .last()
      .click();
    await expect(page).toHaveURL(/\/\?auth=signup$/);
    await expect(page.getByTestId('signup-email')).toBeVisible();
  });

  test('landing demo CTA opens the offline demo route', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /view demo|demo/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});
