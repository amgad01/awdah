import React, { Suspense, lazy } from 'react';
import { CheckCircle, Moon, Sun, TrendingUp, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { useLanguage } from '@/hooks/use-language';
import type { BestPrayerStreak } from '@/hooks/use-streak';
import styles from './dashboard.module.css';

const WeeklyPrayerChart = lazy(() =>
  import('@/components/ui/weekly-chart/weekly-chart').then((module) => ({
    default: module.WeeklyPrayerChart,
  })),
);

interface StreakCardProps {
  streak: number;
  milestone: number | null;
  monThuStreak: number;
  obligatoryStreak: number;
  fastStreak: number;
  qadaaFastStreak: number;
  activePrayerStreaks: BestPrayerStreak[];
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  milestone,
  monThuStreak,
  obligatoryStreak,
  fastStreak,
  qadaaFastStreak,
  activePrayerStreaks,
}) => {
  const { t, fmtNumber } = useLanguage();

  const hasAnyRecord =
    activePrayerStreaks.length > 0 ||
    monThuStreak > 0 ||
    obligatoryStreak > 0 ||
    fastStreak > 0 ||
    qadaaFastStreak > 0;

  return (
    <Card
      title={
        streak > 0 || hasAnyRecord ? t('dashboard.snapshot_streak') : t('dashboard.streak_start')
      }
      subtitle={t('dashboard.card_streak_subtitle')}
      className={`${styles.surfaceCard} ${styles.statCard}`}
    >
      {(streak > 0 || !hasAnyRecord) && (
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
      )}

      {milestone !== null && (
        <p className={styles.streakMilestone}>
          {t('dashboard.streak_milestone', { n: fmtNumber(milestone) })}
          {t('dashboard.celebration_suffix')}
        </p>
      )}
      {streak === 0 && !hasAnyRecord && (
        <p className={styles.streakNone}>{t('dashboard.streak_none')}</p>
      )}

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
            <div key={`${ps.name}-${ps.type}`} className={styles.recordStreakRow}>
              <Moon size={13} className={styles.recordStreakIcon} />
              <span>
                {ps.type === 'qadaa'
                  ? t('dashboard.record_qadaa_prayer_streak', {
                      prayer: t(`prayers.${ps.name}`),
                      n: fmtNumber(ps.count),
                      count: ps.count,
                    })
                  : t('dashboard.record_prayer_streak', {
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
          {qadaaFastStreak > 0 && (
            <div className={styles.recordStreakRow}>
              <Utensils size={13} className={styles.recordStreakIcon} />
              <span>
                {t('dashboard.record_qadaa_fast_streak', {
                  n: fmtNumber(qadaaFastStreak),
                  count: qadaaFastStreak,
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
      <Suspense fallback={<div className={styles.streakNone}>{t('common.loading')}</div>}>
        <WeeklyPrayerChart />
      </Suspense>
    </Card>
  );
};
