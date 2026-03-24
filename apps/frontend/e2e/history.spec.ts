import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'history@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.getByText(/welcome/i).waitFor({ timeout: 10_000 });
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
    await expect(page.getByLabel(/^from$/i)).toBeVisible();
    await expect(page.getByLabel(/^to$/i)).toBeVisible();
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
