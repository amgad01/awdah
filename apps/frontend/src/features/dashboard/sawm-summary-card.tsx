import React from 'react';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import { useLanguage } from '@/hooks/use-language';
import { BaseDebtCard } from './base-debt-card';
import { ToggleDetails } from './components/toggle-details';
import styles from './dashboard.module.css';

interface SawmSummaryCardProps {
  sawmCompleted: number;
  sawmRemaining: number;
  sawmTotal: number;
  sawmCompletionRate: number;
}

export const SawmSummaryCard: React.FC<SawmSummaryCardProps> = ({
  sawmCompleted,
  sawmRemaining,
  sawmTotal,
  sawmCompletionRate,
}) => {
  const { t, fmtNumber } = useLanguage();

  return (
    <BaseDebtCard
      title={t('dashboard.sawm_summary')}
      subtitle={t('dashboard.card_sawm_subtitle')}
      completed={sawmCompleted}
      remaining={sawmRemaining}
      total={sawmTotal}
      completionRate={sawmCompletionRate}
      completedLabel={t('dashboard.sawm_completed_label')}
      remainingLabel={t('dashboard.fasts_remaining')}
      progressLabel={t('dashboard.ramadan_progress')}
      className={styles.sawmCard}
      progressVariant="accent"
      beforeProgress={<SawmLogger />}
    >
      <ToggleDetails>
        <p>
          <strong>{fmtNumber(sawmRemaining)}</strong> {t('dashboard.fasts_remaining_details')}
        </p>
      </ToggleDetails>
    </BaseDebtCard>
  );
};
