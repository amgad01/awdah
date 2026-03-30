import React from 'react';
import { CheckCircle, Moon, Sun, TrendingUp, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { WeeklyPrayerChart } from '@/components/ui/weekly-chart/weekly-chart';
import type { BestPrayerStreak } from '@/hooks/use-streak';
import styles from './dashboard.module.css';

interface StreakCardProps {
  streak: number;
  milestone: number | null;
  monThuStreak: number;
  obligatoryStreak: number;
  fastStreak: number;
  activePrayerStreaks: BestPrayerStreak[];
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  milestone,
  monThuStreak,
  obligatoryStreak,
  fastStreak,
  activePrayerStreaks,
  t,
  fmtNumber,
}) => {
  const hasAnyRecord =
    activePrayerStreaks.length > 0 || monThuStreak > 0 || obligatoryStreak > 0 || fastStreak > 0;

  return (
    <Card
      title={streak > 0 ? t('dashboard.snapshot_streak') : t('dashboard.streak_start')}
      subtitle={t('dashboard.card_streak_subtitle')}
      className={`${styles.surfaceCard} ${styles.statCard}`}
    >
      <div className={styles.streakHeader}>
        <div className={styles.statLead}>
          <span className={styles.statLeadValue}>{fmtNumber(streak)}</span>
          <span className={styles.statLeadLabel}>
            {t('dashboard.streak_days', { count: streak })}
          </span>
        </div>
        <div className={styles.streakBadge}>
          <TrendingUp size={16} />
          <span>{streak > 0 ? t('dashboard.streak_live') : t('dashboard.streak_none')}</span>
        </div>
      </div>

      {milestone !== null && (
        <p className={styles.streakMilestone}>
          {t('dashboard.streak_milestone', { n: fmtNumber(milestone) })}
          {t('dashboard.celebration_suffix')}
        </p>
      )}
      {streak === 0 && <p className={styles.streakNone}>{t('dashboard.streak_none')}</p>}

      {hasAnyRecord && (
        <div className={styles.recordStreakList}>
          {obligatoryStreak > 0 && (
            <div className={styles.recordStreakRow}>
              <CheckCircle size={13} className={styles.recordStreakIcon} />
              <span>
                {t('dashboard.record_obligatory_streak', {
                  n: fmtNumber(obligatoryStreak),
                  count: obligatoryStreak,
                })}
              </span>
            </div>
          )}
          {activePrayerStreaks.map((ps) => (
            <div key={ps.name} className={styles.recordStreakRow}>
              <Moon size={13} className={styles.recordStreakIcon} />
              <span>
                {t('dashboard.record_prayer_streak', {
                  prayer: t(`prayers.${ps.name}`),
                  n: fmtNumber(ps.count),
                  count: ps.count,
                })}
              </span>
            </div>
          ))}
          {fastStreak > 0 && (
            <div className={styles.recordStreakRow}>
              <Utensils size={13} className={styles.recordStreakIcon} />
              <span>
                {t('dashboard.record_fast_streak', {
                  n: fmtNumber(fastStreak),
                  count: fastStreak,
                })}
              </span>
            </div>
          )}
          {monThuStreak > 0 && (
            <div className={styles.recordStreakRow}>
              <Sun size={13} className={styles.recordStreakIcon} />
              <span>
                {t('dashboard.record_mon_thu_streak', {
                  n: fmtNumber(monThuStreak),
                  count: monThuStreak,
                })}
              </span>
            </div>
          )}
        </div>
      )}

      <WeeklyPrayerChart />
    </Card>
  );
};
