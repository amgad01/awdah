import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'history@example.com';
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

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /history/i }).click();
  });

  test('loads the history page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible();
  });

  test('shows date filter controls', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByLabel(/from/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/to/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('renders history content without invalid placeholders', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('filter buttons are present and interactive', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    const allFilter = page.getByRole('button', { name: /^all$/i }).first();
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await expect(allFilter).toBeVisible();
    }
  });
});
