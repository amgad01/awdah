const ONBOARDING_DRAFT_KEY_PREFIX = 'awdah_onboarding_draft';
const ONBOARDING_SKIP_KEY_PREFIX = 'awdah_onboarding_skipped';

function getScopedKey(prefix: string, userId?: string): string {
  return userId ? `${prefix}:${userId}` : `${prefix}:anonymous`;
}

export function getOnboardingDraftKey(userId?: string): string {
  return getScopedKey(ONBOARDING_DRAFT_KEY_PREFIX, userId);
}

export function getOnboardingSkipKey(userId?: string): string {
  return getScopedKey(ONBOARDING_SKIP_KEY_PREFIX, userId);
}

export function readOnboardingSkipped(userId?: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(getOnboardingSkipKey(userId)) === 'true';
  } catch {
    return false;
  }
}

export function writeOnboardingSkipped(userId: string | undefined, skipped: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const key = getOnboardingSkipKey(userId);
    if (skipped) {
      window.localStorage.setItem(key, 'true');
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage failures.
  }
}

export function clearOnboardingLocalState(userId?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getOnboardingDraftKey(userId));
    window.localStorage.removeItem(getOnboardingSkipKey(userId));
  } catch {
    // Ignore localStorage failures.
  }
}
