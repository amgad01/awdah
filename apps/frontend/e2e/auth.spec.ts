import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Authentication', () => {
  test('shows login form on landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('opens the public learn page from landing', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/learn"]').first().click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('registers a new account and lands on dashboard', async ({ page }) => {
    await page.goto('/');
    // Switch to register form
    await page
      .getByRole('button', { name: /create account|register/i })
      .first()
      .click();
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
    await page
      .locator('form')
      .getByRole('button', { name: /sign up|register/i })
      .click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page
      .locator('form')
      .getByRole('button', { name: /sign in|login/i })
      .click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('shows error for empty form submission', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('form')
      .getByRole('button', { name: /sign in|login/i })
      .click();
    await expect(page.locator('input:invalid')).toHaveCount(2);
  });

  test('logs out and returns to login screen', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page
      .locator('form')
      .getByRole('button', { name: /sign in|login/i })
      .click();
    await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page.getByRole('heading', { name: /login|sign in/i }).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
