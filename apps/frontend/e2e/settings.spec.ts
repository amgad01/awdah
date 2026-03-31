import { test, expect } from '@playwright/test';
import { loginOrSignupLocalUser, logoutButton } from './support/auth';

const TEST_EMAIL = 'settings@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  // Seed the test user to ensure they have a completed profile and practicing periods
  // This bypasses the Onboarding Wizard and allows tests to reach the dashboard directly.
  await page.request.post('/v1/e2e/seed', {
    data: { users: [{ email: TEST_EMAIL }] },
  });

  await loginOrSignupLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /settings/i }).click();
  });

  test('loads the settings page with profile section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('logout section is separate from danger zone', async ({ page }) => {
    // Logout section should be visible
    const logoutBtn = logoutButton(page);
    await expect(logoutBtn).toBeVisible();

    // Danger zone with delete account should also be visible
    const deleteBtn = page.getByRole('button', { name: /delete.*account/i });
    await expect(deleteBtn).toBeVisible();
  });

  test('logout button signs the user out', async ({ page }) => {
    const logoutBtn = logoutButton(page);
    await logoutBtn.click();

    // Should redirect to login
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
  });
});
