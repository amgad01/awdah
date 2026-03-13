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
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const currentEnd = sortedPeriods[i]!.endDate;
      const nextStart = sortedPeriods[i + 1]!.startDate;

      if (currentEnd.isBefore(nextStart)) {
        totalFastingDaysMissed += this.calculateRamadanDaysInGap(currentEnd, nextStart);
      }
    }

    // Final gap
    if (sortedPeriods.length > 0) {
      const lastEnd = sortedPeriods[sortedPeriods.length - 1]!.endDate;
      if (lastEnd.isBefore(today)) {
        totalFastingDaysMissed += this.calculateRamadanDaysInGap(lastEnd, today);
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

    // We iterate through each year in the gap and check for Ramadan
    // Ramadan is the 9th month.
    for (let year = start.year; year <= end.year; year++) {
      const ramadanStart = new HijriDate(year, 9, 1);
      const ramadanEnd = new HijriDate(year, 9, this.calendarService.getRamadanDays(year));

      // Check if Ramadan overlaps with the [start, end] gap
      // Overlap [A, B] and [C, D] is: max(A, C) to min(B, D)
      const overlapStart = this.maxDate(start, ramadanStart);
      const overlapEnd = this.minDate(end, ramadanEnd);

      if (overlapStart.isBefore(overlapEnd) || overlapStart.equals(overlapEnd)) {
        // There is an overlap. Calculate days (+1 because dates inclusive)
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
