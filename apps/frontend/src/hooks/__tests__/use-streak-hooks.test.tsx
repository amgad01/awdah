import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStreak, useStreakDetails } from '../use-streak';
import { useSalahHistory } from '../use-salah-queries';
import { useSawmHistory } from '../use-sawm-queries';
import { todayHijriDate, addHijriDays } from '@/utils/date-utils';

vi.mock('../use-salah-queries', () => ({
  useSalahHistory: vi.fn(),
}));

vi.mock('../use-sawm-queries', () => ({
  useSawmHistory: vi.fn(),
}));

describe('Streak Hooks (Hybrid Logic: Strict Momentum, Inclusive Individual)', () => {
  const today = todayHijriDate();
  const yesterday = addHijriDays(today, -1);

  it('useStreak (Momentum) should be STRICT (5/5 obligatory req)', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [
        { date: yesterday, type: 'obligatory', prayerName: 'fajr' },
        { date: yesterday, type: 'obligatory', prayerName: 'dhuhr' },
        { date: yesterday, type: 'obligatory', prayerName: 'asr' },
        { date: yesterday, type: 'obligatory', prayerName: 'maghrib' },
        { date: yesterday, type: 'obligatory', prayerName: 'isha' },
        { date: today, type: 'obligatory', prayerName: 'fajr' },
        { date: today, type: 'qadaa', prayerName: 'dhuhr' }, // Qadaa doesnt satisfy Momentum
      ],
      isLoading: false,
    } as any);
    vi.mocked(useSawmHistory).mockReturnValue({ data: [], isLoading: false } as any);

    const { result } = renderHook(() => useStreak());
    // Should be 1 day (yesterday)
    expect(result.current.streak).toBe(1);
  });

  it('useStreakDetails individual prayer streaks should be INCLUSIVE', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [
        { date: today, type: 'obligatory', prayerName: 'fajr' },
        { date: yesterday, type: 'qadaa', prayerName: 'fajr' },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useStreakDetails());
    // Should be 2 days (inclusive of both types)
    expect(result.current.prayerStreaks['fajr']).toBe(2);
  });

  it('useStreakDetails fasting streak should be INCLUSIVE', () => {
    vi.mocked(useSawmHistory).mockReturnValue({
      data: [
        { date: today, type: 'ramadan' },
        { date: yesterday, type: 'qadaa' },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useStreakDetails());
    // Should be 2 days (inclusive of both types)
    expect(result.current.fastStreak).toBe(2);
  });
});
