import { describe, it, expect } from 'vitest';
import { getLocale, getHijriMonthName } from '../index';
import { HijriDate } from '../../domain/value-objects/hijri-date';

describe('i18n', () => {
  it('should return correct locale config', () => {
    const en = getLocale('en');
    expect(en.hijriMonths).toBeDefined();
    expect(en.prayers).toBeDefined();

    const ar = getLocale('ar');
    expect(ar.hijriMonths).toBeDefined();
    expect(ar.prayers).toBeDefined();
  });

  it('should return correct Hijri month names from JSON', () => {
    expect(getHijriMonthName(1, 'en')).toBe('Muharram');
    expect(getHijriMonthName(9, 'en')).toBe('Ramaḍān');
    expect(getHijriMonthName(1, 'ar')).toBe('محرم');
    expect(getHijriMonthName(9, 'ar')).toBe('رمضان');
  });

  it('should format date correctly in Arabic', () => {
    const d = HijriDate.fromString('1445-09-01');
    expect(d.format('ar')).toBe('1 رمضان 1445');
  });

  it('should return fallback for invalid month number', () => {
    expect(getHijriMonthName(13, 'en')).toBe('Month 13');
    expect(getHijriMonthName(0, 'ar')).toBe('Month 0');
  });
});
