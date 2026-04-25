import React, { type ReactNode } from 'react';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { useLanguage } from '@/hooks/use-language';
import styles from './dashboard.module.css';

export interface BaseDebtCardProps {
  title: string;
  subtitle: string;
  completed: number;
  remaining: number;
  total: number;
  completionRate: number;
  completedLabel: string;
  remainingLabel: string;
  progressLabel: string;
  className?: string;
  progressVariant?: 'primary' | 'accent' | 'success';
  beforeProgress?: ReactNode;
  children?: ReactNode;
}

export const BaseDebtCard: React.FC<BaseDebtCardProps> = ({
  title,
  subtitle,
  completed,
  remaining,
  total,
  completionRate,
  completedLabel,
  remainingLabel,
  progressLabel,
  className = '',
  progressVariant = 'primary',
  beforeProgress,
  children,
}) => {
  const { t, fmtNumber } = useLanguage();

  return (
    <Card title={title} subtitle={subtitle} className={`${styles.surfaceCard} ${className}`}>
      <div className={styles.cardSummary}>
        <div className={styles.statLead}>
          <span className={styles.statLeadValue}>{fmtNumber(completed)}</span>
          <span className={styles.statLeadLabel}>{completedLabel}</span>
        </div>
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(remaining)}</strong>
            <span>{remainingLabel}</span>
          </div>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(completionRate)}%</strong>
            <span>{t('dashboard.progress_complete')}</span>
          </div>
        </div>
      </div>

      {beforeProgress}

      <ProgressBar
        variant={progressVariant}
        value={completed}
        max={total || 1}
        label={progressLabel}
      />

      {children}
    </Card>
  );
};
