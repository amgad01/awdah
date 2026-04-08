import { test, expect } from '@playwright/test';
import { loginLocalUser, logoutButton, registerLocalUser, submitLogin } from './support/auth';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Authentication', () => {
  test('shows login form on landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /login|sign in/i }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).last()).toBeVisible();
    await expect(page.getByLabel(/^password$/i).last()).toBeVisible();
  });

  test('opens the public learn page from landing', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('a[href="/learn"]')
      .first()
      .evaluate((element) => {
        (element as HTMLAnchorElement).click();
      });
    await expect(page).toHaveURL(/\/learn(\?lang=en)?$/);
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('registers a new account and lands on dashboard', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page).toHaveURL(/\//);
    await expect(page.getByLabel(/email/i).last()).toBeHidden({ timeout: 15_000 });
  });

  test('logs in with valid credentials', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await logoutButton(page).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await loginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page).toHaveURL(/\//);
    await expect(page.getByLabel(/email/i).last()).toBeHidden({ timeout: 15_000 });
  });

  test('shows error for empty form submission', async ({ page }) => {
    await page.goto('/');
    await submitLogin(page);
    await expect(page.locator('input:invalid')).toHaveCount(2);
  });

  test('logs out and returns to login screen', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);

    await logoutButton(page).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(page.getByLabel(/email/i).last()).toBeVisible({ timeout: 5_000 });
  });

  test('session survives page reload', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page.getByLabel(/email/i).last()).toBeHidden({ timeout: 15_000 });

    await page.reload();

    // After reload, the user should still be authenticated
    await expect(page.getByLabel(/email/i).last()).toBeHidden({ timeout: 15_000 });
  });
});
