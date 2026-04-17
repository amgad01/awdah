export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const PRAYERS_PER_DAY = 5;

export const LOG_TYPES = ['obligatory', 'qadaa'] as const;
export const LOG_ACTIONS = ['prayed', 'deselected'] as const;

export const PRACTICING_PERIOD_TYPES = ['salah', 'sawm', 'both'] as const;

export const DEFAULT_BULUGH_AGE_HIJRI_YEARS = 15;

export const HIJRI_MONTHS_IN_YEAR = 12;

export const RAMADAN_MONTH_NUMBER = 9;

export const GENDERS = ['male', 'female'] as const;

export const MADHABS = ['hanafi', 'shafii', 'maliki', 'hanbali', 'jafari'] as const;

export const CALCULATION_METHODS = [
  'MWL',
  'ISNA',
  'Egypt',
  'Makkah',
  'Karachi',
  'Tehran',
  'Jafari',
] as const;

export const MOON_SIGHTING_PREFERENCES = ['global', 'local', 'calculation'] as const;

export const BREAK_REASONS = [
  'sickness',
  'travel',
  'menstruation',
  'pregnancy',
  'nursing',
  'forgetfulness',
  'intentional',
] as const;

export const RATE_LIMIT_MINUTES = 10;

export function getRateLimitSince(): string {
  const cooldownMs = RATE_LIMIT_MINUTES * 60 * 1000;
  return new Date(Date.now() - cooldownMs).toISOString();
}
