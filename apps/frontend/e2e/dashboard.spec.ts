import { test, expect } from '@playwright/test';
import { logoutButton, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'dashboard@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page
      .getByTestId('nav-burger')
      .first()
      .evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
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
    const settingsLink = page.locator('[data-testid="nav-settings"]:visible').first();
    await expect(settingsLink).toBeVisible();

    // Logout button should be present in the shell
    const logoutBtn = logoutButton(page);
    await expect(logoutBtn).toBeAttached();
  });
});
