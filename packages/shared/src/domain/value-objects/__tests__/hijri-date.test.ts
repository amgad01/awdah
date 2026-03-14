import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { HijriDate } from '../hijri-date';

describe('HijriDate', () => {
  // Mock Intl.DateTimeFormat to return Islamic parts regardless of environment support
  beforeAll(() => {
    vi.stubGlobal('Intl', {
      DateTimeFormat: class {
        format() {
          return '1445/09/01';
        }
        formatToParts() {
          return [
            { type: 'year', value: '1445' },
            { type: 'month', value: '9' },
            { type: 'day', value: '1' },
          ];
        }
        resolvedOptions() {
          return {};
        }
      },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('should create a HijriDate from string', () => {
    const date = HijriDate.fromString('1445-09-01');
    expect(date.toString()).toBe('1445-09-01');
    expect(date.year).toBe(1445);
    expect(date.month).toBe(9);
    expect(date.day).toBe(1);
  });

  it('should throw error for invalid format', () => {
    expect(() => HijriDate.fromString('1445-13-01')).toThrow();
    expect(() => HijriDate.fromString('1445-09-35')).toThrow();
    expect(() => HijriDate.fromString('invalid')).toThrow();
  });

  it('should create a HijriDate from Date object using fromGregorian', () => {
    const date = new Date('2024-03-11T00:00:00Z');
    const hijri = HijriDate.fromGregorian(date);
    expect(hijri.toString()).toBe('1445-09-01');
  });

  it('should correctly format date with leading zeros', () => {
    const date = HijriDate.fromString('1445-01-05');
    expect(date.toString()).toBe('1445-01-05');
  });

  it('should check if one date is before another', () => {
    const d1 = HijriDate.fromString('1445-08-30');
    const d2 = HijriDate.fromString('1445-09-01');
    const d3 = HijriDate.fromString('1445-09-01');
    const d4 = HijriDate.fromString('1445-09-02');

    expect(d1.isBefore(d2)).toBe(true);
    expect(d2.isBefore(d1)).toBe(false);
    expect(d3.isBefore(d4)).toBe(true); // Same year/month, different day
    expect(d4.isBefore(d3)).toBe(false);
  });

  it('should check if one date is after another', () => {
    const d1 = HijriDate.fromString('1445-09-02');
    const d2 = HijriDate.fromString('1445-09-01');
    const d3 = HijriDate.fromString('1445-09-01');
    const d4 = HijriDate.fromString('1445-08-30');

    expect(d1.isAfter(d2)).toBe(true);
    expect(d2.isAfter(d1)).toBe(false);
    expect(d3.isAfter(d4)).toBe(true); // Same year, different month
    expect(d2.isAfter(d3)).toBe(false); // Same year/month/day
  });

  it('should check for equality', () => {
    const d1 = HijriDate.fromString('1445-09-01');
    const d2 = HijriDate.fromString('1445-09-01');
    const d3 = HijriDate.fromString('1445-09-02');
    expect(d1.equals(d2)).toBe(true);
    expect(d1.equals(d3)).toBe(false);
  });

  it('should check if it is Ramadan', () => {
    expect(HijriDate.fromString('1445-09-01').isRamadan()).toBe(true);
    expect(HijriDate.fromString('1445-08-30').isRamadan()).toBe(false);
  });

  it('should add days correctly', () => {
    const start = HijriDate.fromString('1445-01-01');

    // Simple add
    expect(start.addDays(5).toString()).toBe('1445-01-06');

    // Month wrap (assuming 30 days)
    expect(start.addDays(30).toString()).toBe('1445-02-01');

    // Year wrap
    expect(start.addDays(360).toString()).toBe('1446-01-01');

    // Subtract days
    expect(start.addDays(-1).toString()).toBe('1444-12-30');
  });

  it('should convert to object', () => {
    const date = HijriDate.fromString('1445-09-01');
    const obj = date.toObject();
    expect(obj.year).toBe(1445);
    expect(obj.month).toBe(9);
    expect(obj.day).toBe(1);
  });

  it('should create from object', () => {
    const obj = { year: 1445, month: 9, day: 1 };
    const date = HijriDate.fromObject(obj);
    expect(date.toString()).toBe('1445-09-01');
  });

  it('should get today as HijriDate', () => {
    const today = HijriDate.today();
    expect(today).toBeInstanceOf(HijriDate);
    expect(today.year).toBe(1445); // Mocked
  });

  it('should throw error for NaN components in fromString', () => {
    expect(() => HijriDate.fromString('year-month-day')).toThrow('Invalid Hijri date components');
  });

  it('should throw error for out of range components', () => {
    expect(() => new HijriDate(0, 1, 1)).toThrow('Hijri year must be positive');
    expect(() => new HijriDate(1445, 0, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 13, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 1, 0)).toThrow('Hijri day must be between 1 and 30');
    expect(() => new HijriDate(1445, 1, 31)).toThrow('Hijri day must be between 1 and 30');
  });

  it('should convert to and from object', () => {
    const date = HijriDate.fromString('1445-09-01');
    const obj = date.toObject();
    const fromObj = HijriDate.fromObject(obj);
    expect(fromObj.equals(date)).toBe(true);
  });

  it('should get today as HijriDate', () => {
    const today = HijriDate.today();
    expect(today).toBeInstanceOf(HijriDate);
    expect(today.year).toBe(1445); // mocked in beforeAll
  });

  it('should handle complex day addition/subtraction wraps', () => {
    const start = HijriDate.fromString('1445-01-01');
    // Add 400 days (more than a year)
    // 400 / 30 = 13 months and 10 days. 13 months = 1 year and 1 month.
    // 1445-01-01 + 1y 1m 10d = 1446-02-11
    expect(start.addDays(400).toString()).toBe('1446-02-11');

    // Subtract 400 days
    expect(start.addDays(-400).toString()).toBe('1443-11-21');
  });

  it('should handle missing date parts in fromGregorian using fallbacks', () => {
    const originalDTF = Intl.DateTimeFormat;
    vi.stubGlobal('Intl', {
      DateTimeFormat: class {
        format() {
          return '';
        }
        formatToParts() {
          return [];
        } // Empty parts to trigger fallbacks
        resolvedOptions() {
          return {};
        }
      },
    });

    const hijri = HijriDate.fromGregorian(new Date());
    expect(hijri.year).toBe(1445);
    expect(hijri.month).toBe(1);
    expect(hijri.day).toBe(1);

    vi.stubGlobal('Intl', { DateTimeFormat: originalDTF });
  });

  it('should throw validation errors for invalid HijriDate components', () => {
    expect(() => new HijriDate(0, 5, 5)).toThrow('Hijri year must be positive');
    expect(() => new HijriDate(1445, 13, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 9, 31)).toThrow('Hijri day must be between 1 and 30');
  });

  it('should throw validation error for invalid string format', () => {
    expect(() => HijriDate.fromString('invalid')).toThrow('Invalid Hijri date format');
    expect(() => HijriDate.fromString('1445-09')).toThrow('Invalid Hijri date format');
    expect(() => HijriDate.fromString('year-month-day')).toThrow('Invalid Hijri date components');
  });

  it('should check if one date is before another (branch coverage)', () => {
    const d1 = HijriDate.fromString('1445-09-01');
    const d2 = HijriDate.fromString('1445-09-01');
    const d3 = HijriDate.fromString('1445-10-01');
    const d4 = HijriDate.fromString('1445-09-02');

    expect(d1.isBefore(d2)).toBe(false); // same
    expect(d1.isBefore(d3)).toBe(true); // same year, different month
    expect(d1.isBefore(d4)).toBe(true); // same year/month, different day
  });

  it('should check if one date is after another (branch coverage)', () => {
    const d1 = HijriDate.fromString('1445-09-02');
    const d2 = HijriDate.fromString('1445-09-02');
    const d3 = HijriDate.fromString('1445-08-30');
    const d4 = HijriDate.fromString('1445-09-01');

    expect(d1.isAfter(d2)).toBe(false); // same
    expect(d1.isAfter(d3)).toBe(true); // same year, different month
    expect(d1.isAfter(d4)).toBe(true); // same year/month, different day
  });

  it('should handle complex day addition/subtraction wraps (branch coverage)', () => {
    const start = HijriDate.fromString('1445-01-01');
    // Subtract 40 days: 1 month + 10 days = 1443-11-21 (wait, 1445-01-01 minus 40...
    // 1445-01-01 -> 1444-12-01 (minus 30) -> 1444-11-21 (minus 10)
    expect(start.addDays(-40).toString()).toBe('1444-11-21');

    // Add 400 days: 13 months + 10 days.
    expect(start.addDays(400).toString()).toBe('1446-02-11');
  });

  it('should handle missing date parts in fromGregorian using fallbacks', () => {
    const originalDTF = Intl.DateTimeFormat;
    vi.stubGlobal('Intl', {
      DateTimeFormat: class {
        format() {
          return '';
        }
        formatToParts() {
          return [];
        }
        resolvedOptions() {
          return {};
        }
      },
    });

    const hijri = HijriDate.fromGregorian(new Date());
    expect(hijri.year).toBe(1445);
    expect(hijri.month).toBe(1);
    expect(hijri.day).toBe(1);

    vi.stubGlobal('Intl', { DateTimeFormat: originalDTF });
  });

  it('should cover all branches in comparison methods', () => {
    const d1 = HijriDate.fromString('1445-09-01');
    const d2 = HijriDate.fromString('1445-09-01');
    const d3 = HijriDate.fromString('1445-10-01');
    const d4 = HijriDate.fromString('1445-09-02');

    expect(d1.isBefore(d2)).toBe(false);
    expect(d1.isBefore(d3)).toBe(true);
    expect(d1.isBefore(d4)).toBe(true);

    expect(d1.isAfter(d2)).toBe(false);
    expect(d1.isAfter(d3)).toBe(false);
    expect(d4.isAfter(d1)).toBe(true);
  });

  it('should format date for Arabic locale', () => {
    const d = HijriDate.fromString('1445-09-01');
    expect(d.format('ar')).toBe('1 رمضان 1445');
  });
});
