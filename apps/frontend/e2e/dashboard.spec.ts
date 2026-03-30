import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'dashboard@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');

  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page
    .locator('form')
    .getByRole('button', { name: /sign in|login/i })
    .click();

  // If login fails because user doesn't exist in local registry, sign up first
  const error = page.getByText(/invalid|error/i);
  if (await error.isVisible({ timeout: 2000 })) {
    await page
      .getByRole('button', { name: /create account|register/i })
      .first()
      .click();
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(TEST_PASSWORD);
    const confirmField = page.getByLabel(/confirm/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill(TEST_PASSWORD);
    }
    await page
      .locator('form')
      .getByRole('button', { name: /sign up|register/i })
      .click();
  }

  // Wait for authenticated state (Logout button is a stable indicator)
  await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('displays the streak card section', async ({ page }) => {
    const streakSection = page.locator('[class*="statCard"]');
    await expect(streakSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows salah debt card', async ({ page }) => {
    await expect(page.getByText(/salah/i).first()).toBeVisible();
  });

  test('shows sawm summary card', async ({ page }) => {
    await expect(page.getByText(/sawm|fast/i).first()).toBeVisible();
  });

  test('renders dashboard without undefined or null text', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('navigation sidebar has settings and logout', async ({ page }) => {
    // Settings link should be in the sidebar
    const settingsLink = page.getByRole('link', { name: /settings/i });
    await expect(settingsLink).toBeVisible();

    // Logout button should be in the sidebar
    const logoutBtn = page.getByRole('button', { name: /sign out|log out|logout/i });
    await expect(logoutBtn.first()).toBeVisible();
  });
});
