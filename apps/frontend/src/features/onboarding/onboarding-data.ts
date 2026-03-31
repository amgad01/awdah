import type { PracticingPeriodResponse, UserProfileResponse } from '@/lib/api';
import { DEFAULT_DAILY_INTENTION } from '@/lib/constants';
import { decrypt, encrypt } from '@/lib/crypto';

export const TOTAL_ONBOARDING_STEPS = 6;
export const ONBOARDING_DRAFT_SECRET = 'awdah-onboarding-draft-v1'; // Internal secret for draft encryption

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
  step: number,
  data: OnboardingData,
): Promise<void> {
  try {
    const payload = JSON.stringify({ step, data });
    const encrypted = await encrypt(payload, ONBOARDING_DRAFT_SECRET);
    localStorage.setItem(draftKey, encrypted);
  } catch (error) {
    console.error('Failed to save onboarding draft', error);
  }
}

export async function loadOnboardingDraft(
  draftKey: string,
): Promise<{ step: number; data: OnboardingData } | null> {
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;

    let decrypted: string;
    try {
      // Try to decrypt if it's encrypted
      decrypted = await decrypt(raw, ONBOARDING_DRAFT_SECRET);
    } catch {
      // If decryption fails, it might be an old clear-text draft or invalid data
      // We check if it's valid JSON (potentially old clear-text)
      try {
        JSON.parse(raw);
        // It is clear-text, we could return it or ignore it.
        // For safety/security, we migration or just return null to start fresh.
        // Let's return null to be safe and clear the old draft.
        localStorage.removeItem(draftKey);
        return null;
      } catch {
        return null;
      }
    }

    return JSON.parse(decrypted) as { step: number; data: OnboardingData };
  } catch {
    return null;
  }
}
