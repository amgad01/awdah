import React, { useState } from 'react';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { useLanguage } from '@/hooks/use-language';
import {
  DEFAULT_DAILY_INTENTION,
  DAYS_PER_YEAR,
  HIJRI_MONTHS_COUNT,
  MAX_DAILY_INTENTION,
  MIN_DAILY_INTENTION,
  PRAYERS,
} from '@/lib/constants';
import { computeDebtTimeProjection, type ObservedRateData } from '@/domains/dashboard';
import { BaseDebtCard } from './base-debt-card';
import { ToggleDetails } from './components/toggle-details';
import { RateStepper } from './components/rate-stepper';
import styles from './dashboard.module.css';

interface SalahDebtCardProps {
  salahCompleted: number;
  salahRemaining: number;
  salahTotal: number;
  salahCompletionRate: number;
  perPrayerRemaining?: Record<string, number>;
  observedRateData: ObservedRateData | null;
}

export const SalahDebtCard: React.FC<SalahDebtCardProps> = ({
  salahCompleted,
  salahRemaining,
  salahTotal,
  salahCompletionRate,
  perPrayerRemaining,
  observedRateData,
}) => {
  const { t, fmtNumber } = useLanguage();
  const [dailyRate, setDailyRate] = useState(DEFAULT_DAILY_INTENTION);

  const timeProjection = computeDebtTimeProjection(
    salahRemaining,
    dailyRate,
    DAYS_PER_YEAR,
    HIJRI_MONTHS_COUNT,
  );

  return (
    <BaseDebtCard
      title={t('dashboard.salah_debt')}
      subtitle={t('dashboard.salah_debt_subtitle')}
      completed={salahCompleted}
      remaining={salahRemaining}
      total={salahTotal}
      completionRate={salahCompletionRate}
      completedLabel={t('dashboard.completed_label')}
      remainingLabel={t('dashboard.prayers_remaining')}
      progressLabel={t('dashboard.overall_progress')}
      className={styles.debtCard}
    >
      <p className={styles.encouragement}>
        <GlossaryText>{t('dashboard.encouragement_message')}</GlossaryText>
      </p>
      {salahTotal > 0 && salahRemaining > 0 && (
        <>
          <RateStepper
            value={dailyRate}
            onChange={setDailyRate}
            min={MIN_DAILY_INTENTION}
            max={MAX_DAILY_INTENTION}
            label={t('dashboard.rate_label')}
            unit={t('dashboard.rate_unit')}
            decreaseLabel={t('common.decrease_rate')}
            increaseLabel={t('common.increase_rate')}
            fmtNumber={fmtNumber}
          />
          <p className={styles.projection}>
            {observedRateData
              ? t('dashboard.projection_rate_detailed', {
                  rate: fmtNumber(observedRateData.rate),
                  qadaaCount: fmtNumber(observedRateData.qadaaCount),
                  activeDays: fmtNumber(observedRateData.activeDays),
                })
              : null}{' '}
            {timeProjection.totalDays <= DAYS_PER_YEAR
              ? t('dashboard.projection_almost_done')
              : t('dashboard.projection_at_rate_detailed', {
                  rate: fmtNumber(dailyRate),
                  years: fmtNumber(timeProjection.years),
                  months: fmtNumber(timeProjection.months),
                })}
          </p>
        </>
      )}
      <ToggleDetails>
        <p>
          <strong>{fmtNumber(salahRemaining)}</strong> {t('dashboard.salah_remaining_details')}
        </p>
        {salahRemaining > 0 && (
          <p className={styles.remainingProjection}>
            {timeProjection.years <= 1
              ? t('dashboard.projection_almost_done')
              : t('dashboard.projection_detail', {
                  n: fmtNumber(dailyRate),
                  years: fmtNumber(timeProjection.years),
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
      </ToggleDetails>
    </BaseDebtCard>
  );
};
