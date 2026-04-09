import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export function logoutButton(page: Page) {
  return page.getByTestId('logout-button').first();
}

function emailField(page: Page) {
  return page.getByLabel(/email/i).last();
}

function passwordField(page: Page) {
  return page.getByLabel(/^password$/i).last();
}

function confirmPasswordField(page: Page) {
  return page.getByLabel(/confirm password/i);
}

export async function seedLocalUsers(page: Page, emails: string[]): Promise<void> {
  const response = await page.request.post('/v1/e2e/seed', {
    data: { users: emails.map((email) => ({ email })) },
  });
  const responseText = await response.text();

  if (!response.ok()) {
    throw new Error(
      `E2E seed failed (${response.status()} ${response.statusText()}): ${
        responseText || 'No response body'
      }`,
    );
  }
}

export async function seedLocalUser(page: Page, email: string): Promise<void> {
  await seedLocalUsers(page, [email]);
}

async function skipOnboardingIfVisible(page: Page): Promise<void> {
  const skipButton = page.getByTestId('onboarding-skip').first();

  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
}

async function openNavigationIfNeeded(page: Page): Promise<void> {
  const burgerButton = page.getByTestId('nav-burger').first();

  if (await burgerButton.isVisible().catch(() => false)) {
    await burgerButton.click();
  }
}

export async function switchToSignup(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^(create account|sign up)$/i })
    .last()
    .click();

  await expect(confirmPasswordField(page)).toBeVisible({ timeout: 10_000 });
}

export async function submitLogin(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^(sign in|login)$/i })
    .last()
    .click();
}

export async function submitSignup(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^(create account|sign up)$/i })
    .last()
    .click();
}

export async function registerLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  await seedLocalUser(page, email);
  await switchToSignup(page);
  await emailField(page).fill(email);
  await passwordField(page).fill(password);

  const confirmField = confirmPasswordField(page);
  if (await confirmField.isVisible().catch(() => false)) {
    await confirmField.fill(password);
  }

  await submitSignup(page);
  await skipOnboardingIfVisible(page);
  await openNavigationIfNeeded(page);
}

export async function loginLocalUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await submitLogin(page);
  await skipOnboardingIfVisible(page);
  await openNavigationIfNeeded(page);
}

export async function loginOrSignupLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await submitLogin(page);

  if (
    await logoutButton(page)
      .isVisible()
      .catch(() => false)
  ) {
    await skipOnboardingIfVisible(page);
    await openNavigationIfNeeded(page);
    return;
  }

  await switchToSignup(page);
  await emailField(page).fill(email);
  await passwordField(page).fill(password);

  const confirmField = confirmPasswordField(page);
  if (await confirmField.isVisible().catch(() => false)) {
    await confirmField.fill(password);
  }

  await submitSignup(page);
  await skipOnboardingIfVisible(page);
  await openNavigationIfNeeded(page);
}

export async function seedAndLoginLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await seedLocalUser(page, email);
  await loginOrSignupLocalUser(page, email, password);
}
