import { useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import { HIJRI_MONTH_KEYS } from '@/lib/constants';

export interface DualDateParts {
  /** Hijri calendar string (localised digits) */
  hijri: string;
  /** Gregorian calendar string */
  gregorian: string;
  /** Primary: Hijri in Arabic mode, Gregorian in English mode */
  primary: string;
  /** Secondary: the other calendar */
  secondary: string;
}

export interface DualDateFormatOptions {
  /** Include the Gregorian year in the rendered string. */
  includeGregorianYear?: boolean;
  /** Include a weekday label in the Gregorian string. */
  weekday?: 'short' | 'long';
  /** Choose the Gregorian month width. */
  month?: 'short' | 'long';
}

/**
 * Returns a `format(dateStr)` function that produces dual-calendar date parts.
 * Use `primary` for the main label and `secondary` for the sublabel / secondary line.
 */
export const useDualDate = () => {
  const { t, language, fmtNumber } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA' : 'en-GB';

  const format = useCallback(
    (dateStr: string, options: DualDateFormatOptions = {}): DualDateParts => {
      const hijri = HijriDate.fromString(dateStr);
      const gregorian = hijri.toGregorian();
      const monthName = t(HIJRI_MONTH_KEYS[hijri.month - 1]);
      const hijriStr = `${fmtNumber(hijri.day)} ${monthName} ${fmtNumber(hijri.year)}`;
      const gregStr = gregorian.toLocaleDateString(locale, {
        day: 'numeric',
        month: options.month ?? 'long',
        ...(options.weekday ? { weekday: options.weekday } : {}),
        ...(options.includeGregorianYear ? { year: 'numeric' } : {}),
      });
      return {
        hijri: hijriStr,
        gregorian: gregStr,
        primary: language === 'ar' ? hijriStr : gregStr,
        secondary: language === 'ar' ? gregStr : hijriStr,
      };
    },
    [t, fmtNumber, language, locale],
  );

  return { format };
};
