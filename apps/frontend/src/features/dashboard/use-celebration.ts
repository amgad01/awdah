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
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      prevObligatory.current = obligatoryStreak;
      prevFast.current = fastStreak;
      return;
    }

    const showCelebration = (key: string, opts?: Record<string, unknown>) => {
      const msg = t(key, opts);
      const suffix = t('dashboard.celebration_suffix');
      setCelebration(`${msg}${suffix}`);
    };

    if (streak > prevStreak.current && milestone !== null) {
      showCelebration('dashboard.celebration_streak', { n: fmtNumber(streak) });
    } else if (
      obligatoryStreak > prevObligatory.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(obligatoryStreak)
    ) {
      showCelebration('dashboard.celebration_obligatory_streak', {
        n: fmtNumber(obligatoryStreak),
      });
    } else if (
      bestPrayerStreak &&
      bestPrayerStreak.count > prevBestPrayerCount.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(bestPrayerStreak.count)
    ) {
      showCelebration('dashboard.celebration_prayer_streak', {
        prayer: t(`prayers.${bestPrayerStreak.name}`),
        n: fmtNumber(bestPrayerStreak.count),
      });
    } else if (
      fastStreak > prevFast.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(fastStreak)
    ) {
      showCelebration('dashboard.celebration_fast_streak', { n: fmtNumber(fastStreak) });
    } else if (monThuStreak > prevMonThu.current && monThuStreak > 0) {
      showCelebration('dashboard.celebration_mon_thu', {
        count: monThuStreak,
        n: fmtNumber(monThuStreak),
      });
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
    prevObligatory.current = obligatoryStreak;
    prevFast.current = fastStreak;
  }, [
    streak,
    milestone,
    bestPrayerStreak,
    bestPrayerStreak?.count,
    bestPrayerStreak?.name,
    monThuStreak,
    obligatoryStreak,
    fastStreak,
    t,
    fmtNumber,
  ]);

  const dismiss = React.useCallback(() => setCelebration(null), []);

  return { celebration, dismiss };
}
