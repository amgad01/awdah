import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'settings@example.com';
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

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /settings/i }).click();
  });

  test('loads the settings page with profile section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('logout section is separate from danger zone', async ({ page }) => {
    // Logout section should be visible
    const logoutBtn = page.getByRole('button', { name: /sign out|log out|logout/i });
    await expect(logoutBtn.first()).toBeVisible();

    // Danger zone with delete account should also be visible
    const deleteBtn = page.getByRole('button', { name: /delete.*account/i });
    await expect(deleteBtn).toBeVisible();
  });

  test('logout button signs the user out', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /sign out|log out|logout/i });
    await logoutBtn.first().click();

    // Should redirect to login
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
  });
});
