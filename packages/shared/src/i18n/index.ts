import en from './en.json';
import ar from './ar.json';

export type SupportedLocale = 'en' | 'ar';

export type LocaleData = typeof en;

const locales: Record<SupportedLocale, LocaleData> = { en, ar };

export function getLocale(locale: SupportedLocale): LocaleData {
    return locales[locale];
}

export function getHijriMonthName(month: number, locale: SupportedLocale = 'en'): string {
    const data = locales[locale];
    return data.hijriMonths[month - 1] ?? `Month ${month}`;
}
