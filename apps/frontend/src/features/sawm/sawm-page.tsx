import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSawmDebt } from '@/hooks/use-worship';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import { invalidateSawmQueries } from '@/utils/query-invalidation';
import { todayHijriDate } from '@/utils/date-utils';
import { Sun, CheckCircle2, Circle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import styles from './sawm-page.module.css';

export const SawmPage: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const queryClient = useQueryClient();
  const { data: debt, isLoading, error, isError } = useSawmDebt();
  const [showRemaining, setShowRemaining] = useState(false);

  const total = debt?.totalDaysOwed ?? 0;
  const completed = debt?.completedDays ?? 0;
  const remaining = debt?.remainingDays ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allComplete = total > 0 && remaining === 0;

  const todayDual = format(todayHijriDate());

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : t('common.error')}
        onRetry={() => invalidateSawmQueries(queryClient)}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroBadge}>{t('sawm.hero_badge')}</span>
          <h1 className={styles.heroTitle}>{t('sawm.title')}</h1>
          <p className={styles.heroSubtitle}>{t('sawm.subtitle')}</p>
          <div className={styles.heroChips}>
            <span className={styles.heroChip}>{todayDual.primary}</span>
            <span className={`${styles.heroChip} ${styles.heroChipSecondary}`}>
              {todayDual.secondary}
            </span>
          </div>
        </div>

        <Card className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <Sun size={20} aria-hidden="true" />
            <span className={styles.heroCardLabel}>{t('sawm.hero_focus')}</span>
          </div>
          <span className={styles.heroCardValue}>{fmtNumber(completed)}</span>
          <p className={styles.heroCardBody}>
            {allComplete
              ? t('sawm.hero_focus_complete')
              : t('sawm.hero_focus_body', { completed: fmtNumber(completed) })}
          </p>
        </Card>
      </section>

      {/* ── Quick Stats ── */}
      <div className={styles.quickStats}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('sawm.owed')}</span>
          <span className={styles.statValue}>{fmtNumber(total)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('sawm.completed')}</span>
          <span className={`${styles.statValue} ${styles.statSuccess}`}>
            {fmtNumber(completed)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('sawm.remaining')}</span>
          <span className={`${styles.statValue} ${styles.statAccent}`}>{fmtNumber(remaining)}</span>
        </div>
      </div>

      {/* ── Progress Card ── */}
      <Card className={styles.progressCard}>
        <ProgressBar
          variant="accent"
          value={completed}
          max={total || 1}
          label={`${fmtNumber(progressPct)}% ${t('sawm.complete')}`}
        />

        {allComplete ? (
          <div className={styles.completedMsg}>
            <CheckCircle2 size={20} />
            {t('sawm.all_complete')}
          </div>
        ) : remaining > 0 ? (
          <>
            <button
              className={styles.toggleRemaining}
              onClick={() => setShowRemaining((v) => !v)}
              aria-expanded={showRemaining}
            >
              <span>{showRemaining ? t('sawm.hide_details') : t('sawm.view_details')}</span>
              {showRemaining ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRemaining && (
              <div className={styles.remainingDetail}>
                <TrendingUp size={16} aria-hidden="true" />
                <span>
                  <strong>{fmtNumber(remaining)}</strong> {t('sawm.projection_suffix')}
                </span>
              </div>
            )}
          </>
        ) : null}
      </Card>

      {/* ── Encouragement ── */}
      <div className={styles.encouragement}>{t('sawm.encouragement')}</div>

      <div className={styles.grid}>
        {/* ── Daily Sawm Logger ── */}
        <Card
          title={t('sawm.daily_logger')}
          subtitle={t('sawm.daily_logger_hint')}
          className={styles.loggerCard}
        >
          <SawmLogger />
        </Card>

        {/* ── Guidance ── */}
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
