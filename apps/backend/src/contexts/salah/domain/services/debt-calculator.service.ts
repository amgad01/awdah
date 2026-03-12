import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../entities/practicing-period.entity';
import { PRAYERS_PER_DAY } from '@awdah/shared';
import { IHijriCalendarService } from './hijri-calendar.service';

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
    for (const period of sortedPeriods) {
      if (lastHandledDate.isBefore(period.startDate)) {
        // There is a gap before this period starts
        totalDaysMissed += this.calendarService.daysBetween(lastHandledDate, period.startDate);
      }

      // Update lastHandledDate to the day after the period ends
      // Since we don't have a "nextDay" method yet, we use the period end date
      // but the rule is: gap is from end of one to start of next.
      // If end of P1 is 1445-01-01 and start of P2 is 1445-01-05, gap is 4 days.
      if (lastHandledDate.isBefore(period.endDate) || lastHandledDate.equals(period.endDate)) {
        lastHandledDate = period.endDate;
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
