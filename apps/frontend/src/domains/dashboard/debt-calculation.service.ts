import type { WorshipLog } from '@/domains/charts';

export interface DebtProjection {
  totalDays: number;
  years: number;
  months: number;
}

export interface ObservedRateData {
  rate: number;
  qadaaCount: number;
  activeDays: number;
}

export const computeDebtTimeProjection = (
  remainingDebt: number,
  dailyRate: number,
  daysPerYear: number,
  monthsPerYear: number,
): DebtProjection => {
  if (remainingDebt <= 0 || dailyRate <= 0) {
    return { totalDays: 0, years: 0, months: 0 };
  }

  const totalDays = Math.ceil(remainingDebt / dailyRate);
  const years = Math.floor(totalDays / daysPerYear);
  const remainingDays = totalDays % daysPerYear;
  const months = Math.floor(remainingDays / (daysPerYear / monthsPerYear));

  return { totalDays, years, months };
};

export const computeObservedQadaaRate = (
  qadaaLogs: WorshipLog[],
  dateRange: { start: string; end: string },
): ObservedRateData | null => {
  if (!qadaaLogs?.length) return null;

  const qadaaInRange = qadaaLogs.filter(
    (log) => log.date >= dateRange.start && log.date <= dateRange.end && log.type === 'qadaa',
  );

  if (qadaaInRange.length === 0) return null;

  const uniqueDates = new Set(qadaaInRange.map((log) => log.date));
  const activeDays = uniqueDates.size;
  const qadaaCount = qadaaInRange.length;
  const rate = qadaaCount / activeDays;

  return { rate, qadaaCount, activeDays };
};
