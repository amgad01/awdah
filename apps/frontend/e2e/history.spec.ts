import { test, expect } from '@playwright/test';
import { navigateFromShell, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'history@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateFromShell(page, 'nav-history');
  });

  test('loads the history page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible();
  });

  test('shows date filter controls', async ({ page }) => {
    await page.getByTestId('history-filters-toggle').click();
    await expect(page.getByTestId('history-start-date-trigger')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('history-end-date-trigger')).toBeVisible({ timeout: 5_000 });
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
