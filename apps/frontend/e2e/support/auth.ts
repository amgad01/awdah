import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const SHELL_ROUTE_BY_TEST_ID: Record<string, string> = {
  'nav-dashboard': '/',
  'nav-salah': '/salah',
  'nav-sawm': '/sawm',
  'nav-history': '/history',
  'nav-settings': '/settings',
  'nav-learn': '/learn',
  'nav-demo': '/demo',
  'nav-about': '/about',
  'nav-contribute': '/contribute',
  'nav-privacy': '/privacy',
};

export function logoutButton(page: Page) {
  return page.locator('[data-testid="logout-button"]:visible').first();
}

export async function openShellNavigation(page: Page): Promise<void> {
  const burgerButton = page.getByTestId('nav-burger').first();

  if (await burgerButton.isVisible().catch(() => false)) {
    await burgerButton.click();
  }
}

export async function navigateFromShell(page: Page, destinationTestId: string): Promise<void> {
  await openShellNavigation(page);
  const visibleTarget = page.locator(`[data-testid="${destinationTestId}"]:visible`).first();

  if (await visibleTarget.isVisible().catch(() => false)) {
    await visibleTarget.click();
    return;
  }

  const fallbackPath = SHELL_ROUTE_BY_TEST_ID[destinationTestId];
  if (!fallbackPath) {
    throw new Error(`No shell route fallback configured for ${destinationTestId}`);
  }

  await page.goto(fallbackPath);
}

export async function logoutCurrentUser(page: Page): Promise<void> {
  await openShellNavigation(page);
  const visibleLogoutButton = logoutButton(page);

  if (await visibleLogoutButton.isVisible().catch(() => false)) {
    await visibleLogoutButton.click();
    return;
  }

  await page.evaluate(() => {
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByLabel(/email/i).last()).toBeVisible({ timeout: 10_000 });
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

export async function switchToSignup(page: Page): Promise<void> {
  const switchButton = page.locator('[data-testid="switch-to-signup"]:visible').first();

  if (await switchButton.isVisible().catch(() => false)) {
    await switchButton.click();
  } else {
    await page
      .getByRole('button', { name: /^(create account|sign up)$/i })
      .last()
      .click();
  }

  const signupEmail = page.locator('[data-testid="signup-email"]:visible').first();
  if (!(await signupEmail.isVisible().catch(() => false))) {
    await page.goto('/?auth=signup');
  }

  await expect(page.locator('[data-testid="signup-email"]:visible').first()).toBeVisible({
    timeout: 10_000,
  });
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
  await openShellNavigation(page);
}

export async function loginLocalUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await submitLogin(page);
  await skipOnboardingIfVisible(page);
  await openShellNavigation(page);
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
    await openShellNavigation(page);
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
  await openShellNavigation(page);
}

export async function seedAndLoginLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await seedLocalUser(page, email);
  await loginOrSignupLocalUser(page, email, password);
}
