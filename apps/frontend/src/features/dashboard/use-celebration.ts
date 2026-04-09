import React, { useEffect, useRef, useState } from 'react';
import type { BestPrayerStreak } from '@/hooks/use-streak';

const PRAYER_CELEBRATION_MILESTONES = [7, 14, 21, 30, 60, 100];

interface UseCelebrationArgs {
  streak: number;
  milestone: number | null;
  bestPrayerStreak: BestPrayerStreak | null;
  monThuStreak: number;
  obligatoryStreak: number;
  fastStreak: number;
  allDebtCleared: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export function useCelebration({
  streak,
  milestone,
  bestPrayerStreak,
  monThuStreak,
  obligatoryStreak,
  fastStreak,
  allDebtCleared,
  t,
  fmtNumber,
}: UseCelebrationArgs) {
  const [celebration, setCelebration] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const prevStreak = useRef(streak);
  const prevBestPrayerCount = useRef(bestPrayerStreak?.count ?? 0);
  const prevMonThu = useRef(monThuStreak);
  const prevObligatory = useRef(obligatoryStreak);
  const prevFast = useRef(fastStreak);

  useEffect(() => {
    let nextCelebration: string | null = null;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      prevObligatory.current = obligatoryStreak;
      prevFast.current = fastStreak;

      if (allDebtCleared) {
        nextCelebration = t('dashboard.debt_cleared_title');
      }
    } else {
      const buildCelebration = (key: string, opts?: Record<string, unknown>) => {
        const msg = t(key, opts);
        const suffix = t('dashboard.celebration_suffix');
        return `${msg}${suffix}`;
      };

      if (streak > prevStreak.current && milestone !== null) {
        nextCelebration = buildCelebration('dashboard.celebration_streak', {
          n: fmtNumber(streak),
        });
      } else if (
        obligatoryStreak > prevObligatory.current &&
        PRAYER_CELEBRATION_MILESTONES.includes(obligatoryStreak)
      ) {
        nextCelebration = buildCelebration('dashboard.celebration_obligatory_streak', {
          n: fmtNumber(obligatoryStreak),
        });
      } else if (
        bestPrayerStreak &&
        bestPrayerStreak.count > prevBestPrayerCount.current &&
        PRAYER_CELEBRATION_MILESTONES.includes(bestPrayerStreak.count)
      ) {
        nextCelebration = buildCelebration('dashboard.celebration_prayer_streak', {
          prayer: t(`prayers.${bestPrayerStreak.name}`),
          n: fmtNumber(bestPrayerStreak.count),
        });
      } else if (
        fastStreak > prevFast.current &&
        PRAYER_CELEBRATION_MILESTONES.includes(fastStreak)
      ) {
        nextCelebration = buildCelebration('dashboard.celebration_fast_streak', {
          n: fmtNumber(fastStreak),
        });
      } else if (monThuStreak > prevMonThu.current && monThuStreak > 0) {
        nextCelebration = buildCelebration('dashboard.celebration_mon_thu', {
          count: monThuStreak,
          n: fmtNumber(monThuStreak),
        });
      } else if (allDebtCleared) {
        nextCelebration = t('dashboard.debt_cleared_title');
      }
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
    prevObligatory.current = obligatoryStreak;
    prevFast.current = fastStreak;

    if (nextCelebration === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setCelebration(nextCelebration);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [
    streak,
    milestone,
    bestPrayerStreak,
    bestPrayerStreak?.count,
    bestPrayerStreak?.name,
    monThuStreak,
    obligatoryStreak,
    fastStreak,
    allDebtCleared,
    t,
    fmtNumber,
  ]);

  const dismiss = React.useCallback(() => setCelebration(null), []);

  return { celebration, dismiss };
}
