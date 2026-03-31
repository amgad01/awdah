import { describe, it, expect } from 'vitest';
import {
  getPracticingPeriodValidationError,
  periodCoversContext,
  rangesOverlap,
  isBulughBeforeDateOfBirth,
  estimateSalahDebt,
  getCoveredPracticingDays,
  type PeriodRangeLike,
} from '../practicing-periods';

/* ── periodCoversContext ── */
describe('periodCoversContext', () => {
  it('returns true when context is "all"', () => {
    expect(periodCoversContext('salah', 'all')).toBe(true);
    expect(periodCoversContext('sawm', 'all')).toBe(true);
    expect(periodCoversContext('both', 'all')).toBe(true);
  });

  it('returns true when type is "both" regardless of context', () => {
    expect(periodCoversContext('both', 'salah')).toBe(true);
    expect(periodCoversContext('both', 'sawm')).toBe(true);
  });

  it('returns true when type matches context exactly', () => {
    expect(periodCoversContext('salah', 'salah')).toBe(true);
    expect(periodCoversContext('sawm', 'sawm')).toBe(true);
  });

  it('returns false when type does not match context', () => {
    expect(periodCoversContext('salah', 'sawm')).toBe(false);
    expect(periodCoversContext('sawm', 'salah')).toBe(false);
  });
});

/* ── rangesOverlap ── */
describe('rangesOverlap', () => {
  it('detects overlap when ranges intersect', () => {
    expect(rangesOverlap('1445-01-01', '1445-03-01', '1445-02-01', '1445-04-01')).toBe(true);
  });

  it('detects overlap when one range contains the other', () => {
    expect(rangesOverlap('1445-01-01', '1445-06-01', '1445-02-01', '1445-04-01')).toBe(true);
  });

  it('returns false when ranges do not overlap', () => {
    expect(rangesOverlap('1445-01-01', '1445-02-01', '1445-03-01', '1445-04-01')).toBe(false);
  });

  it('handles ongoing periods (no end date)', () => {
    expect(rangesOverlap('1445-01-01', undefined, '1445-06-01', '1445-07-01')).toBe(true);
  });

  it('handles two ongoing periods', () => {
    expect(rangesOverlap('1445-01-01', undefined, '1445-02-01', undefined)).toBe(true);
  });
});

describe('getPracticingPeriodValidationError', () => {
  it('returns a start-date error when the period starts before the date of birth', () => {
    expect(
      getPracticingPeriodValidationError({
        startDate: '1439-01-01',
        dateOfBirth: '1440-01-01',
      }),
    ).toEqual({
      messageKey: 'onboarding.period_error_before_dob',
      field: 'start',
    });
  });

  it('returns an end-date error when the end date is before the start date', () => {
    expect(
      getPracticingPeriodValidationError({
        startDate: '1445-05-01',
        endDate: '1445-04-01',
      }),
    ).toEqual({
      messageKey: 'onboarding.period_error_end_before_start',
      field: 'end',
    });
  });

  it('returns a form error when the new range overlaps an existing period', () => {
    expect(
      getPracticingPeriodValidationError({
        startDate: '1445-03-01',
        endDate: '1445-05-01',
        existingPeriods: [{ startDate: '1445-01-01', endDate: '1445-04-01', type: 'both' }],
      }),
    ).toEqual({
      messageKey: 'onboarding.period_error_overlap',
      field: 'form',
    });
  });

  it('returns null for a valid non-overlapping period', () => {
    expect(
      getPracticingPeriodValidationError({
        startDate: '1445-05-01',
        endDate: '1445-06-01',
        existingPeriods: [{ startDate: '1445-01-01', endDate: '1445-04-01', type: 'both' }],
      }),
    ).toBeNull();
  });
});

