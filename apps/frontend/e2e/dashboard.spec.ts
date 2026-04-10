import { test, expect } from '@playwright/test';
import { logoutButton, openShellNavigation, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'dashboard@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await openShellNavigation(page);
  });

  test('displays the streak card section', async ({ page }) => {
    const streakSection = page.locator('[class*="statCard"]');
    await expect(streakSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows salah debt card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /salah debt/i })).toBeVisible();
  });

  test('shows sawm summary card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sawm summary/i })).toBeVisible();
  });

  test('renders dashboard without undefined or null text', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('shell exposes navigation and account controls', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'mobile') {
      await expect(page.getByTestId('nav-burger').first()).toBeVisible();
      await expect(page.getByText(/welcome back/i).first()).toBeVisible();
      return;
    }

    const settingsLink = page.locator('[data-testid="nav-settings"]:visible').first();
    await expect(settingsLink).toBeVisible();
    await expect(logoutButton(page)).toBeVisible();
  });
});
