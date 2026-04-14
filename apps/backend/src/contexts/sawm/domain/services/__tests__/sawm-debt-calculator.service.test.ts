import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SawmDebtCalculator } from '../sawm-debt-calculator.service';
import { HijriDate, UserId, PeriodId } from '@awdah/shared';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { IHijriCalendarService } from '../../../../shared/domain/services/hijri-calendar.service';

describe('SawmDebtCalculator', () => {
  const mockCalendar: IHijriCalendarService = {
    daysBetween: vi.fn(),
    getRamadanDays: vi.fn(),
    today: vi.fn(),
  };

  const calculator = new SawmDebtCalculator(mockCalendar);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates zero debt if no gap overlaps with Ramadan', () => {
    const bulugh = new HijriDate(1445, 1, 1);
    const today = new HijriDate(1445, 8, 29); // Gap before Ramadan 1445

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalDaysOwed).toBe(0);
    expect(result.remainingDays).toBe(0);
  });

  it('calculates debt if gap covers a full Ramadan', () => {
    const bulugh = new HijriDate(1444, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalDaysOwed).toBe(30);
    expect(result.remainingDays).toBe(30);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledWith(1444);
  });

  it('calculates debt for partial Ramadan overlap', () => {
    const bulugh = new HijriDate(1444, 9, 15); // Started gap mid-Ramadan
    const today = new HijriDate(1444, 10, 1);

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    // daysBetween(1444-09-15, 1444-10-01) — 16 remaining days of Ramadan
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(16);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalDaysOwed).toBe(16);
  });

  it('handles multiple years with multiple Ramadans', () => {
    const bulugh = new HijriDate(1443, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    // Gap covers Ramadan 1443 and 1444
    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalDaysOwed).toBe(60);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledTimes(3);
  });

  it('works correctly with practicing periods', () => {
    const bulugh = new HijriDate(1444, 1, 1);
    const practiceStart = new HijriDate(1444, 8, 1);
    const practiceEnd = new HijriDate(1445, 1, 1);
    const today = new HijriDate(1445, 10, 1);

    const period = new PracticingPeriod({
      userId: new UserId('u'),
      periodId: new PeriodId('p1'),
      startDate: practiceStart,
      endDate: practiceEnd,
      type: 'both',
    });

    // Gap 1: 1444-01-01 to 1444-08-01 (no Ramadan — Ramadan starts month 9)
    // Practice: 1444-08-01 to 1445-01-01 (covers Ramadan 1444 — not missed)
    // Gap 2: 1445-01-02 to 1445-10-01 (covers Ramadan 1445 — missed)

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(29);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(29);

    const result = calculator.calculate(bulugh, [period], 0, today);

    // Only Ramadan 1445 should be counted
    expect(result.totalDaysOwed).toBe(29);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledWith(1445);
  });

  it('passes exclusive end (first day of Shawwal) to daysBetween for a full Ramadan', () => {
    // Uses year 1443 because Ramadan 1443 has 30 days per the Umm al-Qura calendar,
    // matching the mocked getRamadanDays value. Year 1444 has only 29 days and would
    // cause addDays(30) to overflow incorrectly.
    const bulugh = new HijriDate(1443, 1, 1);
    const today = new HijriDate(1444, 1, 1);

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    calculator.calculate(bulugh, [], 0, today);

    // Ramadan 1443: days 1–30, so exclusive end is month 10 day 1 (first of Shawwal)
    expect(mockCalendar.daysBetween).toHaveBeenCalledWith(
      new HijriDate(1443, 9, 1), // first day of Ramadan
      new HijriDate(1443, 10, 1), // first day of Shawwal — exclusive end
    );
  });

  it('does not count the last practicing day of Ramadan as a missed fast', () => {
    // Uses year 1443 because Ramadan 1443 has 30 days per the Umm al-Qura calendar.
    // Practice ends on 1443-09-20 (day 20 of Ramadan).
    // Gap starts on 1443-09-21. Days 21–30 of Ramadan (10 days) are missed.
    const bulugh = new HijriDate(1443, 1, 1);
    const p1End = new HijriDate(1443, 9, 20);
    const today = new HijriDate(1444, 1, 1);

    const period = new PracticingPeriod({
      userId: new UserId('u'),
      periodId: new PeriodId('p1'),
      startDate: bulugh,
      endDate: p1End,
      type: 'sawm',
    });

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(10); // days 21–30 of Ramadan

    const result = calculator.calculate(bulugh, [period], 0, today);

    // Final gap starts at 1443-09-21 (day after practice ended)
    expect(result.totalDaysOwed).toBe(10);
    expect(mockCalendar.daysBetween).toHaveBeenCalledWith(
      new HijriDate(1443, 9, 21), // day after practice ended — gap start
      new HijriDate(1443, 10, 1), // first of Shawwal — exclusive Ramadan end
    );
  });

  it('produces zero fasting debt when adjacent periods leave no gap', () => {
    // P1 ends 1444-06-10, P2 starts 1444-06-11 — no gap
    const bulugh = new HijriDate(1444, 1, 1);
    const p1End = new HijriDate(1444, 6, 10);
    const p2Start = new HijriDate(1444, 6, 11);
    const today = new HijriDate(1445, 1, 1);

    const periods = [
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p1'),
        startDate: bulugh,
        endDate: p1End,
        type: 'sawm',
      }),
      new PracticingPeriod({
        userId: new UserId('u'),
        periodId: new PeriodId('p2'),
        startDate: p2Start,
        endDate: today,
        type: 'sawm',
      }),
    ];

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);

    const result = calculator.calculate(bulugh, periods, 0, today);

    // Gap = [p1End+1, p2Start) = [1444-06-11, 1444-06-11) = empty
    // No Ramadan in an empty gap
    expect(result.totalDaysOwed).toBe(0);
    expect(mockCalendar.daysBetween).not.toHaveBeenCalled();
  });

  it('subtracts completed fasts from total owed', () => {
    const bulugh = new HijriDate(1444, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 12, today);

    expect(result.totalDaysOwed).toBe(30);
    expect(result.completedDays).toBe(12);
    expect(result.remainingDays).toBe(18);
  });
});
