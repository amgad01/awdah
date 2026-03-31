import { test, expect } from '@playwright/test';
import { loginOrSignupLocalUser, logoutButton } from './support/auth';

const TEST_EMAIL = 'dashboard@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  // Seed the test user to ensure they have a completed profile and practicing periods
  // This bypasses the Onboarding Wizard and allows tests to reach the dashboard directly.
  await page.request.post('/v1/e2e/seed', {
    data: { users: [{ email: TEST_EMAIL }] },
  });

  await loginOrSignupLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
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
    const settingsLink = page.getByRole('link', { name: /settings/i });
    await expect(settingsLink).toBeVisible();

    // Logout button should be in the sidebar
    const logoutBtn = logoutButton(page);
    await expect(logoutBtn).toBeVisible();
  });
});
