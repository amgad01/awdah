import { HijriDate, PRAYERS_PER_DAY } from '@awdah/shared';
import type { HijriDateValue } from '@/lib/hijri-date';
import { todayHijriDate } from '@/utils/date-utils';

export type PracticingCoverageContext = 'salah' | 'sawm' | 'all';
type PracticingPeriodType = 'salah' | 'sawm' | 'both';

export interface PeriodRangeLike {
  id?: string;
  periodId?: string;
  startDate?: string;
  endDate?: string;
  startHijri?: string;
  endHijri?: string;
  type: PracticingPeriodType;
}

interface NormalizedPeriodRange {
  id: string;
  startDate: string;
  endDate?: string;
  type: PracticingPeriodType;
}

export interface CoveredPracticingDay {
  date: string;
  periodId: string;
  type: PracticingPeriodType;
}

export interface PracticingPeriodValidationError {
  messageKey: string;
  field: 'start' | 'end' | 'form';
  severity: 'error' | 'warning';
}

function daysBetween(start: HijriDateValue, end: HijriDateValue): number {
  return Math.round((end.toGregorian().getTime() - start.toGregorian().getTime()) / 86_400_000);
}

function normalizePeriod(period: PeriodRangeLike, fallbackId: string): NormalizedPeriodRange {
  const startDate = period.startDate ?? period.startHijri;
  if (!startDate) {
    throw new Error('Practicing period start date is required');
  }

  return {
    id: period.periodId ?? period.id ?? fallbackId,
    startDate,
    endDate: period.endDate ?? period.endHijri,
    type: period.type,
  };
}

function maxDate(a: HijriDateValue, b: HijriDateValue): HijriDateValue {
  return a.isAfter(b) ? a : b;
}

function minDate(a: HijriDateValue, b: HijriDateValue): HijriDateValue {
  return a.isBefore(b) ? a : b;
}

function sameOrBefore(a: HijriDateValue, b: HijriDateValue): boolean {
  return a.isBefore(b) || a.equals(b);
}

export function periodCoversContext(
  type: PracticingPeriodType,
  context: PracticingCoverageContext,
): boolean {
  if (context === 'all') {
    return true;
  }
  return type === 'both' || type === context;
}

export function rangesOverlap(
  startDate: string,
  endDate: string | undefined,
  otherStartDate: string,
  otherEndDate: string | undefined,
): boolean {
  const start = HijriDate.fromString(startDate);
  const end = endDate ? HijriDate.fromString(endDate) : null;
  const otherStart = HijriDate.fromString(otherStartDate);
  const otherEnd = otherEndDate ? HijriDate.fromString(otherEndDate) : null;

  const startBeforeOtherEnd = !otherEnd || sameOrBefore(start, otherEnd);
  const endAfterOtherStart = !end || sameOrBefore(otherStart, end);

  return startBeforeOtherEnd && endAfterOtherStart;
}

export function getPracticingPeriodValidationError({
  startDate,
  endDate,
  dateOfBirth,
  revertDate,
  existingPeriods = [],
  excludePeriodId,
  todayDate = todayHijriDate(),
}: {
  startDate: string;
  endDate?: string;
  dateOfBirth?: string;
  revertDate?: string;
  existingPeriods?: PeriodRangeLike[];
  excludePeriodId?: string;
  todayDate?: string;
}): PracticingPeriodValidationError | null {
  if (!startDate) {
    return { messageKey: 'onboarding.error_invalid_date', field: 'start', severity: 'error' };
  }

  let parsedStart: HijriDateValue;
  try {
    parsedStart = HijriDate.fromString(startDate);
  } catch {
    return { messageKey: 'onboarding.error_invalid_date', field: 'start', severity: 'error' };
  }

  const today = HijriDate.fromString(todayDate);
  if (parsedStart.isAfter(today)) {
    return { messageKey: 'onboarding.period_error_future_date', field: 'start', severity: 'error' };
  }

  if (dateOfBirth) {
    try {
      const dob = HijriDate.fromString(dateOfBirth);
      if (parsedStart.isBefore(dob)) {
        return {
          messageKey: 'onboarding.period_error_before_dob',
          field: 'start',
          severity: 'error',
        };
      }
    } catch {
      // Ignore invalid DOB input here; the DOB field validates independently.
    }
  }

  if (revertDate) {
    try {
      const revert = HijriDate.fromString(revertDate);
      if (parsedStart.isBefore(revert)) {
        return {
          messageKey: 'onboarding.period_error_before_revert',
          field: 'start',
          severity: 'error',
        };
      }
    } catch {
      // Ignore invalid revertDate input here.
    }
  }

  if (endDate) {
    let parsedEnd: HijriDateValue;
    try {
      parsedEnd = HijriDate.fromString(endDate);
    } catch {
      return { messageKey: 'onboarding.error_invalid_date', field: 'end', severity: 'error' };
    }

    if (parsedEnd.isBefore(parsedStart)) {
      return {
        messageKey: 'onboarding.period_error_end_before_start',
        field: 'end',
        severity: 'error',
      };
    }

    if (parsedEnd.isAfter(today)) {
      return { messageKey: 'onboarding.period_error_future_date', field: 'end', severity: 'error' };
    }
  }

  for (const [index, period] of existingPeriods.entries()) {
    try {
      const normalized = normalizePeriod(period, `period-${index}`);
      if (normalized.id === excludePeriodId) {
        continue;
      }

      if (rangesOverlap(startDate, endDate, normalized.startDate, normalized.endDate)) {
        return {
          messageKey: 'onboarding.period_error_overlap',
          field: 'form',
          severity: 'warning',
        };
      }
    } catch {
      // Ignore malformed stored periods so they don't block the current edit.
    }
  }

  return null;
}

