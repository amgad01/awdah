export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const PRAYERS_PER_DAY = 5;

export const LOG_TYPES = ['obligatory', 'qadaa'] as const;

export const PRACTICING_PERIOD_TYPES = ['salah', 'sawm', 'both'] as const;

export const DEFAULT_BULUGH_AGE_HIJRI_YEARS = 15;

export const HIJRI_MONTHS_IN_YEAR = 12;

export const RAMADAN_MONTH_NUMBER = 9;

export const HI_MONTH_NAMES_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhira',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
] as const;

export const HI_MONTH_NAMES_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
] as const;
