import { estimateSalahDebt } from '@/lib/practicing-periods';
import {
  computeHijriAge,
  formatGregorianDisplay,
  formatHijriDisplay,
} from '@/lib/profile-date-utils';
import type { ProfileFormState, DebtPreview, PeriodLike } from './types';

export { computeHijriAge, formatGregorianDisplay, formatHijriDisplay };

export function createProfileFormState(
  profileKey: string,
  profile?: {
    dateOfBirth?: string;
    bulughDate?: string;
    revertDate?: string;
    gender?: 'male' | 'female';
  } | null,
): ProfileFormState {
  return {
    sourceKey: profileKey,
    dateOfBirth: profile?.dateOfBirth ?? '',
    bulughDate: profile?.bulughDate ?? '',
    revertDate: profile?.revertDate ?? '',
    gender: profile?.gender ?? 'male',
  };
}

export function buildDebtPreview(
  currentBulughDate: string | undefined,
  nextBulughDate: string | undefined,
  currentPeriods: PeriodLike[],
  nextPeriods: PeriodLike[],
  currentRevertDate?: string,
  nextRevertDate?: string,
): DebtPreview | null {
  if (!currentBulughDate || !nextBulughDate) return null;
  try {
    const current = estimateSalahDebt(
      currentBulughDate,
      currentPeriods,
      undefined,
      currentRevertDate,
    );
    const next = estimateSalahDebt(nextBulughDate, nextPeriods, undefined, nextRevertDate);
    return { current, next, delta: next - current };
  } catch {
    return null;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
