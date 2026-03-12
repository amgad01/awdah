import { PRAYER_NAMES, LOG_TYPES, PRACTICING_PERIOD_TYPES, GENDERS } from '../constants';

export type PrayerName = (typeof PRAYER_NAMES)[number];

export type LogType = (typeof LOG_TYPES)[number];

export type PracticingPeriodType = (typeof PRACTICING_PERIOD_TYPES)[number];

export type Gender = (typeof GENDERS)[number];

export type HijriDateString = string;

export type Environment = 'dev' | 'staging' | 'prod';

export type HijriDateObject = {
  year: number;
  month: number;
  day: number;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
