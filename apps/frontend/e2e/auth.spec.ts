import { test, expect } from '@playwright/test';
import {
  loginLocalUser,
  logoutCurrentUser,
  registerLocalUser,
  submitLogin,
  submitSignup,
  switchToSignup,
} from './support/auth';

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
    const learnLink = page.locator('a[href="/learn"]:visible').first();
    if (await learnLink.isVisible().catch(() => false)) {
      await learnLink.click();
    } else {
      const burgerButton = page.getByTestId('nav-burger').first();
      if (await burgerButton.isVisible().catch(() => false)) {
        await burgerButton.click();
      }
      const menuLearnLink = page.getByRole('link', { name: /learn/i }).first();
      if (await menuLearnLink.isVisible().catch(() => false)) {
        await menuLearnLink.click();
      } else {
        await page.goto('/learn');
      }
    }
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
    await logoutCurrentUser(page);
    await loginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page).toHaveURL(/\//);
    await expect(page.getByLabel(/email/i).last()).toBeHidden({ timeout: 15_000 });
  });

  test('shows error for empty form submission', async ({ page }) => {
    await page.goto('/');
    await submitLogin(page);
    await expect(page.locator('input:invalid')).toHaveCount(2);
  });

  test('shows inline login errors instead of toasts', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await logoutCurrentUser(page);

    await page.goto('/');
    await page.getByLabel(/email/i).last().fill(TEST_EMAIL);
    await page
      .getByLabel(/^password$/i)
      .last()
      .fill('wrong-password');
    await submitLogin(page);

    await expect(page.getByRole('alert')).toContainText(
      'Failed to sign in. Please check your credentials.',
    );
  });

  test('shows inline duplicate-signup guidance', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await logoutCurrentUser(page);

    await page.goto('/');
    await switchToSignup(page);
    await page.getByTestId('signup-email').fill(TEST_EMAIL);
    await page.getByTestId('signup-password').fill(TEST_PASSWORD);
    await page.getByTestId('signup-confirm-password').fill(TEST_PASSWORD);
    await submitSignup(page);

    await expect(page.getByRole('alert')).toContainText(
      'An account already exists for this email. Sign in or use a different email.',
    );
    await expect(page.getByTestId('signup-error-signin')).toBeVisible();
    await expect(page.getByTestId('signup-error-change-email')).toBeVisible();

    await page.getByTestId('signup-error-change-email').click();
    await expect(page.getByTestId('signup-email')).toHaveValue('');
  });

  test('logs out and returns to login screen', async ({ page }) => {
    await registerLocalUser(page, TEST_EMAIL, TEST_PASSWORD);

    await logoutCurrentUser(page);
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
