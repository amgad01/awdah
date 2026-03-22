/**
 * Locale-aware number and percentage formatters.
 * All user-visible numbers must go through these functions so
 * Arabic-Indic digits are shown automatically when lang = 'ar'.
 */

const EN_FORMATTER = new Intl.NumberFormat('en-GB');
const AR_FORMATTER = new Intl.NumberFormat('ar-EG'); // Arabic-Indic digits (٠١٢…)

export function formatNumber(n: number, language: string): string {
  return language === 'ar' ? AR_FORMATTER.format(n) : EN_FORMATTER.format(n);
}

export function formatPercent(n: number, language: string): string {
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export function formatDate(
  dateStr: string,
  language: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' },
): string {
  const locale = language === 'ar' ? 'ar-SA' : 'en-GB';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, options);
}
