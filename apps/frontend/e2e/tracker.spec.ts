import { test, expect } from '@playwright/test';
import { navigateFromShell, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'tracker@example.com';
const TEST_PASSWORD = 'TestPassword1!';

test.describe('Salah Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateFromShell(page, 'nav-salah');
    await expect(page).toHaveURL(/\/salah$/);
  });

  test('displays all five prayers', async ({ page }) => {
    await page.getByTestId('salah-tab-daily').click();
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const prayer of prayers) {
      await expect(page.getByTestId(`prayer-tile-${prayer}`).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('marks a prayer and shows it as logged', async ({ page }) => {
    const fajrRow = page.getByTestId('prayer-tile-fajr').first();
    const wasPressed = (await fajrRow.getAttribute('aria-pressed')) === 'true';

    if (wasPressed) {
      // Click the checkmark button inside the tile
      const checkBtn = fajrRow.locator('button');
      await checkBtn.click();
      await expect(page.getByRole('alert').filter({ hasText: /remove this entry/i })).toBeVisible({
        timeout: 5_000,
      });
    } else {
      await fajrRow.click();
      await expect(fajrRow).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
    }
  });

  test('navigates to previous day and back', async ({ page }) => {
    await page.getByTestId('salah-tab-qadaa').click();
    const prevBtn = page.getByTestId('day-nav-prev').first();
    let nextBtn = page.getByTestId('day-nav-next').first();

    // Today — next is disabled
    await expect(nextBtn).toBeDisabled();

    await prevBtn.click();
    // Now on yesterday — next should be enabled
    // Re-query nextBtn to ensure we have the latest element after re-render
    nextBtn = page.getByTestId('day-nav-next').first();
    await expect(nextBtn).toBeEnabled();

    await nextBtn.click({ force: true });
    // Back to today — next disabled again
    await expect(nextBtn).toBeDisabled();
  });
});

test.describe('Sawm Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateFromShell(page, 'nav-sawm');
    await expect(page).toHaveURL(/\/sawm$/);
  });

  test('shows fast log button', async ({ page }) => {
    await expect(page.getByTestId('sawm-log-button')).toBeVisible();
  });

  test('toggles a fast log', async ({ page }) => {
    const logBtn = page.getByTestId('sawm-log-button');
    const wasPressed = (await logBtn.getAttribute('aria-pressed')) === 'true';

    await logBtn.click();

    if (wasPressed) {
      await expect(page.getByRole('alert').filter({ hasText: /remove this entry/i })).toBeVisible({
        timeout: 5_000,
      });
    } else {
      await expect(logBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
    }
  });

  test('navigates to previous day', async ({ page }) => {
    const prevBtn = page.getByTestId('day-nav-prev').first();
    await prevBtn.click();
    // After navigating, the next button should be enabled
    await expect(page.getByTestId('day-nav-next').first()).toBeEnabled();
  });
});
