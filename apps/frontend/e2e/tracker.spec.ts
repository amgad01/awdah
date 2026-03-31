import { test, expect } from '@playwright/test';
import { loginOrSignupLocalUser } from './support/auth';

const TEST_EMAIL = 'tracker@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  // Seed the test user to ensure they have a completed profile and practicing periods
  // This bypasses the Onboarding Wizard and allows tests to reach the dashboard directly.
  await page.request.post('/v1/e2e/seed', {
    data: { users: [{ email: TEST_EMAIL }] },
  });

  await loginOrSignupLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
}

test.describe('Salah Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /salah/i }).click();
  });

  test('displays all five prayers', async ({ page }) => {
    await page.getByRole('tab', { name: /daily prayers/i }).click();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const prayer of prayers) {
      await expect(page.getByRole('button', { name: new RegExp(prayer, 'i') }).first()).toBeVisible(
        { timeout: 10_000 },
      );
    }
  });

  test('marks a prayer and shows it as logged', async ({ page }) => {
    const fajrRow = page.getByRole('button', { name: /fajr/i }).first();
    const wasPressed = (await fajrRow.getAttribute('aria-pressed')) === 'true';

    if (wasPressed) {
      // Click the checkmark button to trigger the uncheck confirmation
      const checkBtn = page.getByRole('button', { name: 'Remove Fajr', exact: true });
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
    await page.getByRole('tab', { name: /qadaa prayers/i }).click();
    const prevBtn = page.getByLabel(/previous day/i).first();
    const nextBtn = page.getByLabel(/next day/i).first();

    // Today — next is disabled
    await expect(nextBtn).toBeDisabled();

    await prevBtn.click();
    // Now on yesterday — next should be enabled
    await expect(nextBtn).toBeEnabled();

    await nextBtn.click();
    // Back to today — next disabled again
    await expect(nextBtn).toBeDisabled();
  });
});

test.describe('Sawm Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /sawm/i }).click();
  });

  test('shows fast log button', async ({ page }) => {
    await expect(
      page.getByRole('button', {
        name: /mark qadaa fast|qadaa fast logged|ramadan fast|ramadan fast logged/i,
      }),
    ).toBeVisible();
  });

  test('toggles a fast log', async ({ page }) => {
    const logBtn = page.getByRole('button', {
      name: /mark qadaa fast|qadaa fast logged|ramadan fast|ramadan fast logged/i,
    });
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
    const prevBtn = page.getByLabel(/previous day/i).first();
    await prevBtn.click();
    // After navigating, the next button should be enabled
    await expect(page.getByLabel(/next day/i).first()).toBeEnabled();
  });
});
