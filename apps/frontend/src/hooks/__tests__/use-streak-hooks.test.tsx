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

  it('useStreak (Momentum) should be STRICT (5/5 obligatory required)', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [
        { date: yesterday, type: 'obligatory', prayerName: 'fajr' },
        { date: yesterday, type: 'obligatory', prayerName: 'dhuhr' },
        { date: yesterday, type: 'obligatory', prayerName: 'asr' },
        { date: yesterday, type: 'obligatory', prayerName: 'maghrib' },
        { date: yesterday, type: 'obligatory', prayerName: 'isha' },
        // today only has 4 obligatory + 1 qadaa — not a complete day
        { date: today, type: 'obligatory', prayerName: 'fajr' },
        { date: today, type: 'qadaa', prayerName: 'dhuhr' },
      ],
      isLoading: false,
    } as any);
    vi.mocked(useSawmHistory).mockReturnValue({ data: [], isLoading: false } as any);

    const { result } = renderHook(() => useStreak());
    // yesterday is the last complete day → streak = 1
    expect(result.current.streak).toBe(1);
  });

  it('useStreak returns 0 when no complete days exist', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [{ date: today, type: 'obligatory', prayerName: 'fajr' }],
      isLoading: false,
    } as any);
    vi.mocked(useSawmHistory).mockReturnValue({ data: [], isLoading: false } as any);

    const { result } = renderHook(() => useStreak());
    expect(result.current.streak).toBe(0);
  });

  it('useStreakDetails individual prayer streaks track obligatory and qadaa separately', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [
        { date: today, type: 'obligatory', prayerName: 'fajr' },
        { date: yesterday, type: 'qadaa', prayerName: 'fajr' },
      ],
      isLoading: false,
    } as any);
    vi.mocked(useSawmHistory).mockReturnValue({ data: [], isLoading: false } as any);

    const { result } = renderHook(() => useStreakDetails());
    // obligatory streak: only today → 1
    expect(result.current.prayerStreaks['fajr'].obligatory).toBe(1);
    // qadaa streak: only yesterday → 1
    expect(result.current.prayerStreaks['fajr'].qadaa).toBe(1);
  });

  it('useStreakDetails fasting streak counts consecutive ramadan days', () => {
    vi.mocked(useSalahHistory).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useSawmHistory).mockReturnValue({
      data: [
        { date: today, type: 'ramadan' },
        { date: yesterday, type: 'ramadan' },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useStreakDetails());
    expect(result.current.fastStreak).toBe(2);
  });

  it('useStreakDetails qadaa fast streak counts consecutive qadaa days', () => {
    vi.mocked(useSalahHistory).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useSawmHistory).mockReturnValue({
      data: [
        { date: today, type: 'qadaa' },
        { date: yesterday, type: 'qadaa' },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useStreakDetails());
    expect(result.current.qadaaFastStreak).toBe(2);
  });

  it('useStreakDetails activePrayerStreaks returns sorted list of active streaks', () => {
    vi.mocked(useSalahHistory).mockReturnValue({
      data: [
        { date: today, type: 'obligatory', prayerName: 'fajr' },
        { date: yesterday, type: 'obligatory', prayerName: 'fajr' },
        { date: today, type: 'qadaa', prayerName: 'maghrib' },
      ],
      isLoading: false,
    } as any);
    vi.mocked(useSawmHistory).mockReturnValue({ data: [], isLoading: false } as any);

    const { result } = renderHook(() => useStreakDetails());
    const streaks = result.current.activePrayerStreaks;
    expect(streaks.length).toBeGreaterThan(0);
    // sorted descending by count
    for (let i = 1; i < streaks.length; i++) {
      expect(streaks[i - 1].count).toBeGreaterThanOrEqual(streaks[i].count);
    }
  });
});
