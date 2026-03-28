import {
  PRAYER_NAMES,
  LOG_TYPES,
  LOG_ACTIONS,
  PRACTICING_PERIOD_TYPES,
  GENDERS,
  MADHABS,
  CALCULATION_METHODS,
  MOON_SIGHTING_PREFERENCES,
  BREAK_REASONS,
} from '../constants';

export type PrayerName = (typeof PRAYER_NAMES)[number];

export type LogType = (typeof LOG_TYPES)[number];
export type LogAction = (typeof LOG_ACTIONS)[number];

export type PracticingPeriodType = (typeof PRACTICING_PERIOD_TYPES)[number];

export type Gender = (typeof GENDERS)[number];

export type Madhab = (typeof MADHABS)[number];

export type CalculationMethod = (typeof CALCULATION_METHODS)[number];

export type MoonSightingPreference = (typeof MOON_SIGHTING_PREFERENCES)[number];

export type BreakReason = (typeof BREAK_REASONS)[number];

export type Location = {
  city: string;
  country: string;
  coords?: {
    lat: number;
    lon: number;
  };
};

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
