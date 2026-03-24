import { HijriDate, PRAYERS_PER_DAY, type PracticingPeriodType } from '@awdah/shared';
import { todayHijriDate } from '@/utils/date-utils';

export type PracticingCoverageContext = 'salah' | 'sawm' | 'all';

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

function daysBetween(start: HijriDate, end: HijriDate): number {
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

function maxDate(a: HijriDate, b: HijriDate): HijriDate {
  return a.isAfter(b) ? a : b;
}

function minDate(a: HijriDate, b: HijriDate): HijriDate {
  return a.isBefore(b) ? a : b;
}

function sameOrBefore(a: HijriDate, b: HijriDate): boolean {
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
): number {
  const today = HijriDate.fromString(todayDate);
  const sortedPeriods = periods
    .filter((period) => periodCoversContext(period.type, 'salah'))
    .map((period, index) => normalizePeriod(period, `period-${index}`))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  let totalDaysMissed = 0;
  let lastHandledDate = HijriDate.fromString(bulughDate);

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
