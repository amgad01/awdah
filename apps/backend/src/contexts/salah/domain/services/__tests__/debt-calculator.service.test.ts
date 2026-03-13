import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalahDebtCalculator } from '../debt-calculator.service';
import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { IHijriCalendarService } from '../../../../shared/domain/services/hijri-calendar.service';

describe('SalahDebtCalculator', () => {
  const mockCalendar: IHijriCalendarService = {
    daysBetween: vi.fn(),
    getRamadanDays: vi.fn(),
    today: vi.fn(),
  };

  const calculator = new SalahDebtCalculator(mockCalendar);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates zero debt if bulugh equals today and no gaps', () => {
    const today = new HijriDate(1445, 1, 1);
    const result = calculator.calculate(today, [], 0, today);

    expect(result.remainingPrayers).toBe(0);
    expect(result.totalDaysMissed).toBe(0);
  });

  it('calculates debt from a single gap before practice', () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const practiceStart = new HijriDate(1441, 1, 1);
    const today = new HijriDate(1442, 1, 1);

    const period = new PracticingPeriod({
      userId: 'user-1',
      periodId: 'period-1',
      startDate: practiceStart,
      endDate: today,
      type: 'salah',
    });

    // Gap is from bulugh (1440) to practiceStart (1441)
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(354); // roughly 1 hijri year

    const result = calculator.calculate(bulugh, [period], 0, today);

    expect(result.totalDaysMissed).toBe(354);
    expect(result.totalPrayersOwed).toBe(354 * 5);
    expect(result.remainingPrayers).toBe(354 * 5);
  });

  it('subtracts completed qadaa prayers', () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const today = new HijriDate(1440, 1, 11); // 10 day gap

    vi.mocked(mockCalendar.daysBetween).mockReturnValue(10);

    const result = calculator.calculate(bulugh, [], 15, today);

    expect(result.totalPrayersOwed).toBe(50);
    expect(result.remainingPrayers).toBe(35); // 50 - 15
  });

  it('handles multiple gaps correctly', () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const p1Start = new HijriDate(1441, 1, 1);
    const p1End = new HijriDate(1441, 6, 1);
    const p2Start = new HijriDate(1442, 1, 1);
    const today = new HijriDate(1443, 1, 1);

    const periods = [
      new PracticingPeriod({
        userId: 'u',
        periodId: '1',
        startDate: p1Start,
        endDate: p1End,
        type: 'salah',
      }),
      new PracticingPeriod({
        userId: 'u',
        periodId: '2',
        startDate: p2Start,
        endDate: today,
        type: 'salah',
      }),
    ];

    // Gap 1: bulugh to p1Start (354 days)
    // Gap 2: p1End to p2Start (say 180 days)
    // No gap after p2 as it ends "today"

    vi.mocked(mockCalendar.daysBetween)
      .mockReturnValueOnce(354) // Gap 1
      .mockReturnValueOnce(180); // Gap 2

    const result = calculator.calculate(bulugh, periods, 0, today);

    expect(result.totalDaysMissed).toBe(354 + 180);
    expect(mockCalendar.daysBetween).toHaveBeenCalledTimes(2);
  });
});
