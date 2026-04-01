import { expect, type Page } from '@playwright/test';

export function logoutButton(page: Page) {
  return page.getByRole('button', { name: /logout/i });
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

async function expectAuthenticated(page: Page): Promise<void> {
  await skipOnboardingIfVisible(page);
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible({ timeout: 15_000 });
  await expect(logoutButton(page)).toBeVisible({ timeout: 15_000 });
}

export async function switchToSignup(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^(create account|sign up)$/i })
    .last()
    .click();
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
  await expectAuthenticated(page);
}

export async function loginLocalUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await submitLogin(page);
  await expectAuthenticated(page);
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
    await expectAuthenticated(page);
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
  await expectAuthenticated(page);
}

export async function seedAndLoginLocalUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await seedLocalUser(page, email);
  await loginOrSignupLocalUser(page, email, password);
}
