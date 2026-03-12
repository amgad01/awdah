import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SawmDebtCalculator } from '../sawm-debt-calculator.service';
import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../../../../salah/domain/entities/practicing-period.entity';
import { IHijriCalendarService } from '../../../../salah/domain/services/hijri-calendar.service';

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

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalFastingDaysMissed).toBe(0);
    expect(result.remainingFasts).toBe(0);
  });

  it('calculates debt if gap covers a full Ramadan', () => {
    const bulugh = new HijriDate(1444, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    // Ramadan 1444 is in the gap
    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    // daysBetween is called for overlap: 1444-09-01 to 1444-09-30
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalFastingDaysMissed).toBe(30);
    expect(result.remainingFasts).toBe(30);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledWith(1444);
  });

  it('calculates debt for partial Ramadan overlap', () => {
    const bulugh = new HijriDate(1444, 9, 15); // Started gap mid-Ramadan
    const today = new HijriDate(1444, 10, 1);

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    // Overlap: 1444-09-15 to 1444-09-30 (16 days)
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(16);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalFastingDaysMissed).toBe(16);
  });

  it('handles multiple years with multiple Ramadans', () => {
    const bulugh = new HijriDate(1443, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    // Gap covers Ramadan 1443 and 1444
    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30);

    const result = calculator.calculate(bulugh, [], 0, today);

    expect(result.totalFastingDaysMissed).toBe(60);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledTimes(3);
  });

  it('works correctly with practicing periods', () => {
    const bulugh = new HijriDate(1444, 1, 1);
    const practiceStart = new HijriDate(1444, 8, 1);
    const practiceEnd = new HijriDate(1445, 1, 1);
    const today = new HijriDate(1445, 10, 1);

    const period = new PracticingPeriod({
      userId: 'u',
      periodId: 'p1',
      startDate: practiceStart,
      endDate: practiceEnd,
      type: 'both',
    });

    // Gap 1: 1444-01-01 to 1444-08-01 (No Ramadan 1444)
    // Practice: 1444-08-01 to 1445-01-01 (Covers Ramadan 1444) - NOT missed
    // Gap 2: 1445-01-01 to 1445-10-01 (Covers Ramadan 1445) - MISSED

    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(29);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(29);

    const result = calculator.calculate(bulugh, [period], 0, today);

    // Only Ramadan 1445 should be counted
    expect(result.totalFastingDaysMissed).toBe(29);
    expect(mockCalendar.getRamadanDays).toHaveBeenCalledWith(1445);
    // It might be called for 1444 depending on start/end, but overlap logic should handle it
  });
});
