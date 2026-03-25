import React, { useEffect, useRef, useState } from 'react';
import type { BestPrayerStreak } from '@/hooks/use-streak';

const PRAYER_CELEBRATION_MILESTONES = [7, 14, 21, 30, 60, 100];

interface UseCelebrationArgs {
  streak: number;
  milestone: number | null;
  bestPrayerStreak: BestPrayerStreak | null;
  monThuStreak: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export function useCelebration({
  streak,
  milestone,
  bestPrayerStreak,
  monThuStreak,
  t,
  fmtNumber,
}: UseCelebrationArgs) {
  const [celebration, setCelebration] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const prevStreak = useRef(streak);
  const prevBestPrayerCount = useRef(bestPrayerStreak?.count ?? 0);
  const prevMonThu = useRef(monThuStreak);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      return;
    }

    if (streak > prevStreak.current && milestone !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebration(t('dashboard.celebration_streak', { n: fmtNumber(streak) }));
    } else if (
      bestPrayerStreak &&
      bestPrayerStreak.count > prevBestPrayerCount.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(bestPrayerStreak.count)
    ) {
      setCelebration(
        t('dashboard.celebration_prayer_streak', {
          prayer: t(`prayers.${bestPrayerStreak.name}`),
          n: fmtNumber(bestPrayerStreak.count),
        }),
      );
    } else if (monThuStreak > prevMonThu.current && monThuStreak > 0 && monThuStreak % 4 === 0) {
      setCelebration(t('dashboard.celebration_mon_thu', { n: fmtNumber(monThuStreak) }));
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
  }, [
    streak,
    milestone,
    bestPrayerStreak,
    bestPrayerStreak?.count,
    bestPrayerStreak?.name,
    monThuStreak,
    t,
    fmtNumber,
  ]);

  const dismiss = React.useCallback(() => setCelebration(null), []);

  return { celebration, dismiss };
}
