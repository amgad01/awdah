import type { PracticingPeriodResponse, UserProfileResponse } from '@/lib/api';
import { DEFAULT_DAILY_INTENTION } from '@/lib/constants';
import { decrypt, encrypt } from '@/lib/crypto';
import { readPersistedSession } from '@/lib/auth-service';

export const TOTAL_ONBOARDING_STEPS = 6;

export interface OnboardingPeriod {
  id: string;
  startHijri: string;
  endHijri?: string;
  type: 'salah' | 'sawm' | 'both';
}

export interface OnboardingData {
  consentData: boolean;
  consentPolicy: boolean;
  dateOfBirthHijri: string;
  gender: 'male' | 'female' | '';
  bulughDateHijri: string;
  revertDateHijri?: string;
  periods: OnboardingPeriod[];
  dailyIntention: number;
  username: string;
}

export function createEmptyOnboardingData(): OnboardingData {
  return {
    consentData: false,
    consentPolicy: false,
    dateOfBirthHijri: '',
    gender: '',
    bulughDateHijri: '',
    periods: [],
    dailyIntention: DEFAULT_DAILY_INTENTION,
    username: '',
  };
}

export function createOnboardingDataFromProfile(
  profile?: UserProfileResponse | null,
  periods: PracticingPeriodResponse[] = [],
): OnboardingData {
  const hasExistingData = Boolean(profile) || periods.length > 0;

  return {
    ...createEmptyOnboardingData(),
    consentData: hasExistingData,
    consentPolicy: hasExistingData,
    dateOfBirthHijri: profile?.dateOfBirth ?? '',
    gender: profile?.gender ?? '',
    username: profile?.username ?? '',
    bulughDateHijri: profile?.bulughDate ?? '',
    revertDateHijri: profile?.revertDate ?? undefined,
    periods: periods.map((period) => ({
      id: period.periodId,
      startHijri: period.startDate,
      endHijri: period.endDate,
      type: period.type,
    })),
  };
}

export async function saveOnboardingDraft(
  draftKey: string,
  draftSecret: string | null,
  step: number,
  data: OnboardingData,
): Promise<void> {
  if (!draftSecret) {
    return;
  }

  try {
    const payload = JSON.stringify({ step, data });
    const encrypted = await encrypt(payload, draftSecret);
    localStorage.setItem(draftKey, encrypted);
  } catch {
    // Silently fail if draft save fails — not critical, user can re-enter.
  }
}

export async function loadOnboardingDraft(
  draftKey: string,
  draftSecret: string | null,
): Promise<{ step: number; data: OnboardingData } | null> {
  if (!draftSecret) {
    return null;
  }

  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;

    let decrypted: string;
    try {
      decrypted = await decrypt(raw, draftSecret);
    } catch {
      try {
        JSON.parse(raw);
      } catch {
        // Old clear-text or unreadable drafts are ignored
      }

      localStorage.removeItem(draftKey);
      return null;
    }

    return JSON.parse(decrypted) as { step: number; data: OnboardingData };
  } catch {
    return null;
  }
}

export function getOnboardingDraftSecret(userId?: string): string | null {
  const session = readPersistedSession();
  if (!userId || !session?.token || session.userId !== userId) {
    return null;
  }

  return `awdah-onboarding-draft:${userId}:${session.token}`;
}
