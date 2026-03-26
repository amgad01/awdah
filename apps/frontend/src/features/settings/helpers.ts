import { HijriDate } from '@awdah/shared';
import { estimateSalahDebt } from '@/lib/practicing-periods';
import { HIJRI_MONTH_KEYS } from '@/lib/constants';
import type { ProfileFormState, DebtPreview, PeriodLike } from './types';

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
): DebtPreview | null {
  if (!currentBulughDate || !nextBulughDate) return null;
  try {
    const current = estimateSalahDebt(currentBulughDate, currentPeriods);
    const next = estimateSalahDebt(nextBulughDate, nextPeriods);
    return { current, next, delta: next - current };
  } catch {
    return null;
  }
}

export function formatHijriDisplay(
  hijriStr: string,
  language: string,
  t: (key: string) => string,
  fmtNumber: (n: number) => string,
  invert = false,
): string {
  if (!hijriStr) return '—';
  try {
    const d = HijriDate.fromString(hijriStr);
    const targetLang = invert ? (language === 'ar' ? 'en' : 'ar') : language;
    if (targetLang === 'ar') {
      const monthName = t(HIJRI_MONTH_KEYS[d.month - 1]);
      return `${fmtNumber(d.day)} ${monthName} ${fmtNumber(d.year)}`;
    }
    return d.format('en');
  } catch {
    return hijriStr;
  }
}

export function formatGregorianDisplay(hijriStr: string, language: string): string {
  if (!hijriStr) return '\u2014';
  try {
    const d = HijriDate.fromString(hijriStr);
    const greg = d.toGregorian();
    return greg.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return hijriStr;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function computeHijriAge(dob: string, laterDate: string): number | null {
  if (!dob || !laterDate) return null;
  try {
    const d = HijriDate.fromString(dob);
    const l = HijriDate.fromString(laterDate);
    let age = l.year - d.year;
    if (l.month < d.month || (l.month === d.month && l.day < d.day)) {
      age -= 1;
    }
    return age;
  } catch {
    return null;
  }
}
