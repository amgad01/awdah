import { z } from 'zod';
import {
  PRAYER_NAMES,
  LOG_TYPES,
  PRACTICING_PERIOD_TYPES,
  GENDERS,
  HijriDate,
} from '@awdah/shared';

const hijriDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const MAX_UNPAGED_HISTORY_RANGE_DAYS = 365;
const MAX_PAGED_HISTORY_RANGE_DAYS = 365;
const DEFAULT_HISTORY_PAGE_LIMIT = 100;
const MAX_HISTORY_PAGE_LIMIT = 200;

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
  })
  .refine((d) => !HijriDate.fromString(d.startDate).isAfter(HijriDate.today()), {
    message: 'Start date cannot be in the future',
    path: ['startDate'],
  })
  .refine((d) => !d.endDate || !HijriDate.fromString(d.endDate).isAfter(HijriDate.today()), {
    message: 'End date cannot be in the future',
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
  })
  .refine((d) => !HijriDate.fromString(d.startDate).isAfter(HijriDate.today()), {
    message: 'Start date cannot be in the future',
    path: ['startDate'],
  })
  .refine((d) => !d.endDate || !HijriDate.fromString(d.endDate).isAfter(HijriDate.today()), {
    message: 'End date cannot be in the future',
    path: ['endDate'],
  });

export const updateUserSettingsSchema = z
  .object({
    username: z.string().trim().max(40).optional(),
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
  })
  .refine((d) => isWithinHistoryRange(d.startDate, d.endDate, MAX_UNPAGED_HISTORY_RANGE_DAYS), {
    message: `History range cannot exceed ${MAX_UNPAGED_HISTORY_RANGE_DAYS} days`,
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
  })
  .refine((d) => isWithinHistoryRange(d.startDate, d.endDate, MAX_UNPAGED_HISTORY_RANGE_DAYS), {
    message: `History range cannot exceed ${MAX_UNPAGED_HISTORY_RANGE_DAYS} days`,
    path: ['endDate'],
  });

export const pagedHistoryQuerySchema = z
  .object({
    startDate: hijriDateString,
    endDate: hijriDateString,
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_HISTORY_PAGE_LIMIT)
      .default(DEFAULT_HISTORY_PAGE_LIMIT),
    cursor: z.string().min(1).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  })
  .refine((d) => isWithinHistoryRange(d.startDate, d.endDate, MAX_PAGED_HISTORY_RANGE_DAYS), {
    message: `History range cannot exceed ${MAX_PAGED_HISTORY_RANGE_DAYS} days`,
    path: ['endDate'],
  });

export const deletePracticingPeriodSchema = z.object({
  periodId: z.string().min(1, 'periodId is required'),
});

export const deletePrayerLogSchema = z.object({
  date: hijriDateString,
  prayerName: z.enum(PRAYER_NAMES),
  type: z.enum(LOG_TYPES),
});

export const deleteFastLogSchema = z.object({
  date: hijriDateString,
  eventId: z.string().min(1),
});

export const userLifecycleJobQuerySchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

function isWithinHistoryRange(startDate: string, endDate: string, maxDays: number): boolean {
  const start = HijriDate.fromString(startDate).toGregorian().getTime();
  const end = HijriDate.fromString(endDate).toGregorian().getTime();
  const diffDays = Math.floor((end - start) / 86_400_000);
  return diffDays <= maxDays;
}
