/** Default daily qadaa intention (prayers per day) */
export const DEFAULT_DAILY_INTENTION = 5;

/** Minimum daily qadaa intention */
export const MIN_DAILY_INTENTION = 1;

/** Maximum daily qadaa intention */
export const MAX_DAILY_INTENTION = 20;

/** Number of obligatory prayers per day */
export const PRAYERS_PER_DAY = 5;

/** Approximate days per Hijri year (for projection estimates) */
export const DAYS_PER_YEAR = 355;

/** Bulugh default: 15 Hijri years from DOB per major scholarly opinion */
export const BULUGH_DEFAULT_HIJRI_YEARS = 15;

/** Hijri calendar bounds for date inputs */
export const HIJRI_YEAR_MIN = 1300;
export const HIJRI_YEAR_MAX = 1500;
export const HIJRI_MONTHS_COUNT = 12;
export const MAX_HIJRI_DAYS_PER_MONTH = 30;

/** DOB Gregorian input bounds */
export const DOB_MAX_YEARS_AGO = 100;

/** Profile query stale time (5 minutes) */
export const PROFILE_STALE_TIME_MS = 5 * 60 * 1000;

/** Default history date range in days */
export const DEFAULT_HISTORY_RANGE_DAYS = 30;

/** Number of log records to fetch per history page */
export const HISTORY_PAGE_SIZE = 20;

/** Compact language switcher breakpoint in pixels */
export const LANGUAGE_SWITCHER_COMPACT_BREAKPOINT_PX = 480;

/** The five obligatory daily prayers, in order */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** i18n keys for the 12 Hijri months, in order (index 0 = Muharram) */
export const HIJRI_MONTH_KEYS = [
  'hijri_months.muharram',
  'hijri_months.safar',
  'hijri_months.rabi_al_awwal',
  'hijri_months.rabi_al_thani',
  'hijri_months.jumada_al_awwal',
  'hijri_months.jumada_al_thani',
  'hijri_months.rajab',
  'hijri_months.shaban',
  'hijri_months.ramadan',
  'hijri_months.shawwal',
  'hijri_months.dhu_al_qidah',
  'hijri_months.dhu_al_hijjah',
] as const;
