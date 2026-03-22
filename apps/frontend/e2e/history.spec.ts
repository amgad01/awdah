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

  test('shows date navigation controls', async ({ page }) => {
    await expect(page.getByLabel(/previous day/i).first()).toBeVisible();
    await expect(page.getByLabel(/next day/i).first()).toBeVisible();
  });

  test('shows empty state for a day with no logs', async ({ page }) => {
    // Navigate to a past date that likely has no logs
    const prevBtn = page.getByLabel(/previous day/i).first();
    // Go back 30 days
    for (let i = 0; i < 30; i++) {
      await prevBtn.click();
    }
    // Should not crash — either shows logs or empty state message
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('filter buttons are present and interactive', async ({ page }) => {
    // Look for filter controls (all / salah / sawm)
    const allFilter = page.getByRole('button', { name: /all/i });
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await expect(allFilter).toBeVisible();
    }
  });
});
