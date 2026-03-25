import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { GlossaryText } from '@/components/ui/term-tooltip';
import {
  DEFAULT_DAILY_INTENTION,
  DAYS_PER_YEAR,
  MAX_DAILY_INTENTION,
  MIN_DAILY_INTENTION,
  PRAYERS,
} from '@/lib/constants';
import styles from './dashboard.module.css';

interface SalahDebtCardProps {
  salahCompleted: number;
  salahRemaining: number;
  salahTotal: number;
  salahCompletionRate: number;
  perPrayerRemaining?: Record<string, number>;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fmtNumber: (n: number) => string;
}

export const SalahDebtCard: React.FC<SalahDebtCardProps> = ({
  salahCompleted,
  salahRemaining,
  salahTotal,
  salahCompletionRate,
  perPrayerRemaining,
  t,
  fmtNumber,
}) => {
  const [showRemaining, setShowRemaining] = useState(false);
  const [dailyRate, setDailyRate] = useState(DEFAULT_DAILY_INTENTION);

  const salahYears =
    salahTotal > 0 && salahRemaining > 0
      ? Math.ceil(salahRemaining / dailyRate / DAYS_PER_YEAR)
      : 0;

  return (
    <Card
      title={t('dashboard.salah_debt')}
      subtitle={t('dashboard.salah_debt_subtitle')}
      className={`${styles.surfaceCard} ${styles.debtCard}`}
    >
      <div className={styles.cardSummary}>
        <div className={styles.statLead}>
          <span className={styles.statLeadValue}>{fmtNumber(salahCompleted)}</span>
          <span className={styles.statLeadLabel}>{t('dashboard.completed_label')}</span>
        </div>
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(salahRemaining)}</strong>
            <span>{t('dashboard.prayers_remaining')}</span>
          </div>
          <div className={styles.quickStat}>
            <strong>{fmtNumber(salahCompletionRate)}%</strong>
            <span>{t('dashboard.progress_complete')}</span>
          </div>
        </div>
      </div>

      <ProgressBar
        value={salahCompleted}
        max={salahTotal || 1}
        label={t('dashboard.overall_progress')}
      />

      <p className={styles.encouragement}>
        <GlossaryText>{t('dashboard.encouragement_message')}</GlossaryText>
      </p>
      {salahTotal > 0 && salahRemaining > 0 && (
        <>
          <div className={styles.rateCalc}>
            <span className={styles.rateLabel}>{t('dashboard.rate_label')}</span>
            <div className={styles.rateStepper}>
              <button
                type="button"
                className={styles.rateBtn}
                onClick={() => setDailyRate((r) => Math.max(MIN_DAILY_INTENTION, r - 1))}
                aria-label={t('common.decrease_rate')}
                disabled={dailyRate <= MIN_DAILY_INTENTION}
              >
                <Minus size={12} />
              </button>
              <span className={styles.rateVal}>{fmtNumber(dailyRate)}</span>
              <button
                type="button"
                className={styles.rateBtn}
                onClick={() => setDailyRate((r) => Math.min(MAX_DAILY_INTENTION, r + 1))}
                aria-label={t('common.increase_rate')}
                disabled={dailyRate >= MAX_DAILY_INTENTION}
              >
                <Plus size={12} />
              </button>
            </div>
            <span className={styles.rateUnit}>{t('dashboard.rate_unit')}</span>
          </div>
          <p className={styles.projection}>
            {salahYears <= 1
              ? t('dashboard.projection_almost_done')
              : t('dashboard.projection_rate_positive', { n: fmtNumber(dailyRate) })}
          </p>
        </>
      )}
      <button
        className={styles.toggleRemaining}
        onClick={() => setShowRemaining((value) => !value)}
        aria-expanded={showRemaining}
        type="button"
      >
        {showRemaining ? t('dashboard.hide_details') : t('dashboard.view_details')}
      </button>
      {showRemaining && (
        <div className={styles.remainingDetail}>
          <p>
            <strong>{fmtNumber(salahRemaining)}</strong> {t('dashboard.salah_remaining_details')}
          </p>
          {salahRemaining > 0 && (
            <p className={styles.remainingProjection}>
              {salahYears <= 1
                ? t('dashboard.projection_almost_done')
                : t('dashboard.projection_detail', {
                    n: fmtNumber(dailyRate),
                    years: fmtNumber(salahYears),
                  })}
            </p>
          )}
          {perPrayerRemaining && salahRemaining > 0 && (
            <div className={styles.perPrayerRow}>
              {PRAYERS.map((name) => (
                <div key={name} className={styles.perPrayerChip}>
                  <span className={styles.perPrayerChipName}>{t(`prayers.${name}`)}</span>
                  <span className={styles.perPrayerChipCount}>
                    {fmtNumber(perPrayerRemaining[name] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
