import { test, expect } from '@playwright/test';
import {
  logoutCurrentUser,
  logoutButton,
  navigateFromShell,
  seedAndLoginLocalUser,
} from './support/auth';

const TEST_EMAIL = 'settings@example.com';
const TEST_PASSWORD = 'TestPassword1!';
const WRONG_PASSWORD = 'WrongPassword1!';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateFromShell(page, 'nav-settings');
  });

  test('loads the settings page with profile section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Invalid Hijri date format');
  });

  test('logout section is separate from danger zone', async ({ page }) => {
    // Logout section should be visible
    const logoutBtn = logoutButton(page);
    await expect(logoutBtn).toBeAttached();

    // Danger zone with delete account should also be visible
    const deleteBtn = page.getByTestId('delete-account-button');
    await deleteBtn.scrollIntoViewIfNeeded();
    await expect(deleteBtn).toBeVisible();
  });

  test('logout button signs the user out', async ({ page }) => {
    await logoutCurrentUser(page);

    // Should redirect to login
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 10_000 });
  });

  test('export flow requires password re-entry and rejects incorrect passwords', async ({
    page,
  }) => {
    await page.getByTestId('export-data-button').click();

    const passwordInput = page.getByLabel(/enter your password to download your data/i);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(WRONG_PASSWORD);

    const downloadPromise = page.waitForEvent('download', { timeout: 1500 }).catch(() => null);
    await page.getByRole('button', { name: /^confirm$/i }).click();

    await expect(page.getByTestId('settings-export-error')).toBeVisible();
    await expect(await downloadPromise).toBeNull();
  });

  for (const [label, testId, passwordLabel] of [
    ['reset prayers', 'reset-prayers-button', /enter your password/i],
    ['reset fasts', 'reset-fasts-button', /enter your password/i],
  ] as const) {
    test(`data reset (${label}) requires password re-entry and rejects incorrect passwords`, async ({
      page,
    }) => {
      const actionButton = page.getByTestId(testId);
      await actionButton.click();

      const passwordInput = page.getByLabel(passwordLabel);
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill(WRONG_PASSWORD);

      await page.getByRole('button', { name: /^confirm$/i }).click();

      await expect(page.getByTestId('settings-reset-error')).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(page.getByRole('button', { name: /^confirm$/i })).toBeVisible();
    });
  }

  test('account deletion requires password re-entry and rejects incorrect passwords', async ({
    page,
  }) => {
    await page.getByTestId('delete-account-button').click();

    const passwordInput = page.getByLabel(/enter your password to confirm/i);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(WRONG_PASSWORD);

    await page.getByRole('button', { name: /delete my account/i }).click();

    await expect(page.getByTestId('settings-delete-error')).toBeVisible();
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });
});
