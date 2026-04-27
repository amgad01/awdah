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
  qadaaFastStreak: number;
  allDebtCleared: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

// Domain helper for celebration logic
function checkStreakCelebration(current: number, previous: number, milestones: number[]): boolean {
  return current > previous && milestones.includes(current);
}

function buildCelebrationMessage(
  key: string,
  opts: Record<string, unknown> | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const msg = t(key, opts);
  const suffix = t('dashboard.celebration_suffix');
  return `${msg}${suffix}`;
}

export function useCelebration({
  streak,
  milestone,
  bestPrayerStreak,
  monThuStreak,
  obligatoryStreak,
  fastStreak,
  qadaaFastStreak,
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
  const prevQadaaFast = useRef(qadaaFastStreak);

  useEffect(() => {
    let nextCelebration: string | null = null;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      prevObligatory.current = obligatoryStreak;
      prevFast.current = fastStreak;
      prevQadaaFast.current = qadaaFastStreak;

      if (allDebtCleared) {
        nextCelebration = t('dashboard.debt_cleared_title');
      }
    } else {
      if (streak > prevStreak.current && milestone !== null) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_streak',
          {
            n: fmtNumber(streak),
          },
          t,
        );
      } else if (
        checkStreakCelebration(
          obligatoryStreak,
          prevObligatory.current,
          PRAYER_CELEBRATION_MILESTONES,
        )
      ) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_obligatory_streak',
          {
            n: fmtNumber(obligatoryStreak),
          },
          t,
        );
      } else if (
        bestPrayerStreak &&
        checkStreakCelebration(
          bestPrayerStreak.count,
          prevBestPrayerCount.current,
          PRAYER_CELEBRATION_MILESTONES,
        )
      ) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_prayer_streak',
          {
            prayer: t(`prayers.${bestPrayerStreak.name}`),
            n: fmtNumber(bestPrayerStreak.count),
          },
          t,
        );
      } else if (
        checkStreakCelebration(fastStreak, prevFast.current, PRAYER_CELEBRATION_MILESTONES)
      ) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_fast_streak',
          {
            n: fmtNumber(fastStreak),
          },
          t,
        );
      } else if (
        checkStreakCelebration(
          qadaaFastStreak,
          prevQadaaFast.current,
          PRAYER_CELEBRATION_MILESTONES,
        )
      ) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_qadaa_fast_streak',
          {
            n: fmtNumber(qadaaFastStreak),
          },
          t,
        );
      } else if (monThuStreak > prevMonThu.current && monThuStreak > 0) {
        nextCelebration = buildCelebrationMessage(
          'dashboard.celebration_mon_thu',
          {
            count: monThuStreak,
            n: fmtNumber(monThuStreak),
          },
          t,
        );
      } else if (allDebtCleared) {
        nextCelebration = t('dashboard.debt_cleared_title');
      }
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
    prevObligatory.current = obligatoryStreak;
    prevFast.current = fastStreak;
    prevQadaaFast.current = qadaaFastStreak;

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
    qadaaFastStreak,
    allDebtCleared,
    t,
    fmtNumber,
  ]);

  const dismiss = React.useCallback(() => setCelebration(null), []);

  return { celebration, dismiss };
}
