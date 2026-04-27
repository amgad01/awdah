// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  computeHijriAge,
  getCurrentHijriAge,
  getDefaultBulughDate,
  getAgeBasedBulughDate,
  isBulughEarly,
  isBulughLate,
  formatHijriDisplay,
  formatGregorianDisplay,
} from '../profile-date-utils';
vi.mock('@/utils/date-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/date-utils')>();
  return { ...actual, todayHijriDate: vi.fn(() => '1446-06-01') };
});

// ── computeHijriAge ──────────────────────────────────────────────────────────

describe('computeHijriAge', () => {
  it.each([
    ['1410-01-01', '1425-01-01', 15],
    ['1410-06-15', '1425-06-15', 15],
    ['1410-06-15', '1425-06-14', 14], // day before birthday → one less
    ['1410-06-15', '1425-05-01', 14], // month before birthday → one less
  ])('dob=%s later=%s → %i', (dob, later, expected) => {
    expect(computeHijriAge(dob, later)).toBe(expected);
  });

  it('returns null for empty dob', () => expect(computeHijriAge('', '1446-01-01')).toBeNull());
  it('returns null for empty laterDate', () =>
    expect(computeHijriAge('1430-01-01', '')).toBeNull());
  it('returns null for invalid date string', () =>
    expect(computeHijriAge('bad', '1446-01-01')).toBeNull());
});

// ── getCurrentHijriAge ───────────────────────────────────────────────────────

describe('getCurrentHijriAge', () => {
  it('returns null for undefined', () => expect(getCurrentHijriAge(undefined)).toBeNull());
  it('returns a number for a valid past dob', () => {
    expect(getCurrentHijriAge('1430-01-01')).toBeTypeOf('number');
  });
});

// ── getDefaultBulughDate ─────────────────────────────────────────────────────

describe('getDefaultBulughDate', () => {
  it('returns null for undefined dob', () => expect(getDefaultBulughDate(undefined)).toBeNull());
  it('returns null when default date is in the future', () => {
    expect(getDefaultBulughDate('1445-12-01')).toBeNull();
  });
  it('returns the date when not in the future', () => {
    expect(getDefaultBulughDate('1430-01-01')).toBe('1445-01-01');
  });
  it('allows future date when allowFuture=true', () => {
    expect(getDefaultBulughDate('1445-12-01', { allowFuture: true })).toBe('1460-12-01');
  });
  it('returns null for invalid dob', () => expect(getDefaultBulughDate('bad')).toBeNull());
});

// ── getAgeBasedBulughDate ────────────────────────────────────────────────────

describe('getAgeBasedBulughDate', () => {
  it('returns null for undefined dob', () =>
    expect(getAgeBasedBulughDate(undefined, '15')).toBeNull());
  it('returns null for undefined age', () =>
    expect(getAgeBasedBulughDate('1430-01-01', undefined)).toBeNull());
  it('returns null for age=0', () => expect(getAgeBasedBulughDate('1430-01-01', '0')).toBeNull());
  it('returns null for age>70', () => expect(getAgeBasedBulughDate('1430-01-01', '71')).toBeNull());
  it('returns null for non-numeric age', () =>
    expect(getAgeBasedBulughDate('1430-01-01', 'abc')).toBeNull());
  it('returns null when result is in the future', () => {
    expect(getAgeBasedBulughDate('1445-12-01', '15')).toBeNull();
  });
  it('allows future when allowFuture=true', () => {
    expect(getAgeBasedBulughDate('1445-12-01', '15', { allowFuture: true })).toBe('1460-12-01');
  });
  it('returns correct date for past result', () => {
    expect(getAgeBasedBulughDate('1430-01-01', '15')).toBe('1445-01-01');
  });
});

// ── isBulughEarly / isBulughLate ─────────────────────────────────────────────

describe('isBulughEarly', () => {
  it('returns true when bulugh is before age 12', () => {
    expect(isBulughEarly('1420-01-01', '1430-01-01')).toBe(true); // 10 years
  });
  it('returns false when bulugh is at age 13', () => {
    expect(isBulughEarly('1420-01-01', '1433-01-01')).toBe(false);
  });
  it('returns false for missing inputs', () => {
    expect(isBulughEarly(undefined, '1433-01-01')).toBe(false);
    expect(isBulughEarly('1420-01-01', undefined)).toBe(false);
  });
});

describe('isBulughLate', () => {
  it('returns true when bulugh is after age 15', () => {
    expect(isBulughLate('1420-01-01', '1436-01-01')).toBe(true); // 16 years
  });
  it('returns false when bulugh is at age 14', () => {
    expect(isBulughLate('1420-01-01', '1434-01-01')).toBe(false);
  });
  it('returns false for missing inputs', () => {
    expect(isBulughLate(undefined, '1436-01-01')).toBe(false);
  });
});

// ── formatHijriDisplay ───────────────────────────────────────────────────────

describe('formatHijriDisplay', () => {
  const t = (key: string) => key.split('.').pop() ?? key;
  const fmt = (n: number) => String(n);

  it('returns em dash for empty string', () => {
    expect(formatHijriDisplay('', 'en', t, fmt)).toBe('\u2014');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatHijriDisplay('bad-date', 'en', t, fmt)).toBe('bad-date');
  });

  it('returns formatted string for English', () => {
    const result = formatHijriDisplay('1446-06-01', 'en', t, fmt);
    expect(result).toContain('1446');
  });

  it('returns formatted string for Arabic with month name', () => {
    const result = formatHijriDisplay('1446-06-01', 'ar', t, fmt);
    expect(result).toContain('1446');
    expect(result).toContain('1'); // day
  });

  it('inverts language when invert=true', () => {
    const enResult = formatHijriDisplay('1446-06-01', 'en', t, fmt);
    const invertedResult = formatHijriDisplay('1446-06-01', 'ar', t, fmt, true);
    // invert=true with ar → renders as en
    expect(invertedResult).toBe(enResult);
  });
});

// ── formatGregorianDisplay ───────────────────────────────────────────────────

describe('formatGregorianDisplay', () => {
  it('returns em-dash for empty string', () => {
    expect(formatGregorianDisplay('', 'en')).toBe('\u2014');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatGregorianDisplay('bad', 'en')).toBe('bad');
  });

  it('returns a Gregorian date string for English', () => {
    const result = formatGregorianDisplay('1446-06-01', 'en');
    expect(result).toMatch(/\d{4}/);
  });

  it('returns a Gregorian date string for Arabic', () => {
    const result = formatGregorianDisplay('1446-06-01', 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
