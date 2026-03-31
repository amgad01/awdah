import { expect, type Page } from '@playwright/test';

export function logoutButton(page: Page) {
  return page.getByRole('button', { name: /logout/i });
}

export async function switchToSignup(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^sign up$/i })
    .last()
    .click();
}

export async function submitLogin(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^login$/i })
    .last()
    .click();
}

export async function submitSignup(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^sign up$/i }).click();
}

export async function registerLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  await switchToSignup(page);
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);

  const confirmField = page.getByLabel(/confirm/i);
  if (await confirmField.isVisible().catch(() => false)) {
    await confirmField.fill(password);
  }

  await submitSignup(page);
  await expect(logoutButton(page)).toBeVisible({ timeout: 15_000 });
}

export async function loginLocalUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await submitLogin(page);
  await expect(logoutButton(page)).toBeVisible({ timeout: 15_000 });
}

export async function loginOrSignupLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await submitLogin(page);

  if (
    await logoutButton(page)
      .isVisible()
      .catch(() => false)
  ) {
    await expect(logoutButton(page)).toBeVisible({ timeout: 15_000 });
    return;
  }

  await switchToSignup(page);
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);

  const confirmField = page.getByLabel(/confirm/i);
  if (await confirmField.isVisible().catch(() => false)) {
    await confirmField.fill(password);
  }

  await submitSignup(page);
  await expect(logoutButton(page)).toBeVisible({ timeout: 15_000 });
}
