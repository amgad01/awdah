import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Authentication', () => {
  test('shows login form on landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('registers a new account and lands on dashboard', async ({ page }) => {
    await page.goto('/');
    // Switch to register form
    await page.getByRole('link', { name: /create account|register|sign up/i }).click();
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(TEST_PASSWORD);
    // Some forms have a confirm password field
    const confirmField = page.getByLabel(/confirm/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill(TEST_PASSWORD);
    }
    await page.getByRole('button', { name: /create account|register|sign up/i }).click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
  });

  test('shows error for empty form submission', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('logs out and returns to login screen', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.getByText(/welcome/i).waitFor({ timeout: 10_000 });

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 5_000 });
  });
});
