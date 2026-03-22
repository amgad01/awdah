import React from 'react';
import { useSalahDebt } from '@/hooks/use-worship';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { PrayerLogger } from '@/features/salah/prayer-logger';
import { Moon, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import styles from './salah-page.module.css';

export const SalahPage: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { data: debt, isLoading } = useSalahDebt();

  const total = debt?.totalPrayersOwed ?? 0;
  const completed = debt?.completedPrayers ?? 0;
  const remaining = debt?.remainingPrayers ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const daysToComplete = remaining > 0 ? Math.ceil(remaining / 5) : 0;

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Moon size={28} />
        </div>
        <div>
          <h1 className={styles.title}>{t('salah.title')}</h1>
          <p className={styles.subtitle}>{t('salah.subtitle')}</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Debt Overview */}
        <Card title={t('salah.debt_overview')} className={styles.debtCard}>
          <div className={styles.statsRow}>
            <div className={styles.statBlock}>
              <span className={styles.statNum}>{fmtNumber(total)}</span>
              <span className={styles.statLabel}>{t('salah.owed')}</span>
            </div>
            <div className={`${styles.statBlock} ${styles.statCompleted}`}>
              <span className={styles.statNum}>{fmtNumber(completed)}</span>
              <span className={styles.statLabel}>{t('salah.completed')}</span>
            </div>
            <div className={`${styles.statBlock} ${styles.statRemaining}`}>
              <span className={styles.statNum}>{fmtNumber(remaining)}</span>
              <span className={styles.statLabel}>{t('salah.remaining')}</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <ProgressBar
              value={completed}
              max={total || 1}
              label={`${fmtNumber(progressPct)}% ${t('salah.complete')}`}
            />
          </div>

          {remaining === 0 ? (
            <div className={styles.completedMsg}>
              <CheckCircle2 size={20} />
              {t('salah.all_complete')}
            </div>
          ) : (
            <div className={styles.projectionMsg}>
              <TrendingUp size={16} />
              <span>
                {t('salah.projection_prefix')} <strong>{fmtNumber(daysToComplete)}</strong>{' '}
                {t('salah.projection_suffix')}
              </span>
            </div>
          )}
        </Card>

        {/* Daily Prayer Logger */}
        <Card
          title={t('salah.daily_logger')}
          subtitle={t('salah.daily_logger_hint')}
          className={styles.loggerCard}
        >
          <PrayerLogger />
        </Card>

        {/* How to use */}
        <Card title={t('salah.guidance_title')} variant="outline" className={styles.guidanceCard}>
          <ul className={styles.guidanceList}>
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={styles.guidanceItem}>
                <Circle size={8} className={styles.bullet} />
                <span>{t(`salah.guidance_${n}`)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.guidanceNote}>{t('salah.guidance_note')}</p>
        </Card>
      </div>
    </div>
  );
};
