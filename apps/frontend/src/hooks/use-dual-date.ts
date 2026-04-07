import { useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HIJRI_MONTH_KEYS } from '@/lib/constants';
import { HijriDate } from '@awdah/shared';

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
  /** Include the Gregorian year in the rendered string. Defaults to true. */
  includeGregorianYear?: boolean;
  /** Include a weekday label in the Gregorian string. */
  weekday?: 'short' | 'long';
  /** Choose the Gregorian month width. */
  month?: 'short' | 'long';
}

const FALLBACK_DUAL_DATE: DualDateParts = {
  hijri: '—',
  gregorian: '—',
  primary: '—',
  secondary: '—',
};

interface DualDateFormatDeps {
  language: string;
  locale: string;
  t: (key: string) => string;
  fmtNumber: (n: number) => string;
}

export function formatDualDateParts(
  dateStr: string,
  options: DualDateFormatOptions,
  deps: DualDateFormatDeps,
): DualDateParts {
  if (!dateStr || dateStr.trim() === '') {
    return FALLBACK_DUAL_DATE;
  }

  try {
    const hijri = HijriDate.fromString(dateStr);
    const gregorian = hijri.toGregorian();
    const monthName = deps.t(HIJRI_MONTH_KEYS[hijri.month - 1]);
    const { includeGregorianYear = true, weekday, month = 'long' } = options;
    const hijriStr = `${deps.fmtNumber(hijri.day)} ${monthName} ${deps.fmtNumber(hijri.year)}`;
    const gregStr = gregorian.toLocaleDateString(deps.locale, {
      day: 'numeric',
      month,
      ...(weekday ? { weekday } : {}),
      ...(includeGregorianYear ? { year: 'numeric' } : {}),
    });

    return {
      hijri: hijriStr,
      gregorian: gregStr,
      primary: deps.language === 'ar' ? hijriStr : gregStr,
      secondary: deps.language === 'ar' ? gregStr : hijriStr,
    };
  } catch (error) {
    console.warn('Failed to format date:', dateStr, error);
    return FALLBACK_DUAL_DATE;
  }
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
      return formatDualDateParts(dateStr, options, { language, locale, t, fmtNumber });
    },
    [t, fmtNumber, language, locale],
  );

  return { format };
};
