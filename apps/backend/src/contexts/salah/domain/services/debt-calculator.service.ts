import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import { PRAYERS_PER_DAY } from '@awdah/shared';
import { IHijriCalendarService } from '../../../shared/domain/services/hijri-calendar.service';

export interface SalahDebtResult {
  totalDaysMissed: number;
  totalPrayersOwed: number;
  completedPrayers: number;
  remainingPrayers: number;
}

export class SalahDebtCalculator {
  constructor(private readonly calendarService: IHijriCalendarService) {}

  calculate(
    bulughDate: HijriDate,
    periods: PracticingPeriod[],
    completedQadaaCount: number,
    today: HijriDate,
  ): SalahDebtResult {
    // 1. Sort practicing periods by start date
    const sortedPeriods = [...periods].sort((a, b) => (a.startDate.isBefore(b.startDate) ? -1 : 1));

    let totalDaysMissed = 0;
    let lastHandledDate = bulughDate;

    // 2. Identify gaps between bulugh and practicing periods
    // Convention: gaps use [inclusive start, exclusive end).
    // lastHandledDate is always the START of the next possible gap,
    // i.e. the day AFTER the previous period ended.
    for (const period of sortedPeriods) {
      if (lastHandledDate.isBefore(period.startDate)) {
        // Gap = [lastHandledDate, period.startDate)
        totalDaysMissed += this.calendarService.daysBetween(lastHandledDate, period.startDate);
      }

      // The day after this period ends is where the next gap can begin.
      // For open-ended periods (currently practicing), use today as the effective end.
      const effectiveEndDate = period.endDate ?? today;
      const dayAfterPeriod = effectiveEndDate.addDays(1);
      if (lastHandledDate.isBefore(dayAfterPeriod) || lastHandledDate.equals(dayAfterPeriod)) {
        lastHandledDate = dayAfterPeriod;
      }
    }

    // 3. Final gap from last period end to today
    if (lastHandledDate.isBefore(today)) {
      totalDaysMissed += this.calendarService.daysBetween(lastHandledDate, today);
    }

    const totalPrayersOwed = totalDaysMissed * PRAYERS_PER_DAY;
    const remainingPrayers = Math.max(0, totalPrayersOwed - completedQadaaCount);

    return {
      totalDaysMissed,
      totalPrayersOwed,
      completedPrayers: completedQadaaCount,
      remainingPrayers,
    };
  }
}
