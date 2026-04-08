// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isoDate,
  todayHijriDate,
  addHijriDays,
  hijriToGregorianIso,
  gregorianIsoToHijri,
} from '../date-utils';

describe('isoDate', () => {
  it('extracts YYYY-MM-DD from a Date', () => {
    const d = new Date('2024-03-15T10:30:00Z');
    expect(isoDate(d)).toBe('2024-03-15');
  });
});

describe('todayHijriDate', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = todayHijriDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addHijriDays', () => {
  it('adds days to a Hijri date string', () => {
    const result = addHijriDays('1445-06-15', 5);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe('1445-06-20');
  });

  it('handles month rollover', () => {
    const result = addHijriDays('1445-06-29', 3);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('hijriToGregorianIso', () => {
  it('converts a Hijri date to Gregorian ISO string', () => {
    const result = hijriToGregorianIso('1445-06-15');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('gregorianIsoToHijri', () => {
  it('converts a Gregorian ISO string to Hijri', () => {
    const result = gregorianIsoToHijri('2024-03-15');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('round-trips through hijriToGregorianIso', () => {
    const hijri = '1445-08-15';
    const greg = hijriToGregorianIso(hijri);
    const backToHijri = gregorianIsoToHijri(greg);
    expect(backToHijri).toBe(hijri);
  });
});
