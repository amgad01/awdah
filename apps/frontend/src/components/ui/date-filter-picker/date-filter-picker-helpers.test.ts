import { describe, it, expect } from 'vitest';
import { HijriDate } from '@awdah/shared';
import {
  hijriDaysInMonth,
  hijriFirstWeekday,
  gregorianDaysInMonth,
  gregorianFirstWeekday,
} from './date-filter-picker-helpers';

describe('date-filter-picker-helpers', () => {
  describe('hijriDaysInMonth', () => {
    it('returns 30 for Ramadan 1445', () => {
      // Ramadan 1445 started 2024-03-11, Shawwal 1445 started 2024-04-10
      // 2024-04-10 - 2024-03-11 = 30 days
      const date = new HijriDate(1445, 9, 1);
      expect(hijriDaysInMonth(date.year, date.month)).toBe(30);
    });

    it("returns 29 for Sha'ban 1445", () => {
      // Sha'ban 1445 started 2024-02-11, Ramadan 1445 started 2024-03-11
      // 2024-03-11 - 2024-02-11 = 29 days
      expect(hijriDaysInMonth(1445, 8)).toBe(29);
    });
  });

  describe('hijriFirstWeekday', () => {
    it('returns 1 (Monday) for 1 Ramadan 1445', () => {
      // 1 Ramadan 1445 was 2024-03-11 (Monday)
      expect(hijriFirstWeekday(1445, 9)).toBe(1);
    });
  });

  describe('gregorianDaysInMonth', () => {
    it('returns 31 for January', () => {
      expect(gregorianDaysInMonth(2024, 1)).toBe(31);
    });

    it('returns 29 for February 2024 (leap year)', () => {
      expect(gregorianDaysInMonth(2024, 2)).toBe(29);
    });

    it('returns 28 for February 2023', () => {
      expect(gregorianDaysInMonth(2023, 2)).toBe(28);
    });
  });

  describe('gregorianFirstWeekday', () => {
    it('returns 1 (Monday) for 1 January 2024', () => {
      expect(gregorianFirstWeekday(2024, 1)).toBe(1);
    });
  });
});
