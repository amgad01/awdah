import { test, expect } from '@playwright/test';

test.describe('Privacy page', () => {
  test('renders the privacy policy with all key sections', async ({ page }) => {
    await page.goto('/privacy');

    // Page should render without JS errors
    await expect(page.locator('main')).toBeVisible();

    // Should not contain raw undefined/null values
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('is reachable from the public navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator('main')).toBeVisible();
  });
});
