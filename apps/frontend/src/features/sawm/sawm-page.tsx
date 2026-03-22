import React from 'react';
import { useSawmDebt } from '@/hooks/use-worship';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import { Sun, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import styles from './sawm-page.module.css';

export const SawmPage: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { data: debt, isLoading } = useSawmDebt();

  const total = debt?.totalDaysOwed ?? 0;
  const completed = debt?.completedDays ?? 0;
  const remaining = debt?.remainingDays ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Sun size={28} />
        </div>
        <div>
          <h1 className={styles.title}>{t('sawm.title')}</h1>
          <p className={styles.subtitle}>{t('sawm.subtitle')}</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Debt Overview */}
        <Card title={t('sawm.debt_overview')} className={styles.debtCard}>
          <div className={styles.statsRow}>
            <div className={styles.statBlock}>
              <span className={styles.statNum}>{fmtNumber(total)}</span>
              <span className={styles.statLabel}>{t('sawm.owed')}</span>
            </div>
            <div className={`${styles.statBlock} ${styles.statCompleted}`}>
              <span className={styles.statNum}>{fmtNumber(completed)}</span>
              <span className={styles.statLabel}>{t('sawm.completed')}</span>
            </div>
            <div className={`${styles.statBlock} ${styles.statRemaining}`}>
              <span className={styles.statNum}>{fmtNumber(remaining)}</span>
              <span className={styles.statLabel}>{t('sawm.remaining')}</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <ProgressBar
              variant="accent"
              value={completed}
              max={total || 1}
              label={`${fmtNumber(progressPct)}% ${t('sawm.complete')}`}
            />
          </div>

          {remaining === 0 ? (
            <div className={styles.completedMsg}>
              <CheckCircle2 size={20} />
              {t('sawm.all_complete')}
            </div>
          ) : (
            <div className={styles.projectionMsg}>
              <TrendingUp size={16} />
              <span>
                {t('sawm.projection_prefix')} <strong>{fmtNumber(remaining)}</strong>{' '}
                {t('sawm.projection_suffix')}
              </span>
            </div>
          )}
        </Card>

        {/* Daily Sawm Logger */}
        <Card
          title={t('sawm.daily_logger')}
          subtitle={t('sawm.daily_logger_hint')}
          className={styles.loggerCard}
        >
          <SawmLogger />
        </Card>

        {/* Guidance */}
        <Card title={t('sawm.guidance_title')} variant="outline" className={styles.guidanceCard}>
          <ul className={styles.guidanceList}>
            {[1, 2, 3].map((n) => (
              <li key={n} className={styles.guidanceItem}>
                <Circle size={8} className={styles.bullet} />
                <span>{t(`sawm.guidance_${n}`)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.guidanceNote}>{t('sawm.guidance_note')}</p>
        </Card>
      </div>
    </div>
  );
};
