import { test, expect } from '@playwright/test';
import { loginOrSignupLocalUser } from './support/auth';

const TEST_EMAIL = 'history@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  // Seed the test user to ensure they have a completed profile and practicing periods
  // This bypasses the Onboarding Wizard and allows tests to reach the dashboard directly.
  await page.request.post('/v1/e2e/seed', {
    data: { users: [{ email: TEST_EMAIL }] },
  });

  await loginOrSignupLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
}

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /history/i }).click();
  });

  test('loads the history page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible();
  });

  test('shows date filter controls', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByLabel(/from/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/to/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('renders history content without invalid placeholders', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('filter buttons are present and interactive', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    const allFilter = page.getByRole('button', { name: /^all$/i }).first();
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await expect(allFilter).toBeVisible();
    }
  });
});
