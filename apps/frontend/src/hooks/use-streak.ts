import { useMemo } from 'react';
import { addHijriDays, todayHijriDate, gregorianIsoToHijri, isoDate } from '@/utils/date-utils';
import { PRAYERS } from '@/lib/constants';
import { useSalahHistory } from './use-salah-queries';
import { useSawmHistory } from './use-sawm-queries';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const HISTORY_WINDOW_DAYS = 365;
const ACTIVITY_RATE_WINDOW_DAYS = 30;

export function computeConsecutiveStreak(activeDays: Set<string>): number {
  let checkDay = todayHijriDate();
  if (!activeDays.has(checkDay)) {
    checkDay = addHijriDays(checkDay, -1);
  }
  let count = 0;
  while (activeDays.has(checkDay)) {
    count++;
    checkDay = addHijriDays(checkDay, -1);
  }
  return count;
}

export const useStreak = () => {
  const startDate = addHijriDays(todayHijriDate(), -HISTORY_WINDOW_DAYS);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  const streak = useMemo(() => {
    const activeDays = new Set<string>();
    for (const log of salah.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.date);
    }
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.date);
    }
    return computeConsecutiveStreak(activeDays);
  }, [salah.data, sawm.data]);

  const activityRate = useMemo(() => {
    const activeDays = new Set<string>();
    for (const log of salah.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.date);
    }
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.date);
    }
    let active = 0;
    for (let i = 0; i < ACTIVITY_RATE_WINDOW_DAYS; i++) {
      if (activeDays.has(addHijriDays(todayHijriDate(), -i))) active++;
    }
    return Math.round((active / ACTIVITY_RATE_WINDOW_DAYS) * 100);
  }, [salah.data, sawm.data]);

  const milestone = STREAK_MILESTONES.includes(streak) ? streak : null;

  return {
    streak,
    activityRate,
    milestone,
    loading: salah.isLoading || sawm.isLoading,
  };
};

export interface BestPrayerStreak {
  name: string;
  count: number;
}

export const useStreakDetails = () => {
  const startDate = addHijriDays(todayHijriDate(), -HISTORY_WINDOW_DAYS);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  const prayerStreaks = useMemo((): Record<string, number> => {
    const prayerDays: Record<string, Set<string>> = {};
    for (const log of salah.data ?? []) {
      if (log.type !== 'qadaa') continue;
      const day = log.date;
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
      if (log.type === 'qadaa') fastDays.add(log.date);
    }

    const today = new Date();
    const checkMon = new Date(today);
    while (checkMon.getDay() !== 1) {
      checkMon.setDate(checkMon.getDate() - 1);
    }

    let streak = 0;
    for (let i = 0; i < 17; i++) {
      const monStr = gregorianIsoToHijri(isoDate(checkMon));
      const thuDate = new Date(checkMon);
      thuDate.setDate(thuDate.getDate() + 3);
      const thuStr = gregorianIsoToHijri(isoDate(thuDate));

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

  const obligatoryStreak = useMemo((): number => {
    const dayPrayers: Record<string, Set<string>> = {};
    for (const log of salah.data ?? []) {
      if (log.type !== 'obligatory') continue;
      const day = log.date;
      if (!dayPrayers[day]) dayPrayers[day] = new Set();
      dayPrayers[day].add(log.prayerName);
    }
    const completeDays = new Set<string>();
    for (const [day, prayers] of Object.entries(dayPrayers)) {
      if (PRAYERS.every((p) => prayers.has(p))) {
        completeDays.add(day);
      }
    }
    return computeConsecutiveStreak(completeDays);
  }, [salah.data]);

  const qadaaFastStreak = useMemo((): number => {
    const fastDays = new Set<string>();
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') fastDays.add(log.date);
    }
    return computeConsecutiveStreak(fastDays);
  }, [sawm.data]);

  return {
    prayerStreaks,
    bestPrayerStreak,
    monThuStreak,
    obligatoryStreak,
    qadaaFastStreak,
    loading: salah.isLoading || sawm.isLoading,
  };
};
