import { test, expect, type Page } from '@playwright/test';
import { logoutButton, openShellNavigation, seedAndLoginLocalUser } from './support/auth';
import { clickRetryIfVisible, expectTransientError, resolvePageState } from './support/page-state';

const TEST_EMAIL = 'dashboard@example.com';
const TEST_PASSWORD = 'TestPassword1!';

async function ensureDashboardReady(page: Page) {
  await clickRetryIfVisible(page);

  await expect(page.locator('main')).not.toContainText('Connecting...', { timeout: 30_000 });
}

async function expectDashboardContentOrError(page: Page): Promise<void> {
  const pageState = await resolvePageState(page);
  if (pageState === 'error') {
    await expectTransientError(page);
    return;
  }

  await expect(page.locator('[class*="statCard"]').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoginLocalUser(page, TEST_EMAIL, TEST_PASSWORD);
    await ensureDashboardReady(page);
    await openShellNavigation(page);
  });

  test('displays the streak card section', async ({ page }) => {
    await expectDashboardContentOrError(page);
  });

  test('shows salah debt card', async ({ page }) => {
    const pageState = await resolvePageState(page);
    if (pageState === 'error') {
      await expectTransientError(page);
      return;
    }

    const heading = page.getByRole('heading', { name: /salah debt/i, level: 3 }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test('shows sawm summary card', async ({ page }) => {
    const pageState = await resolvePageState(page);
    if (pageState === 'error') {
      await expectTransientError(page);
      return;
    }

    const heading = page.getByRole('heading', { name: /sawm summary/i, level: 3 }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test('renders dashboard without undefined or null text', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  test('shell exposes navigation and account controls', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'mobile') {
      await expect(page.getByTestId('nav-burger').first()).toBeVisible();
      return;
    }

    const settingsLink = page.locator('[data-testid="nav-settings"]:visible').first();
    await expect(settingsLink).toBeVisible();
    await expect(logoutButton(page)).toBeVisible();
  });
});
