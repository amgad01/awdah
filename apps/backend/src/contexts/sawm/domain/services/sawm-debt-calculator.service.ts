import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import { IHijriCalendarService } from '../../../shared/domain/services/hijri-calendar.service';

export interface SawmDebtResult {
  totalFastingDaysMissed: number;
  completedFasts: number;
  remainingFasts: number;
}

export class SawmDebtCalculator {
  constructor(private readonly calendarService: IHijriCalendarService) {}

  calculate(
    bulughDate: HijriDate,
    periods: PracticingPeriod[],
    completedQadaaCount: number,
    today: HijriDate,
  ): SawmDebtResult {
    const sortedPeriods = [...periods].sort((a, b) => (a.startDate.isBefore(b.startDate) ? -1 : 1));

    let totalFastingDaysMissed = 0;

    // Gap 1: from bulugh to first period
    if (sortedPeriods.length > 0 && bulughDate.isBefore(sortedPeriods[0]!.startDate)) {
      totalFastingDaysMissed += this.calculateRamadanDaysInGap(
        bulughDate,
        sortedPeriods[0]!.startDate,
      );
    } else if (sortedPeriods.length === 0) {
      totalFastingDaysMissed += this.calculateRamadanDaysInGap(bulughDate, today);
    }

    // Intermediate gaps
    // Convention: [inclusive start, exclusive end).
    // gapStart = day AFTER the previous period ended — the last practicing day is not missed.
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const prevEffectiveEnd = sortedPeriods[i]!.endDate ?? today;
      const gapStart = prevEffectiveEnd.addDays(1);
      const gapEnd = sortedPeriods[i + 1]!.startDate;

      if (gapStart.isBefore(gapEnd)) {
        totalFastingDaysMissed += this.calculateRamadanDaysInGap(gapStart, gapEnd);
      }
    }

    // Final gap: from day after last period ends until today (exclusive)
    // Open-ended last period means no final gap.
    if (sortedPeriods.length > 0) {
      const lastPeriod = sortedPeriods[sortedPeriods.length - 1]!;
      if (!lastPeriod.isOpenEnded) {
        const gapStart = lastPeriod.endDate!.addDays(1);
        if (gapStart.isBefore(today)) {
          totalFastingDaysMissed += this.calculateRamadanDaysInGap(gapStart, today);
        }
      }
    }

    const remainingFasts = Math.max(0, totalFastingDaysMissed - completedQadaaCount);

    return {
      totalFastingDaysMissed,
      completedFasts: completedQadaaCount,
      remainingFasts,
    };
  }

  private calculateRamadanDaysInGap(start: HijriDate, end: HijriDate): number {
    let missedDays = 0;

    // Iterate each Hijri year that could overlap with the gap.
    // Gap convention: [start, end) — start is inclusive, end is exclusive.
    // Ramadan convention: [ramadanDay1, ramadanExclusiveEnd) where
    //   ramadanExclusiveEnd = first day of Shawwal (month 10, day 1).
    // overlap = [max(start, ramadanDay1), min(end, ramadanExclusiveEnd))
    // daysBetween(overlapStart, overlapEnd) counts days in an exclusive-end range.
    for (let year = start.year; year <= end.year; year++) {
      const ramadanStart = new HijriDate(year, 9, 1);
      const ramadanDays = this.calendarService.getRamadanDays(year);
      const ramadanExclusiveEnd = new HijriDate(year, 9, ramadanDays).addDays(1);

      const overlapStart = this.maxDate(start, ramadanStart);
      const overlapEnd = this.minDate(end, ramadanExclusiveEnd);

      if (overlapStart.isBefore(overlapEnd)) {
        missedDays += this.calendarService.daysBetween(overlapStart, overlapEnd);
      }
    }

    return missedDays;
  }

  private maxDate(a: HijriDate, b: HijriDate): HijriDate {
    return a.isAfter(b) ? a : b;
  }

  private minDate(a: HijriDate, b: HijriDate): HijriDate {
    return a.isBefore(b) ? a : b;
  }
}