/* ── isBulughBeforeDateOfBirth ── */
describe('isBulughBeforeDateOfBirth', () => {
  it('returns true when bulugh is before DOB', () => {
    expect(isBulughBeforeDateOfBirth('1430-01-01', '1425-01-01')).toBe(true);
  });

  it('returns false when bulugh is after DOB', () => {
    expect(isBulughBeforeDateOfBirth('1420-01-01', '1435-01-01')).toBe(false);
  });

  it('returns false when either date is missing', () => {
    expect(isBulughBeforeDateOfBirth(undefined, '1435-01-01')).toBe(false);
    expect(isBulughBeforeDateOfBirth('1420-01-01', undefined)).toBe(false);
  });

  it('returns false when dates are equal', () => {
    expect(isBulughBeforeDateOfBirth('1430-01-01', '1430-01-01')).toBe(false);
  });
});

/* ── estimateSalahDebt ── */
describe('estimateSalahDebt', () => {
  const today = '1447-01-15';

  it('calculates debt with no practicing periods', () => {
    const debt = estimateSalahDebt('1445-01-01', [], today);
    // All days from bulugh to today are missed
    expect(debt).toBeGreaterThan(0);
    expect(debt % 5).toBe(0); // Must be multiple of 5
  });

  it('returns zero when a single period covers bulugh to today', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-01-01', endDate: undefined, type: 'both' },
    ];
    const debt = estimateSalahDebt('1445-01-01', periods, today);
    expect(debt).toBe(0);
  });

  it('calculates gap between bulugh and a later practicing period', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1446-01-01', endDate: undefined, type: 'both' },
    ];
    const debt = estimateSalahDebt('1445-01-01', periods, today);
    // Gap is from 1445-01-01 to 1446-01-01
    expect(debt).toBeGreaterThan(0);
    expect(debt % 5).toBe(0);
  });

  it('handles multiple non-contiguous periods', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-03-01', endDate: '1445-06-01', type: 'both' },
      { startDate: '1446-01-01', endDate: undefined, type: 'both' },
    ];
    const debt = estimateSalahDebt('1445-01-01', periods, today);
    // Two gaps: 1445-01-01→1445-03-01 and 1445-06-02→1446-01-01
    expect(debt).toBeGreaterThan(0);
    expect(debt % 5).toBe(0);
  });

  it('ignores sawm-only periods in salah context', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-01-01', endDate: undefined, type: 'sawm' },
    ];
    const debtWithSawmOnly = estimateSalahDebt('1445-01-01', periods, today);
    const debtWithNoPeriods = estimateSalahDebt('1445-01-01', [], today);
    expect(debtWithSawmOnly).toBe(debtWithNoPeriods);
  });

  it('debt is always a non-negative integer', () => {
    const debt = estimateSalahDebt('1445-01-01', [], today);
    expect(debt).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(debt)).toBe(true);
  });
});

/* ── getCoveredPracticingDays ── */
describe('getCoveredPracticingDays', () => {
  const today = '1447-01-15';

  it('returns empty array when no periods', () => {
    const result = getCoveredPracticingDays([], 'salah', '1445-01-01', '1445-01-10', today);
    expect(result).toEqual([]);
  });

  it('returns days within a fully-covered range', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-01-01', endDate: '1445-01-10', type: 'both' },
    ];
    const result = getCoveredPracticingDays(periods, 'salah', '1445-01-01', '1445-01-05', today);
    expect(result.length).toBe(5);
    expect(result[0].date).toBe('1445-01-01');
    expect(result[4].date).toBe('1445-01-05');
  });

  it('filters by context', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-01-01', endDate: '1445-01-10', type: 'sawm' },
    ];
    const salahDays = getCoveredPracticingDays(periods, 'salah', '1445-01-01', '1445-01-10', today);
    const sawmDays = getCoveredPracticingDays(periods, 'sawm', '1445-01-01', '1445-01-10', today);
    expect(salahDays).toEqual([]);
    expect(sawmDays.length).toBe(10);
  });

  it('handles partial overlap with query range', () => {
    const periods: PeriodRangeLike[] = [
      { startDate: '1445-01-05', endDate: '1445-01-15', type: 'both' },
    ];
    const result = getCoveredPracticingDays(periods, 'all', '1445-01-01', '1445-01-10', today);
    // Only days 5–10 overlap
    expect(result.length).toBe(6);
    expect(result[0].date).toBe('1445-01-05');
  });
});
