import { estimateSalahDebt } from '@/lib/practicing-periods';
import {
  computeHijriAge,
  formatGregorianDisplay,
  formatHijriDisplay,
} from '@/lib/profile-date-utils';
import { resolveApiErrorKey } from '@/lib/api-error-codes';
import type { ProfileFormState, DebtPreview, PeriodLike } from './types';

export { computeHijriAge, formatGregorianDisplay, formatHijriDisplay };

export function createProfileFormState(
  profileKey: string,
  profile?: {
    username?: string;
    dateOfBirth?: string;
    bulughDate?: string;
    revertDate?: string;
    gender?: 'male' | 'female';
  } | null,
  defaultBulughDate?: string | null,
): ProfileFormState {
  const bulughDate = profile?.bulughDate || defaultBulughDate || '';
  const isAutoBulugh =
    Boolean(profile?.dateOfBirth) &&
    Boolean(profile?.bulughDate) &&
    profile?.bulughDate === defaultBulughDate;

  return {
    sourceKey: profileKey,
    username: profile?.username ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    bulughDate,
    revertDate: profile?.revertDate ?? '',
    gender: profile?.gender ?? 'male',
    bulughInputMode: isAutoBulugh ? 'auto' : 'date',
    bulughAgeInput: '',
    isRevert: Boolean(profile?.revertDate),
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
  return resolveApiErrorKey(error, error instanceof Error ? error.message : fallback);
}
