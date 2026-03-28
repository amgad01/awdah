import { describe, it, expect } from 'vitest';
import { HijriDate } from '../hijri-date';

// All expected values here are verified against the hijri-converter library
// using the Umm al-Qura calendar tables.
describe('HijriDate', () => {
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

  it('should convert Gregorian to Hijri via fromGregorian', () => {
    // 11 March 2024 = 1 Ramadan 1445 per Umm al-Qura
    const hijri = HijriDate.fromGregorian(new Date(Date.UTC(2024, 2, 11)));
    expect(hijri.toString()).toBe('1445-09-01');
  });

  it('should convert Hijri to Gregorian via toGregorian', () => {
    const gregorian = HijriDate.fromString('1445-09-01').toGregorian();
    expect(gregorian.getUTCFullYear()).toBe(2024);
    expect(gregorian.getUTCMonth() + 1).toBe(3);
    expect(gregorian.getUTCDate()).toBe(11);
  });

  it('should correctly format date with leading zeros', () => {
    expect(HijriDate.fromString('1445-01-05').toString()).toBe('1445-01-05');
  });

  it('should check if one date is before another', () => {
    const d1 = HijriDate.fromString('1445-08-29');
    const d2 = HijriDate.fromString('1445-09-01');

    expect(d1.isBefore(d2)).toBe(true);
    expect(d2.isBefore(d1)).toBe(false);
    expect(d1.isBefore(d1)).toBe(false);
  });

  it('should check if one date is after another', () => {
    const d1 = HijriDate.fromString('1445-09-02');
    const d2 = HijriDate.fromString('1445-09-01');

    expect(d1.isAfter(d2)).toBe(true);
    expect(d2.isAfter(d1)).toBe(false);
    expect(d1.isAfter(d1)).toBe(false);
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
    expect(HijriDate.fromString('1445-08-29').isRamadan()).toBe(false);
  });

  it('should add days within the same month', () => {
    // 1445-01-01 + 5 = 1445-01-06 (Muharram has 30 days)
    expect(HijriDate.fromString('1445-01-01').addDays(5).toString()).toBe('1445-01-06');
  });

  it('should add days spanning a month boundary', () => {
    // 1445-01-01 + 30 = 1445-02-02 (Muharram is 30 days, Safar starts on day 31)
    expect(HijriDate.fromString('1445-01-01').addDays(30).toString()).toBe('1445-02-02');
  });

  it('should add days spanning a year boundary', () => {
    // 1445-01-01 + 400 days verified against hijri-converter library
    expect(HijriDate.fromString('1445-01-01').addDays(400).toString()).toBe('1446-02-18');
  });

  it('should subtract days correctly', () => {
    // 1445-01-01 - 40 days verified against hijri-converter library
    expect(HijriDate.fromString('1445-01-01').addDays(-40).toString()).toBe('1444-11-20');
  });

  it('should convert to object', () => {
    const obj = HijriDate.fromString('1445-09-01').toObject();
    expect(obj).toEqual({ year: 1445, month: 9, day: 1 });
  });

  it('should create from object', () => {
    expect(HijriDate.fromObject({ year: 1445, month: 9, day: 1 }).toString()).toBe('1445-09-01');
  });

  it('should return today as a valid HijriDate', () => {
    const today = HijriDate.today();
    expect(today).toBeInstanceOf(HijriDate);
    expect(today.year).toBeGreaterThan(1440);
    expect(today.month).toBeGreaterThanOrEqual(1);
    expect(today.month).toBeLessThanOrEqual(12);
    expect(today.day).toBeGreaterThanOrEqual(1);
    expect(today.day).toBeLessThanOrEqual(30);
  });

  it('should throw error for NaN components in fromString', () => {
    expect(() => HijriDate.fromString('year-month-day')).toThrow('Invalid Hijri date components');
  });

  it('should throw validation errors for out-of-range components', () => {
    expect(() => new HijriDate(0, 1, 1)).toThrow('Hijri year must be positive');
    expect(() => new HijriDate(1445, 0, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 13, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 1, 0)).toThrow('Hijri day must be between 1 and 30');
    expect(() => new HijriDate(1445, 1, 31)).toThrow('Hijri day must be between 1 and 30');
  });

  it('should serialize to JSON as a string', () => {
    const date = HijriDate.fromString('1445-09-01');
    expect(JSON.stringify({ date })).toBe('{"date":"1445-09-01"}');
  });

  it('should format date for Arabic locale', () => {
    const d = HijriDate.fromString('1445-09-01');
    expect(d.format('ar')).toBe('1 رمضان 1445');
  });

  it('should format date for English locale', () => {
    const d = HijriDate.fromString('1445-09-01');
    expect(d.format('en')).toBe('Ramaḍān 1, 1445');
  });

  it('should reject day 30 in a 29-day Hijri month', () => {
    // Ramadan 1446 has 29 days per Umm al-Qura. Day 30 must not be valid.
    expect(() => new HijriDate(1446, 9, 30)).toThrow(
      'Day 30 is out of range for Hijri month 9 of year 1446',
    );
  });

  it('should accept day 30 in a 30-day Hijri month', () => {
    // Ramadan 1445 has 30 days per Umm al-Qura. Day 30 must be valid.
    expect(() => new HijriDate(1445, 9, 30)).not.toThrow();
  });
});
