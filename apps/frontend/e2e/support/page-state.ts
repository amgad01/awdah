import { expect, type Locator, type Page } from '@playwright/test';

const TRANSIENT_ERROR_PATTERN = /something went wrong|unexpected error/i;

async function isVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

export async function clickRetryIfVisible(page: Page): Promise<boolean> {
  const retryButton = page.getByRole('button', { name: /retry/i }).first();
  if (!(await isVisible(retryButton))) {
    return false;
  }

  await retryButton.click();
  return true;
}

export async function resolvePageState(page: Page): Promise<'ready' | 'connecting' | 'error'> {
  const main = page.locator('main').first();
  if (await isVisible(main.getByText('Connecting...').first())) {
    return 'connecting';
  }

  const errorAlert = page.getByRole('alert').first();
  if (await isVisible(errorAlert)) {
    const alertText = (await errorAlert.textContent()) ?? '';
    if (TRANSIENT_ERROR_PATTERN.test(alertText)) {
      return 'error';
    }
  }

  return 'ready';
}

export async function expectTransientError(page: Page): Promise<void> {
  await expect(page.getByRole('alert').first()).toContainText(TRANSIENT_ERROR_PATTERN);
}
