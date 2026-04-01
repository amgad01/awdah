import { describe, it, expect } from 'vitest';
import { computeConsecutiveStreak, computeMonThuStreak } from '../use-streak';
import { todayHijriDate, addHijriDays, gregorianIsoToHijri } from '@/utils/date-utils';

function hijriDaysAgo(n: number): string {
  return addHijriDays(todayHijriDate(), -n);
}

describe('computeConsecutiveStreak', () => {
  it('returns 0 for an empty set', () => {
    expect(computeConsecutiveStreak(new Set())).toBe(0);
  });

  it('returns 1 when only today is active', () => {
    const today = todayHijriDate();
    expect(computeConsecutiveStreak(new Set([today]))).toBe(1);
  });

  it('returns 1 when only yesterday is active', () => {
    expect(computeConsecutiveStreak(new Set([hijriDaysAgo(1)]))).toBe(1);
  });

  it('counts consecutive days from today backwards', () => {
    const days = new Set([hijriDaysAgo(0), hijriDaysAgo(1), hijriDaysAgo(2)]);
    expect(computeConsecutiveStreak(days)).toBe(3);
  });

  it('counts consecutive days from yesterday when today is missing', () => {
    const days = new Set([hijriDaysAgo(1), hijriDaysAgo(2), hijriDaysAgo(3)]);
    expect(computeConsecutiveStreak(days)).toBe(3);
  });

  it('stops counting at a gap', () => {
    // today, yesterday, then gap, then 3 days ago
    const days = new Set([hijriDaysAgo(0), hijriDaysAgo(1), hijriDaysAgo(3)]);
    expect(computeConsecutiveStreak(days)).toBe(2);
  });

  it('returns 0 when the most recent day is 2+ days ago and today is missing', () => {
    // Only 3 days ago — yesterday and today are missing
    const days = new Set([hijriDaysAgo(3)]);
    expect(computeConsecutiveStreak(days)).toBe(0);
  });

  it('handles a long streak', () => {
    const days = new Set<string>();
    for (let i = 0; i < 30; i++) {
      days.add(hijriDaysAgo(i));
    }
    expect(computeConsecutiveStreak(days)).toBe(30);
  });
});

describe('computeMonThuStreak', () => {
  it('counts a completed Monday/Thursday pair using Hijri dates', () => {
    const monday = gregorianIsoToHijri('2024-03-11');
    const thursday = gregorianIsoToHijri('2024-03-14');
    const friday = gregorianIsoToHijri('2024-03-15');

    expect(computeMonThuStreak(new Set([monday, thursday]), friday)).toBe(1);
  });

  it('skips the current incomplete week and counts the previous completed one', () => {
    const previousMonday = gregorianIsoToHijri('2024-03-04');
    const previousThursday = gregorianIsoToHijri('2024-03-07');
    const currentTuesday = gregorianIsoToHijri('2024-03-12');

    expect(computeMonThuStreak(new Set([previousMonday, previousThursday]), currentTuesday)).toBe(
      1,
    );
  });
});
