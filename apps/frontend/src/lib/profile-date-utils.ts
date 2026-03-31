import { HijriDate } from '@awdah/shared';
import { BULUGH_DEFAULT_HIJRI_YEARS, HIJRI_MONTH_KEYS } from '@/lib/constants';
import { todayHijriDate } from '@/utils/date-utils';

function isFutureHijriDate(hijriDate: HijriDate): boolean {
  return hijriDate.isAfter(HijriDate.fromString(todayHijriDate()));
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

export function getDefaultBulughDate(dateOfBirth?: string): string | null {
  if (!dateOfBirth) return null;

  try {
    const dob = HijriDate.fromString(dateOfBirth);
    const candidate = new HijriDate(dob.year + BULUGH_DEFAULT_HIJRI_YEARS, dob.month, dob.day);
    return isFutureHijriDate(candidate) ? null : candidate.toString();
  } catch {
    return null;
  }
}

export function getAgeBasedBulughDate(dateOfBirth?: string, ageInput?: string): string | null {
  if (!dateOfBirth || !ageInput) return null;

  const age = Number.parseInt(ageInput, 10);
  if (Number.isNaN(age) || age < 1 || age > 70) {
    return null;
  }

  try {
    const dob = HijriDate.fromString(dateOfBirth);
    const candidate = new HijriDate(dob.year + age, dob.month, dob.day);
    return isFutureHijriDate(candidate) ? null : candidate.toString();
  } catch {
    return null;
  }
}

function compareBulughThreshold(
  dateOfBirth?: string,
  bulughDate?: string,
  years = BULUGH_DEFAULT_HIJRI_YEARS,
  mode: 'before' | 'after' = 'after',
): boolean {
  if (!dateOfBirth || !bulughDate) return false;

  try {
    const dob = HijriDate.fromString(dateOfBirth);
    const threshold = new HijriDate(dob.year + years, dob.month, dob.day);
    const candidate = HijriDate.fromString(bulughDate);

    return mode === 'before' ? candidate.isBefore(threshold) : candidate.isAfter(threshold);
  } catch {
    return false;
  }
}

export function isBulughEarly(dateOfBirth?: string, bulughDate?: string): boolean {
  return compareBulughThreshold(dateOfBirth, bulughDate, 12, 'before');
}

export function isBulughLate(dateOfBirth?: string, bulughDate?: string): boolean {
  return compareBulughThreshold(dateOfBirth, bulughDate, 15, 'after');
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
