import { describe, it, expect } from 'vitest';
import { computeDebtTimeProjection, computeObservedQadaaRate } from '../debt-calculation.service';

const DAYS_PER_YEAR = 354;
const MONTHS_PER_YEAR = 12;

describe('computeDebtTimeProjection', () => {
  it('returns zeros when remainingDebt is 0', () => {
    expect(computeDebtTimeProjection(0, 5, DAYS_PER_YEAR, MONTHS_PER_YEAR)).toEqual({
      totalDays: 0,
      years: 0,
      months: 0,
    });
  });

  it('returns zeros when dailyRate is 0', () => {
    expect(computeDebtTimeProjection(100, 0, DAYS_PER_YEAR, MONTHS_PER_YEAR)).toEqual({
      totalDays: 0,
      years: 0,
      months: 0,
    });
  });

  it('returns zeros when remainingDebt is negative', () => {
    expect(computeDebtTimeProjection(-10, 5, DAYS_PER_YEAR, MONTHS_PER_YEAR)).toEqual({
      totalDays: 0,
      years: 0,
      months: 0,
    });
  });

  it('calculates totalDays as ceil(debt / rate)', () => {
    // 10 prayers / 3 per day = ceil(3.33) = 4 days
    const result = computeDebtTimeProjection(10, 3, DAYS_PER_YEAR, MONTHS_PER_YEAR);
    expect(result.totalDays).toBe(4);
  });

  it('calculates years and months correctly for a multi-year debt', () => {
    // 1 prayer/day × 354 days = exactly 1 year, 0 months
    const result = computeDebtTimeProjection(354, 1, DAYS_PER_YEAR, MONTHS_PER_YEAR);
    expect(result.years).toBe(1);
    expect(result.months).toBe(0);
  });

  it('calculates partial year correctly', () => {
    // 200 days at 1/day → 0 years, floor(200 / (354/12)) = floor(200/29.5) = 6 months
    const result = computeDebtTimeProjection(200, 1, DAYS_PER_YEAR, MONTHS_PER_YEAR);
    expect(result.years).toBe(0);
    expect(result.months).toBe(6);
  });

  it('handles exact division without rounding error', () => {
    const result = computeDebtTimeProjection(5, 5, DAYS_PER_YEAR, MONTHS_PER_YEAR);
    expect(result.totalDays).toBe(1);
    expect(result.years).toBe(0);
  });
});

describe('computeObservedQadaaRate', () => {
  it('returns null for empty logs', () => {
    expect(computeObservedQadaaRate([], { start: '1446-10-01', end: '1446-10-15' })).toBeNull();
  });

  it('returns null when no qadaa logs exist in range', () => {
    const logs = [{ date: '1446-10-10', type: 'obligatory' }];
    expect(computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' })).toBeNull();
  });

  it('returns null when qadaa logs are outside the date range', () => {
    const logs = [{ date: '1446-09-01', type: 'qadaa' }];
    expect(computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' })).toBeNull();
  });

  it('calculates rate as qadaaCount / activeDays', () => {
    const logs = [
      { date: '1446-10-10', type: 'qadaa' },
      { date: '1446-10-10', type: 'qadaa' },
      { date: '1446-10-11', type: 'qadaa' },
    ];
    const result = computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' });
    expect(result).not.toBeNull();
    expect(result!.qadaaCount).toBe(3);
    expect(result!.activeDays).toBe(2);
    expect(result!.rate).toBe(1.5);
  });

  it('counts only unique dates for activeDays', () => {
    const logs = [
      { date: '1446-10-10', type: 'qadaa' },
      { date: '1446-10-10', type: 'qadaa' },
      { date: '1446-10-10', type: 'qadaa' },
    ];
    const result = computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' });
    expect(result!.activeDays).toBe(1);
    expect(result!.rate).toBe(3);
  });

  it('ignores non-qadaa log types', () => {
    const logs = [
      { date: '1446-10-10', type: 'obligatory' },
      { date: '1446-10-10', type: 'ramadan' },
      { date: '1446-10-10', type: 'qadaa' },
    ];
    const result = computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' });
    expect(result!.qadaaCount).toBe(1);
  });

  it('includes logs on the range boundary dates', () => {
    const logs = [
      { date: '1446-10-01', type: 'qadaa' },
      { date: '1446-10-15', type: 'qadaa' },
    ];
    const result = computeObservedQadaaRate(logs, { start: '1446-10-01', end: '1446-10-15' });
    expect(result!.qadaaCount).toBe(2);
  });
});
