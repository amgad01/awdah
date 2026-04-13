import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalahDebtCalculator } from '../debt-calculator.service';
import { HijriDate, UserId, PeriodId } from '@awdah/shared';
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
      userId: new UserId('user-1'),
      periodId: new PeriodId('period-1'),
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
        userId: new UserId('u'),
        periodId: new PeriodId('1'),
        startDate: p1Start,
        endDate: p1End,
        type: 'salah',
      }),
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('2'),
        startDate: p2Start,
        endDate: today,
        type: 'salah',
      }),
    ];

    // Gap 1: bulugh → p1Start (354 days)
    // Gap 2: p1End.addDays(1) → p2Start (180 days)
    // No final gap: p2End.addDays(1) > today
    vi.mocked(mockCalendar.daysBetween)
      .mockReturnValueOnce(354) // Gap 1
      .mockReturnValueOnce(180); // Gap 2

    const result = calculator.calculate(bulugh, periods, 0, today);

    expect(result.totalDaysMissed).toBe(354 + 180);
    expect(mockCalendar.daysBetween).toHaveBeenCalledTimes(2);
  });

  it('does not count the last practicing day as missed (off-by-one boundary)', () => {
    // P1 ends on day 5, P2 starts on day 8. Gap = days 6, 7 = 2 days.
    const bulugh = new HijriDate(1445, 1, 1);
    const p1End = new HijriDate(1445, 1, 5);
    const p2Start = new HijriDate(1445, 1, 8);
    const today = new HijriDate(1445, 2, 1);

    const periods = [
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p1'),
        startDate: bulugh,
        endDate: p1End,
        type: 'salah',
      }),
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p2'),
        startDate: p2Start,
        endDate: today,
        type: 'salah',
      }),
    ];

    // Expect one daysBetween call for the gap between periods: [p1End+1, p2Start)
    vi.mocked(mockCalendar.daysBetween).mockReturnValueOnce(2);

    const result = calculator.calculate(bulugh, periods, 0, today);

    expect(result.totalDaysMissed).toBe(2);
    // Verify the gap boundaries passed to daysBetween are correct
    expect(mockCalendar.daysBetween).toHaveBeenCalledWith(
      p1End.addDays(1), // 1445-01-06 — day after practice ended
      p2Start, // 1445-01-08 — exclusive end
    );
  });

  it('produces zero missed days when two periods are directly adjacent', () => {
    // P1 ends on 1445-01-05, P2 starts on 1445-01-06 — no gap
    const bulugh = new HijriDate(1445, 1, 1);
    const p1End = new HijriDate(1445, 1, 5);
    const p2Start = new HijriDate(1445, 1, 6);
    const today = new HijriDate(1445, 2, 1);

    const periods = [
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p1'),
        startDate: bulugh,
        endDate: p1End,
        type: 'salah',
      }),
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p2'),
        startDate: p2Start,
        endDate: today,
        type: 'salah',
      }),
    ];

    const result = calculator.calculate(bulugh, periods, 0, today);

    expect(result.totalDaysMissed).toBe(0);
    expect(mockCalendar.daysBetween).not.toHaveBeenCalled();
  });

  it('counts all days from bulugh to today when there are no practicing periods', () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    vi.mocked(mockCalendar.daysBetween).mockReturnValueOnce(1770);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalDaysMissed).toBe(1770);
    expect(mockCalendar.daysBetween).toHaveBeenCalledWith(bulugh, today);
  });
  it('skips periods that start before lastHandledDate (branch coverage for line 40)', () => {
    const bulugh = new HijriDate(1445, 1, 1);
    const p1Start = new HijriDate(1445, 1, 1);
    const p1End = new HijriDate(1445, 1, 10);
    const p2Start = new HijriDate(1445, 1, 5);
    const p2End = new HijriDate(1445, 1, 15);
    const today = new HijriDate(1445, 1, 20);

    const periods = [
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p1'),
        startDate: p1Start,
        endDate: p1End,
        type: 'salah',
      }),
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p2'),
        startDate: p2Start,
        endDate: p2End,
        type: 'salah',
      }),
    ];

    vi.mocked(mockCalendar.daysBetween).mockReturnValueOnce(5); // Day 16 to 20

    const result = calculator.calculate(bulugh, periods, 0, today);
    expect(result.totalDaysMissed).toBe(5);
  });
});
