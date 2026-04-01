import { test, expect } from '@playwright/test';
import { logoutButton, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'settings@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.getByTestId('nav-settings').click();
  });

  test('loads the settings page with profile section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('logout section is separate from danger zone', async ({ page }) => {
    // Logout section should be visible
    const logoutBtn = logoutButton(page);
    await expect(logoutBtn).toBeVisible();

    // Danger zone with delete account should also be visible
    const deleteBtn = page.getByTestId('delete-account-button');
    await deleteBtn.scrollIntoViewIfNeeded();
    await expect(deleteBtn).toBeVisible();
  });

  test('logout button signs the user out', async ({ page }) => {
    const logoutBtn = logoutButton(page);
    await logoutBtn.click();

    // Should redirect to login
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 10_000 });
  });
});
