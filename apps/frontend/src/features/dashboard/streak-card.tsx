import React from 'react';
import { Moon, Sun, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { WeeklyPrayerChart } from '@/components/ui/weekly-chart/weekly-chart';
import type { BestPrayerStreak } from '@/hooks/use-streak';
import styles from './dashboard.module.css';

interface StreakCardProps {
  streak: number;
  milestone: number | null;
  bestPrayerStreak: BestPrayerStreak | null;
  monThuStreak: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  milestone,
  bestPrayerStreak,
  monThuStreak,
  t,
  fmtNumber,
}) => (
  <Card
    title={streak > 0 ? t('dashboard.snapshot_streak') : t('dashboard.streak_start')}
    subtitle={t('dashboard.card_streak_subtitle')}
    className={`${styles.surfaceCard} ${styles.statCard}`}
  >
    <div className={styles.streakHeader}>
      <div className={styles.statLead}>
        <span className={styles.statLeadValue}>{fmtNumber(streak)}</span>
        <span className={styles.statLeadLabel}>{t('dashboard.streak_days')}</span>
      </div>
      <div className={styles.streakBadge}>
        <TrendingUp size={16} />
        <span>{streak > 0 ? t('dashboard.streak_live') : t('dashboard.streak_none')}</span>
      </div>
    </div>

    {milestone !== null && (
      <p className={styles.streakMilestone}>
        {t('dashboard.streak_milestone', { n: fmtNumber(milestone) })}
      </p>
    )}
    {streak === 0 && <p className={styles.streakNone}>{t('dashboard.streak_none')}</p>}

    {(bestPrayerStreak || monThuStreak > 0) && (
      <div className={styles.recordStreakList}>
        {bestPrayerStreak && (
          <div className={styles.recordStreakRow}>
            <Moon size={13} className={styles.recordStreakIcon} />
            <span>
              {t('dashboard.record_prayer_streak', {
                prayer: t(`prayers.${bestPrayerStreak.name}`),
                n: fmtNumber(bestPrayerStreak.count),
              })}
            </span>
          </div>
        )}
        {monThuStreak > 0 && (
          <div className={styles.recordStreakRow}>
            <Sun size={13} className={styles.recordStreakIcon} />
            <span>{t('dashboard.record_mon_thu_streak', { n: fmtNumber(monThuStreak) })}</span>
          </div>
        )}
      </div>
    )}

    <WeeklyPrayerChart />
  </Card>
);
