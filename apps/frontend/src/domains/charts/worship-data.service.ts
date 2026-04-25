import { todayHijriDate, addHijriDays, hijriToGregorianDate } from '@/utils/date-utils';
import type { ChartDataPoint } from './types';

export interface WorshipLog {
  date: string;
  type: string;
}

/**
 * Transforms raw worship logs into 7-day chart data points.
 *
 * When both salah and sawm logs are provided (combined chart), sawm series use
 * prefixed keys (`fastObligatory`, `fastQadaa`) to avoid colliding with salah
 * keys (`obligatory`, `qadaa`). When only sawm logs are provided (sawm-only
 * chart), the unprefixed keys are used so `SAWM_CHART_SERIES` dataKeys match.
 */
export const transformWorshipData = (
  salahLogs: WorshipLog[] | null | undefined,
  sawmLogs: WorshipLog[] | null | undefined,
  locale: string,
): ChartDataPoint[] => {
  const today = todayHijriDate();
  // `isCombined` is true when salahLogs is a non-null value (including empty array).
  // An empty salah array still signals a combined chart context, so sawm uses
  // prefixed keys (`fastObligatory`, `fastQadaa`) to avoid key collisions.
  // Use `hasSalahContext` to make this intent explicit.
  const hasSalahContext = salahLogs != null;

  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = addHijriDays(today, -(6 - i));
    const gregorianDate = hijriToGregorianDate(dateStr);
    const day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(gregorianDate);

    const dataPoint: ChartDataPoint = { date: dateStr, day };

    if (salahLogs?.length) {
      dataPoint.obligatory = salahLogs.filter(
        (l) => l.date === dateStr && l.type === 'obligatory',
      ).length;
      dataPoint.qadaa = salahLogs.filter((l) => l.date === dateStr && l.type === 'qadaa').length;
    }

    if (sawmLogs?.length) {
      const obligatoryKey = hasSalahContext ? 'fastObligatory' : 'obligatory';
      const qadaaKey = hasSalahContext ? 'fastQadaa' : 'qadaa';

      dataPoint[obligatoryKey] = sawmLogs.filter(
        (l) => l.date === dateStr && (l.type === 'ramadan' || l.type === 'obligatory'),
      ).length;
      dataPoint[qadaaKey] = sawmLogs.filter((l) => l.date === dateStr && l.type === 'qadaa').length;
    }

    return dataPoint;
  });
};
