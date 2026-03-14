import { z } from 'zod';
import { PRAYER_NAMES, LOG_TYPES, PRACTICING_PERIOD_TYPES, GENDERS } from '@awdah/shared';

const hijriDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const hijriDateString = z.string().regex(hijriDatePattern, 'Date must be in YYYY-MM-DD format');

export const logPrayerSchema = z.object({
  date: hijriDateString,
  prayerName: z.enum(PRAYER_NAMES),
  type: z.enum(LOG_TYPES),
});

export const logFastSchema = z.object({
  date: hijriDateString,
  type: z.enum(LOG_TYPES),
});

export const addPracticingPeriodSchema = z.object({
  startDate: hijriDateString,
  endDate: hijriDateString,
  type: z.enum(PRACTICING_PERIOD_TYPES),
});

export const updateUserSettingsSchema = z.object({
  bulughDate: hijriDateString,
  gender: z.enum(GENDERS),
});

export const prayerHistoryQuerySchema = z.object({
  startDate: hijriDateString,
  endDate: hijriDateString,
});

export const fastHistoryQuerySchema = z.object({
  startDate: hijriDateString,
  endDate: hijriDateString,
});

export const deletePrayerLogSchema = z.object({
  date: hijriDateString,
  prayerName: z.enum(PRAYER_NAMES),
  eventId: z.string().min(1),
});

export const deleteFastLogSchema = z.object({
  date: hijriDateString,
  eventId: z.string().min(1),
});
