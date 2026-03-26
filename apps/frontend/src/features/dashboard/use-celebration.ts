import React, { useEffect, useRef, useState } from 'react';
import type { BestPrayerStreak } from '@/hooks/use-streak';

const PRAYER_CELEBRATION_MILESTONES = [7, 14, 21, 30, 60, 100];

interface UseCelebrationArgs {
  streak: number;
  milestone: number | null;
  bestPrayerStreak: BestPrayerStreak | null;
  monThuStreak: number;
  obligatoryStreak: number;
  qadaaFastStreak: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export function useCelebration({
  streak,
  milestone,
  bestPrayerStreak,
  monThuStreak,
  obligatoryStreak,
  qadaaFastStreak,
  t,
  fmtNumber,
}: UseCelebrationArgs) {
  const [celebration, setCelebration] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const prevStreak = useRef(streak);
  const prevBestPrayerCount = useRef(bestPrayerStreak?.count ?? 0);
  const prevMonThu = useRef(monThuStreak);
  const prevObligatory = useRef(obligatoryStreak);
  const prevQadaaFast = useRef(qadaaFastStreak);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      prevObligatory.current = obligatoryStreak;
      prevQadaaFast.current = qadaaFastStreak;
      return;
    }

    if (streak > prevStreak.current && milestone !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebration(t('dashboard.celebration_streak', { n: fmtNumber(streak) }));
    } else if (
      obligatoryStreak > prevObligatory.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(obligatoryStreak)
    ) {
      setCelebration(
        t('dashboard.celebration_obligatory_streak', { n: fmtNumber(obligatoryStreak) }),
      );
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
    } else if (
      qadaaFastStreak > prevQadaaFast.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(qadaaFastStreak)
    ) {
      setCelebration(
        t('dashboard.celebration_qadaa_fast_streak', { n: fmtNumber(qadaaFastStreak) }),
      );
    } else if (monThuStreak > prevMonThu.current && monThuStreak > 0 && monThuStreak % 4 === 0) {
      setCelebration(t('dashboard.celebration_mon_thu', { n: fmtNumber(monThuStreak) }));
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
    prevObligatory.current = obligatoryStreak;
    prevQadaaFast.current = qadaaFastStreak;
  }, [
    streak,
    milestone,
    bestPrayerStreak,
    bestPrayerStreak?.count,
    bestPrayerStreak?.name,
    monThuStreak,
    obligatoryStreak,
    qadaaFastStreak,
    t,
    fmtNumber,
  ]);

  const dismiss = React.useCallback(() => setCelebration(null), []);

  return { celebration, dismiss };
}
