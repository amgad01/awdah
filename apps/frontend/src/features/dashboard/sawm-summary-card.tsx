import React, { useState } from 'react';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import styles from './dashboard.module.css';

interface SawmSummaryCardProps {
  sawmCompleted: number;
  sawmRemaining: number;
  sawmTotal: number;
  sawmCompletionRate: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export const SawmSummaryCard: React.FC<SawmSummaryCardProps> = ({
  sawmCompleted,
  sawmRemaining,
  sawmTotal,
  sawmCompletionRate,
  t,
  fmtNumber,
}) => {
  const [showRemaining, setShowRemaining] = useState(false);

  return (
    <Card
      title={t('dashboard.sawm_summary')}
      subtitle={t('dashboard.card_sawm_subtitle')}
      className={`${styles.surfaceCard} ${styles.sawmCard}`}
    >
      <div className={styles.cardSummary}>
        <div className={styles.statLead}>
          <span className={styles.statLeadValue}>{fmtNumber(sawmCompleted)}</span>
          <span className={styles.statLeadLabel}>{t('dashboard.sawm_completed_label')}</span>
        </div>
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(sawmRemaining)}</strong>
            <span>{t('dashboard.fasts_remaining')}</span>
          </div>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(sawmCompletionRate)}%</strong>
            <span>{t('dashboard.progress_complete')}</span>
          </div>
        </div>
      </div>

      <SawmLogger />
      <ProgressBar
        variant="accent"
        value={sawmCompleted}
        max={sawmTotal || 1}
        label={t('dashboard.ramadan_progress')}
      />
      <button
        className={styles.toggleRemaining}
        onClick={() => setShowRemaining((value) => !value)}
        aria-expanded={showRemaining}
        type="button"
      >
        {showRemaining ? t('dashboard.hide_details') : t('dashboard.view_details')}
      </button>
      {showRemaining && (
        <p className={styles.remainingDetail}>
          <strong>{fmtNumber(sawmRemaining)}</strong> {t('dashboard.fasts_remaining_details')}
        </p>
      )}
    </Card>
  );
};