export function isBulughBeforeDateOfBirth(
  dateOfBirth: string | undefined,
  bulughDate: string | undefined,
): boolean {
  if (!dateOfBirth || !bulughDate) {
    return false;
  }

  return HijriDate.fromString(bulughDate).isBefore(HijriDate.fromString(dateOfBirth));
}

export function estimateSalahDebt(
  bulughDate: string,
  periods: PeriodRangeLike[],
  todayDate = todayHijriDate(),
  revertDate?: string,
): number {
  const today = HijriDate.fromString(todayDate);
  const sortedPeriods = periods
    .filter((period) => periodCoversContext(period.type, 'salah'))
    .map((period, index) => normalizePeriod(period, `period-${index}`))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  let totalDaysMissed = 0;
  const bulugh = HijriDate.fromString(bulughDate);
  const effectiveStart =
    revertDate && HijriDate.fromString(revertDate).isAfter(bulugh)
      ? HijriDate.fromString(revertDate)
      : bulugh;

  // Early return: if effective start date is in the future, zero debt
  if (effectiveStart.isAfter(today)) {
    return 0;
  }

  let lastHandledDate = effectiveStart;

  for (const period of sortedPeriods) {
    const periodStart = HijriDate.fromString(period.startDate);
    if (lastHandledDate.isBefore(periodStart)) {
      totalDaysMissed += daysBetween(lastHandledDate, periodStart);
    }

    const effectiveEndDate = HijriDate.fromString(period.endDate ?? todayDate);
    const dayAfterPeriod = effectiveEndDate.addDays(1);
    if (sameOrBefore(lastHandledDate, dayAfterPeriod)) {
      lastHandledDate = dayAfterPeriod;
    }
  }

  if (lastHandledDate.isBefore(today)) {
    totalDaysMissed += daysBetween(lastHandledDate, today);
  }

  return totalDaysMissed * PRAYERS_PER_DAY;
}

export function getCoveredPracticingDays(
  periods: PeriodRangeLike[],
  context: PracticingCoverageContext,
  rangeStart: string,
  rangeEnd: string,
  todayDate = todayHijriDate(),
): CoveredPracticingDay[] {
  const today = HijriDate.fromString(todayDate);
  const start = HijriDate.fromString(rangeStart);
  const end = HijriDate.fromString(rangeEnd);
  const coveredDays: CoveredPracticingDay[] = [];

  periods
    .filter((period) => periodCoversContext(period.type, context))
    .map((period, index) => normalizePeriod(period, `period-${index}`))
    .forEach((period) => {
      const periodStart = HijriDate.fromString(period.startDate);
      const effectiveEnd = HijriDate.fromString(period.endDate ?? todayDate);
      const overlapStart = maxDate(start, periodStart);
      const overlapEnd = minDate(end, minDate(effectiveEnd, today));

      if (overlapEnd.isBefore(overlapStart)) {
        return;
      }

      let cursor = overlapStart;
      while (sameOrBefore(cursor, overlapEnd)) {
        coveredDays.push({
          date: cursor.toString(),
          periodId: period.id,
          type: period.type,
        });
        cursor = cursor.addDays(1);
      }
    });

  return coveredDays;
}
