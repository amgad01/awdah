import { HijriDate } from '@awdah/shared';

export interface IHijriCalendarService {
  daysBetween(start: HijriDate, end: HijriDate): number;
  getRamadanDays(year: number): number;
  today(): HijriDate;
}
