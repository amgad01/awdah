import { useMemo } from 'react';
import { addHijriDays, todayHijriDate, hijriToGregorianDate } from '@/utils/date-utils';
import { PRAYERS } from '@/lib/constants';
import { useSalahHistory } from './use-salah-queries';
import { useSawmHistory } from './use-sawm-queries';

// Domain helpers for streak calculations
function groupPrayersByDay(
  logs: Array<{ date: string; prayerName: string; type: string }>,
  typeFilter: string,
): Record<string, Set<string>> {
  const dayPrayers: Record<string, Set<string>> = {};
  for (const log of logs) {
    if (log.type !== typeFilter) continue;
    const day = log.date;
    if (!dayPrayers[day]) dayPrayers[day] = new Set();
    dayPrayers[day].add(log.prayerName);
  }
  return dayPrayers;
}

function computeObligatoryPrayerStreak(
  logs: Array<{ date: string; prayerName: string; type: string }>,
  today?: string,
): number {
  const dayPrayers = groupPrayersByDay(logs, 'obligatory');
  const completeDays = new Set<string>();
  for (const [day, prayers] of Object.entries(dayPrayers)) {
    if (PRAYERS.every((p) => prayers.has(p))) {
      completeDays.add(day);
    }
  }
  return computeConsecutiveStreak(completeDays, today);
}

function computeFastStreak(
  logs: Array<{ date: string; type: string }>,
  typeFilter: string,
  today?: string,
): number {
  const fastDays = new Set<string>();
  for (const log of logs) {
    if (log.type === typeFilter) fastDays.add(log.date);
  }
  return computeConsecutiveStreak(fastDays, today);
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const HISTORY_WINDOW_DAYS = 365;

export function computeConsecutiveStreak(activeDays: Set<string>, today?: string): number {
  let checkDay = today ?? todayHijriDate();
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

function weekdayForHijriDate(date: string): number {
  return hijriToGregorianDate(date).getUTCDay();
}

export function computeMonThuStreak(fastDays: Set<string>, today?: string): number {
  const referenceDay = today ?? todayHijriDate();
  let cursor = referenceDay;
  let streak = 0;

  for (let i = 0; i < 17; i++) {
    const weekday = weekdayForHijriDate(cursor);
    const daysSinceMonday = (weekday + 6) % 7;
    const monday = addHijriDays(cursor, -daysSinceMonday);
    const thursday = addHijriDays(monday, 3);

    if (hijriToGregorianDate(thursday).getTime() > hijriToGregorianDate(referenceDay).getTime()) {
      cursor = addHijriDays(monday, -1);
      continue;
    }

    if (fastDays.has(monday) && fastDays.has(thursday)) {
      streak++;
      cursor = addHijriDays(monday, -1);
      continue;
    }

    break;
  }

  return streak;
}

export interface BestPrayerStreak {
  name: string;
  count: number;
  type: 'obligatory' | 'qadaa';
}

export const useStreakDetails = (enabled = true) => {
  const startDate = addHijriDays(todayHijriDate(), -HISTORY_WINDOW_DAYS);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, enabled ? endDate : '');
  const sawm = useSawmHistory(startDate, enabled ? endDate : '');

  const prayerStreaks = useMemo((): Record<string, { obligatory: number; qadaa: number }> => {
    const today = todayHijriDate();
    const obligatoryDays: Record<string, Set<string>> = {};
    const qadaaDays: Record<string, Set<string>> = {};

    for (const log of salah.data ?? []) {
      const day = log.date;
      const prayerName = log.prayerName;

      if (log.type === 'obligatory') {
        if (!obligatoryDays[prayerName]) obligatoryDays[prayerName] = new Set();
        obligatoryDays[prayerName].add(day);
      } else if (log.type === 'qadaa') {
        if (!qadaaDays[prayerName]) qadaaDays[prayerName] = new Set();
        qadaaDays[prayerName].add(day);
      }
    }

    const streaks: Record<string, { obligatory: number; qadaa: number }> = {};
    const allPrayerNames = new Set([...Object.keys(obligatoryDays), ...Object.keys(qadaaDays)]);

    for (const name of allPrayerNames) {
      streaks[name] = {
        obligatory: obligatoryDays[name]
          ? computeConsecutiveStreak(obligatoryDays[name], today)
          : 0,
        qadaa: qadaaDays[name] ? computeConsecutiveStreak(qadaaDays[name], today) : 0,
      };
    }

    return streaks;
  }, [salah.data]);

  const monThuStreak = useMemo((): number => {
    const fastDays = new Set<string>();
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') fastDays.add(log.date);
    }
    return computeMonThuStreak(fastDays);
  }, [sawm.data]);

  const bestPrayerStreak = useMemo((): BestPrayerStreak | null => {
    let best: BestPrayerStreak | null = null;
    for (const [name, counts] of Object.entries(prayerStreaks)) {
      if (counts.obligatory > 0 && (!best || counts.obligatory > best.count)) {
        best = { name, count: counts.obligatory, type: 'obligatory' };
      }
      if (counts.qadaa > 0 && (!best || counts.qadaa > best.count)) {
        best = { name, count: counts.qadaa, type: 'qadaa' };
      }
    }
    return best;
  }, [prayerStreaks]);

  const activePrayerStreaks = useMemo((): BestPrayerStreak[] => {
    const streaks: BestPrayerStreak[] = [];
    for (const [name, counts] of Object.entries(prayerStreaks)) {
      if (counts.obligatory > 0) {
        streaks.push({ name, count: counts.obligatory, type: 'obligatory' });
      }
      if (counts.qadaa > 0) {
        streaks.push({ name, count: counts.qadaa, type: 'qadaa' });
      }
    }
    return streaks.sort((a, b) => b.count - a.count);
  }, [prayerStreaks]);

  const obligatoryStreak = useMemo((): number => {
    const today = todayHijriDate();
    return computeObligatoryPrayerStreak(salah.data ?? [], today);
  }, [salah.data]);

  const fastStreak = useMemo((): number => {
    const today = todayHijriDate();
    return computeFastStreak(sawm.data ?? [], 'ramadan', today);
  }, [sawm.data]);

  const qadaaFastStreak = useMemo((): number => {
    const today = todayHijriDate();
    return computeFastStreak(sawm.data ?? [], 'qadaa', today);
  }, [sawm.data]);

  return {
    prayerStreaks,
    bestPrayerStreak,
    activePrayerStreaks,
    monThuStreak,
    obligatoryStreak,
    fastStreak,
    qadaaFastStreak,
    loading: salah.isLoading || sawm.isLoading,
  };
};

export const useStreak = (enabled = true) => {
  const { obligatoryStreak: streak, loading } = useStreakDetails(enabled);
  const milestone = STREAK_MILESTONES.includes(streak) ? streak : null;
  return { streak, milestone, loading };
};
