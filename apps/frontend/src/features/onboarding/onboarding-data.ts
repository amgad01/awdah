import type { PracticingPeriodResponse, UserProfileResponse } from '@/lib/api';
import { DEFAULT_DAILY_INTENTION } from '@/lib/constants';

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

export function loadOnboardingDraft(
  draftKey: string,
): { step: number; data: OnboardingData } | null {
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;
    return JSON.parse(raw) as { step: number; data: OnboardingData };
  } catch {
    return null;
  }
}
