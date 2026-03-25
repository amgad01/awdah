import { HijriDate } from '@awdah/shared';

export function hijriDaysInMonth(year: number, month: number): number {
  const nextM = month === 12 ? new HijriDate(year + 1, 1, 1) : new HijriDate(year, month + 1, 1);
  const gregNextM = nextM.toGregorian();
  const lastGregDay = new Date(gregNextM.getTime() - 86_400_000);
  return HijriDate.fromGregorian(lastGregDay).day;
}

export function hijriFirstWeekday(year: number, month: number): number {
  // 0 = Sunday … 6 = Saturday
  return new HijriDate(year, month, 1).toGregorian().getUTCDay();
}

export function gregorianDaysInMonth(year: number, month: number): number {
  // month is 1-based; passing 0 as day gives last day of previous month
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function gregorianFirstWeekday(year: number, month: number): number {
  // 0 = Sunday … 6 = Saturday
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}
