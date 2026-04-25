import { todayHijriDate, addHijriDays } from '@/utils/date-utils';
import { getCoveredPracticingDays, type PeriodRangeLike } from '@/lib/practicing-periods';
import type { ChartDataPoint, DateRange } from './types';

export const computePracticingPeriodsRanges = (
  periods: PeriodRangeLike[] | null | undefined,
  practicingType: 'salah' | 'sawm' | undefined,
  chartData: ChartDataPoint[],
): DateRange[] => {
  if (!periods?.length || !practicingType) return [];

  const today = todayHijriDate();
  const sevenDaysAgo = addHijriDays(today, -6);
  const covered = getCoveredPracticingDays(periods, practicingType, sevenDaysAgo, today);
  const coveredDates = new Set(covered.map((d) => d.date));

  const ranges: DateRange[] = [];
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  for (const point of chartData) {
    if (coveredDates.has(point.date)) {
      if (!rangeStart) rangeStart = point.date;
      rangeEnd = point.date;
    } else {
      if (rangeStart && rangeEnd) ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = null;
      rangeEnd = null;
    }
  }

  if (rangeStart && rangeEnd) ranges.push({ start: rangeStart, end: rangeEnd });
  return ranges;
};
