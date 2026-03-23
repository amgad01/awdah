import { z } from 'zod';
import {
  PRAYER_NAMES,
  LOG_TYPES,
  PRACTICING_PERIOD_TYPES,
  GENDERS,
  HijriDate,
} from '@awdah/shared';

const hijriDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const hijriDateString = z
  .string()
  .regex(hijriDatePattern, 'Date must be in YYYY-MM-DD format')
  .refine((s) => {
    try {
      HijriDate.fromString(s);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid Hijri date');

export const logPrayerSchema = z.object({
  date: hijriDateString,
  prayerName: z.enum(PRAYER_NAMES),
  type: z.enum(LOG_TYPES),
});

export const logFastSchema = z.object({
  date: hijriDateString,
  type: z.enum(LOG_TYPES),
});

export const addPracticingPeriodSchema = z
  .object({
    startDate: hijriDateString,
    endDate: hijriDateString.optional(),
    type: z.enum(PRACTICING_PERIOD_TYPES),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const updatePracticingPeriodSchema = z
  .object({
    periodId: z.string().min(1),
    startDate: hijriDateString,
    endDate: hijriDateString.optional(),
    type: z.enum(PRACTICING_PERIOD_TYPES),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const updateUserSettingsSchema = z
  .object({
    bulughDate: hijriDateString,
    gender: z.enum(GENDERS),
    dateOfBirth: hijriDateString.optional(),
    revertDate: hijriDateString.optional(),
  })
  .refine((d) => !d.revertDate || d.revertDate >= d.bulughDate, {
    message: 'Revert date cannot be before bulugh date',
    path: ['revertDate'],
  });

export const prayerHistoryQuerySchema = z
  .object({
    startDate: hijriDateString,
    endDate: hijriDateString,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const fastHistoryQuerySchema = z
  .object({
    startDate: hijriDateString,
    endDate: hijriDateString,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const deletePracticingPeriodSchema = z.object({
  periodId: z.string().min(1, 'periodId is required'),
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
