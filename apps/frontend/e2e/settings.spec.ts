import { test, expect } from '@playwright/test';
import {
  logoutCurrentUser,
  logoutButton,
  navigateFromShell,
  openShellNavigation,
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
    await openShellNavigation(page);
    const logoutBtn = logoutButton(page);
    if (await logoutBtn.isVisible().catch(() => false)) {
      await expect(logoutBtn).toBeAttached();
    }

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
    await page.getByRole('button', { name: /download my data/i }).click();

    await expect(page.getByTestId('settings-export-error')).toBeVisible();
    await expect(await downloadPromise).toBeNull();
  });

  test('data reset (reset prayers) requires password re-entry and rejects incorrect passwords', async ({
    page,
  }) => {
    // First add a prayer log so the reset button is enabled
    await navigateFromShell(page, 'nav-salah');
    await expect(page).toHaveURL(/\/salah/);

    const dailyTab = page.getByTestId('salah-tab-daily');
    if (await dailyTab.isVisible().catch(() => false)) {
      await dailyTab.click();
    }

    await page
      .waitForSelector('[data-testid="prayer-tile-fajr"]', { timeout: 10_000 })
      .catch(() => null);

    const fajrRow = page.getByTestId('prayer-tile-fajr').first();
    if (await fajrRow.isVisible().catch(() => false)) {
      const wasPressed = (await fajrRow.getAttribute('aria-pressed')) === 'true';
      if (!wasPressed) {
        await fajrRow.click();
        await expect(fajrRow).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
      }
    }
    // Wait for query cache to be populated
    await page.waitForTimeout(1_000);

    await navigateFromShell(page, 'nav-settings');
    const actionButton = page.getByTestId('reset-prayers-button');
    await expect(actionButton).not.toBeDisabled({ timeout: 5000 });
    await actionButton.click();

    const passwordInput = page.getByLabel(/enter your password/i);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(WRONG_PASSWORD);

    await page.getByRole('button', { name: /^confirm$/i }).click();

    await expect(page.getByTestId('settings-prayers-error')).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(page.getByRole('button', { name: /^confirm$/i })).toBeVisible();
  });

  test('data reset (reset fasts) requires password re-entry and rejects incorrect passwords', async ({
    page,
  }) => {
    // First add a fast log so the reset button is enabled
    await navigateFromShell(page, 'nav-sawm');
    await expect(page).toHaveURL(/\/sawm/);

    await page
      .waitForSelector('[data-testid="sawm-log-button"]', { timeout: 10_000 })
      .catch(() => null);

    const fastBtn = page.getByTestId('sawm-log-button').first();
    if (await fastBtn.isVisible().catch(() => false)) {
      const wasPressed = (await fastBtn.getAttribute('aria-pressed')) === 'true';
      if (!wasPressed) {
        await fastBtn.click();
        await expect(fastBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
      }
    }
    // Wait for query cache to be populated
    await page.waitForTimeout(1_000);

    await navigateFromShell(page, 'nav-settings');
    const actionButton = page.getByTestId('reset-fasts-button');
    await expect(actionButton).not.toBeDisabled({ timeout: 5000 });
    await actionButton.click();

    const passwordInput = page.getByLabel(/enter your password/i);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(WRONG_PASSWORD);

    await page.getByRole('button', { name: /^confirm$/i }).click();

    await expect(page.getByTestId('settings-fasts-error')).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(page.getByRole('button', { name: /^confirm$/i })).toBeVisible();
  });

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
