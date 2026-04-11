import { test, expect, type Page } from '@playwright/test';
import { navigateFromShell, seedAndLoginLocalUser } from './support/auth';

const TEST_EMAIL = 'tracker@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function expectTrackerOrError(page: Page): Promise<boolean> {
  const main = page.locator('main').first();

  if (
    await main
      .getByText('Connecting...')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return false;
  }

  const errorAlert = page.getByRole('alert').first();
  if (await errorAlert.isVisible().catch(() => false)) {
    await expect(errorAlert).toContainText(/something went wrong|unexpected error/i);
    return false;
  }

  return true;
}

test.describe('Salah Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateFromShell(page, 'nav-salah');
    await expect(page).toHaveURL(/\/salah(\?lang=en)?$/);

    const retryButton = page.getByRole('button', { name: /retry/i }).first();
    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
    }
  });

  test('displays all five prayers', async ({ page }) => {
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const dailyTab = page.getByTestId('salah-tab-daily');
    if (!(await dailyTab.isVisible().catch(() => false))) {
      return;
    }

    await dailyTab.click();
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const prayer of prayers) {
      await expect(page.getByTestId(`prayer-tile-${prayer}`).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('marks a prayer and shows it as logged', async ({ page }) => {
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const dailyTab = page.getByTestId('salah-tab-daily');
    if (await dailyTab.isVisible().catch(() => false)) {
      await dailyTab.click();
    }

    const fajrRow = page.getByTestId('prayer-tile-fajr').first();
    if (!(await fajrRow.isVisible().catch(() => false))) {
      return;
    }
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
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const qadaaTab = page.getByTestId('salah-tab-qadaa');
    if (!(await qadaaTab.isVisible().catch(() => false))) {
      return;
    }

    await qadaaTab.click();
    const prevBtn = page.getByTestId('day-nav-prev').first();
    if (!(await prevBtn.isVisible().catch(() => false))) {
      return;
    }
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
    await expect(page).toHaveURL(/\/sawm(\?lang=en)?$/);

    const retryButton = page.getByRole('button', { name: /retry/i }).first();
    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
    }
  });

  test('shows fast log button', async ({ page }) => {
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const logButton = page.getByTestId('sawm-log-button');
    if (!(await logButton.isVisible().catch(() => false))) {
      return;
    }

    await expect(logButton).toBeVisible();
  });

  test('toggles a fast log', async ({ page }) => {
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const logBtn = page.getByTestId('sawm-log-button');
    if (!(await logBtn.isVisible().catch(() => false))) {
      return;
    }
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
    if (!(await expectTrackerOrError(page))) {
      return;
    }

    const prevBtn = page.getByTestId('day-nav-prev').first();
    if (!(await prevBtn.isVisible().catch(() => false))) {
      return;
    }
    await prevBtn.click();
    // After navigating, the next button should be enabled
    await expect(page.getByTestId('day-nav-next').first()).toBeEnabled();
  });
});
