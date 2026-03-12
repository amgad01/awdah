import uq from '@umalqura/core';
import { IHijriCalendarService } from '../../../contexts/salah/domain/services/hijri-calendar.service';
import { HijriDate } from '@awdah/shared';

export class UmAlQuraCalendarService implements IHijriCalendarService {
  daysBetween(start: HijriDate, end: HijriDate): number {
    const startUq = uq(start.year, start.month, start.day);
    const endUq = uq(end.year, end.month, end.day);

    const diffMs = endUq.date.getTime() - startUq.date.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  getRamadanDays(year: number): number {
    // Ramadan is the 9th month
    return uq(year, 9, 1).daysInMonth;
  }

  today(): HijriDate {
    const now = uq();
    return new HijriDate(now.hy, now.hm, now.hd);
  }
}
