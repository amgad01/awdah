import { useMemo } from 'react';
import { isoDate, addHijriDays, todayHijriDate } from '@/utils/date-utils';
import { useSalahHistory } from './use-salah-queries';
import { useSawmHistory } from './use-sawm-queries';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function computeConsecutiveStreak(activeDays: Set<string>): number {
  const today = new Date();
  const checkDay = new Date(today);
  if (!activeDays.has(isoDate(checkDay))) {
    checkDay.setDate(checkDay.getDate() - 1);
  }
  let count = 0;
  while (activeDays.has(isoDate(checkDay))) {
    count++;
    checkDay.setDate(checkDay.getDate() - 1);
  }
  return count;
}

export const useStreak = () => {
  const startDate = addHijriDays(todayHijriDate(), -120);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  const streak = useMemo(() => {
    const activeDays = new Set<string>();
    for (const log of salah.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.loggedAt.split('T')[0]);
    }
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.loggedAt.split('T')[0]);
    }
    return computeConsecutiveStreak(activeDays);
  }, [salah.data, sawm.data]);

  const milestone = STREAK_MILESTONES.includes(streak) ? streak : null;

  return {
    streak,
    milestone,
    loading: salah.isLoading || sawm.isLoading,
  };
};

export interface BestPrayerStreak {
  name: string;
  count: number;
}

export const useStreakDetails = () => {
  const startDate = addHijriDays(todayHijriDate(), -120);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  const prayerStreaks = useMemo((): Record<string, number> => {
    const prayerDays: Record<string, Set<string>> = {};
    for (const log of salah.data ?? []) {
      if (log.type !== 'qadaa') continue;
      const day = log.loggedAt.split('T')[0];
      if (!prayerDays[log.prayerName]) prayerDays[log.prayerName] = new Set();
      prayerDays[log.prayerName].add(day);
    }
    const streaks: Record<string, number> = {};
    for (const [name, days] of Object.entries(prayerDays)) {
      streaks[name] = computeConsecutiveStreak(days);
    }
    return streaks;
  }, [salah.data]);

  const monThuStreak = useMemo((): number => {
    const fastDays = new Set<string>();
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') fastDays.add(log.loggedAt.split('T')[0]);
    }

    const today = new Date();
    const checkMon = new Date(today);
    while (checkMon.getDay() !== 1) {
      checkMon.setDate(checkMon.getDate() - 1);
    }

    let streak = 0;
    for (let i = 0; i < 17; i++) {
      const monStr = isoDate(checkMon);
      const thuDate = new Date(checkMon);
      thuDate.setDate(thuDate.getDate() + 3);
      const thuStr = isoDate(thuDate);

      if (thuDate > today) {
        checkMon.setDate(checkMon.getDate() - 7);
        continue;
      }

      if (fastDays.has(monStr) && fastDays.has(thuStr)) {
        streak++;
        checkMon.setDate(checkMon.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  }, [sawm.data]);

  const bestPrayerStreak = useMemo((): BestPrayerStreak | null => {
    let best: BestPrayerStreak | null = null;
    for (const [name, count] of Object.entries(prayerStreaks)) {
      if (count > 0 && (!best || count > best.count)) {
        best = { name, count };
      }
    }
    return best;
  }, [prayerStreaks]);

  return {
    prayerStreaks,
    bestPrayerStreak,
    monThuStreak,
    loading: salah.isLoading || sawm.isLoading,
  };
};
