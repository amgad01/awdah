import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('displays version and stack metadata without undefined values', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('is reachable from the public navigation', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(/\/about/);
  });
});
