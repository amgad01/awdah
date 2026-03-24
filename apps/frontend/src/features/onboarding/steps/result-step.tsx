import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { DAYS_PER_YEAR } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import styles from '../onboarding.module.css';

interface ResultStepProps {
  salahDebt: number | null;
  sawmDebt: number | null;
  dailyIntention: number;
  isLoading: boolean;
  hasError: boolean;
  onBegin: () => void;
}

export const ResultStep: React.FC<ResultStepProps> = ({
  salahDebt,
  sawmDebt,
  dailyIntention,
  isLoading,
  hasError,
  onBegin,
}) => {
  const { t, fmtNumber } = useLanguage();

  if (isLoading) {
    return (
      <div className={styles.savingOverlay}>
        <Loader2 size={36} className="animate-spin" color="var(--color-primary)" />
        <p className={styles.savingText}>{t('onboarding.result_loading')}</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={styles.resultStep}>
        <p className={styles.stepSubtitle}>{t('onboarding.result_error')}</p>
        <button className={styles.beginBtn} onClick={onBegin}>
          {t('onboarding.result_begin')}
        </button>
      </div>
    );
  }

  const isZeroDebt = salahDebt === 0 && sawmDebt === 0;

  const yearsToComplete =
    salahDebt && salahDebt > 0 && dailyIntention > 0
      ? (salahDebt / dailyIntention / DAYS_PER_YEAR).toFixed(1)
      : null;

  return (
    <div className={styles.resultStep}>
      <div className={styles.resultEmoji}>{isZeroDebt ? '🌿' : '✨'}</div>

      <div className={styles.resultTitles}>
        <h1 className={styles.resultTitle}>
          {isZeroDebt ? t('onboarding.result_zero_title') : t('onboarding.result_title')}
        </h1>
        <p className={styles.resultArabicSubtitle}>
          {isZeroDebt ? t('onboarding.result_zero_subtitle') : t('onboarding.result_subtitle')}
        </p>
      </div>

      {isZeroDebt ? (
        <div className={styles.zeroDebtCard}>
          <p className={styles.zeroDebtTitle}>{t('onboarding.result_zero_debt')}</p>
          <p className={styles.zeroDebtHint}>{t('onboarding.result_zero_hint')}</p>
          <p className={styles.resultEncouragement}>{t('onboarding.result_zero_continue')}</p>
        </div>
      ) : (
        <>
          <div className={styles.resultContext}>
            <p className={styles.resultContextEyebrow}>{t('onboarding.result_estimate_label')}</p>
            <p className={styles.resultContextBody}>{t('onboarding.result_estimate_note')}</p>
          </div>

          <div className={styles.debtCards}>
            <div className={styles.debtCard}>
              <span className={styles.debtCardValue}>{fmtNumber(salahDebt ?? 0)}</span>
              <span className={styles.debtCardLabel}>{t('onboarding.result_salah_debt')}</span>
            </div>
            <div className={styles.debtCard}>
              <span className={styles.debtCardValue}>{fmtNumber(sawmDebt ?? 0)}</span>
              <span className={styles.debtCardLabel}>{t('onboarding.result_sawm_debt')}</span>
            </div>
          </div>

          <p className={styles.resultEncouragement}>{t('onboarding.result_encouragement')}</p>
          <p className={styles.resultScholarNote}>{t('onboarding.result_scholar_note')}</p>

          {yearsToComplete && (
            <div className={styles.resultProjection}>
              {t('onboarding.result_projection', {
                n: fmtNumber(dailyIntention),
                years: yearsToComplete,
              })}
            </div>
          )}
        </>
      )}

      <button
        className={styles.beginBtn}
        onClick={onBegin}
        aria-label={t('onboarding.result_begin')}
      >
        {t('onboarding.result_begin')}
      </button>
    </div>
  );
};
