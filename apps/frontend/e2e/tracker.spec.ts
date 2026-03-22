import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'tracker@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.getByText(/welcome/i).waitFor({ timeout: 10_000 });
}

test.describe('Salah Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /salah/i }).click();
  });

  test('displays all five prayers', async ({ page }) => {
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const prayer of prayers) {
      await expect(page.getByRole('button', { name: new RegExp(prayer, 'i') })).toBeVisible();
    }
  });

  test('marks a prayer and shows it as logged', async ({ page }) => {
    const fajrBtn = page.getByRole('button', { name: /fajr/i });
    const wasPressed = (await fajrBtn.getAttribute('aria-pressed')) === 'true';

    await fajrBtn.click();
    // Toggle from current state
    const expectedState = !wasPressed;
    await expect(fajrBtn).toHaveAttribute('aria-pressed', String(expectedState), {
      timeout: 5_000,
    });
  });

  test('navigates to previous day and back', async ({ page }) => {
    const prevBtn = page.getByLabel(/previous day/i);
    const nextBtn = page.getByLabel(/next day/i);

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
    await expect(page.getByRole('button', { name: /log fast|fast logged/i })).toBeVisible();
  });

  test('toggles a fast log', async ({ page }) => {
    const logBtn = page.getByRole('button', { name: /log fast|fast logged/i });
    const wasPressed = (await logBtn.getAttribute('aria-pressed')) === 'true';

    await logBtn.click();
    const expectedState = !wasPressed;
    await expect(logBtn).toHaveAttribute('aria-pressed', String(expectedState), { timeout: 5_000 });
  });

  test('navigates to previous day', async ({ page }) => {
    const prevBtn = page.getByLabel(/previous day/i);
    await prevBtn.click();
    // After navigating, the next button should be enabled
    await expect(page.getByLabel(/next day/i)).toBeEnabled();
  });
});
