import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computePracticingPeriodsRanges } from '../practicing-periods.service';
import { todayHijriDate, addHijriDays } from '../../../utils/date-utils';
import type { ChartDataPoint } from '../types';

const TODAY = '1446-10-15';

vi.mock('../../../utils/date-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/date-utils')>();
  return { ...actual, todayHijriDate: vi.fn(() => TODAY) };
});

function makeChartData(today: string): ChartDataPoint[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addHijriDays(today, -(6 - i)),
    day: 'X',
  }));
}

describe('computePracticingPeriodsRanges', () => {
  beforeEach(() => {
    vi.mocked(todayHijriDate).mockReturnValue(TODAY);
  });

  const chartData = makeChartData(TODAY);

  it('returns [] when periods is null', () => {
    expect(computePracticingPeriodsRanges(null, 'salah', chartData)).toEqual([]);
  });

  it('returns [] when periods is empty', () => {
    expect(computePracticingPeriodsRanges([], 'salah', chartData)).toEqual([]);
  });

  it('returns [] when practicingType is undefined', () => {
    const period = { startDate: addHijriDays(TODAY, -6), type: 'salah' as const };
    expect(computePracticingPeriodsRanges([period], undefined, chartData)).toEqual([]);
  });

  it('returns a single range when all 7 days are covered', () => {
    const period = {
      startDate: addHijriDays(TODAY, -10),
      endDate: TODAY,
      type: 'salah' as const,
    };
    const ranges = computePracticingPeriodsRanges([period], 'salah', chartData);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].start).toBe(chartData[0].date);
    expect(ranges[0].end).toBe(TODAY);
  });

  it('splits into two ranges when there is a gap in the middle', () => {
    // Cover days 0-2 and 4-6, leaving day 3 uncovered
    const gap = chartData[3].date;
    const period1 = {
      startDate: chartData[0].date,
      endDate: chartData[2].date,
      type: 'salah' as const,
    };
    const period2 = {
      startDate: chartData[4].date,
      endDate: chartData[6].date,
      type: 'salah' as const,
    };
    const ranges = computePracticingPeriodsRanges([period1, period2], 'salah', chartData);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].end).not.toBe(gap);
    expect(ranges[1].start).not.toBe(gap);
  });

  it('ignores periods of the wrong type', () => {
    const period = {
      startDate: addHijriDays(TODAY, -10),
      endDate: TODAY,
      type: 'sawm' as const,
    };
    expect(computePracticingPeriodsRanges([period], 'salah', chartData)).toEqual([]);
  });

  it('accepts both type for salah context', () => {
    const period = {
      startDate: addHijriDays(TODAY, -10),
      endDate: TODAY,
      type: 'both' as const,
    };
    const ranges = computePracticingPeriodsRanges([period], 'salah', chartData);
    expect(ranges).toHaveLength(1);
  });
});
