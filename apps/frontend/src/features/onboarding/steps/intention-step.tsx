import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { MIN_DAILY_INTENTION, MAX_DAILY_INTENTION, DAYS_PER_YEAR } from '@/lib/constants';
import styles from '../onboarding.module.css';

interface IntentionStepProps {
  dailyIntention: number;
  salahDebt: number;
  onChange: (dailyIntention: number) => void;
}

export const IntentionStep: React.FC<IntentionStepProps> = ({
  dailyIntention,
  salahDebt,
  onChange,
}) => {
  const { t, fmtNumber } = useLanguage();

  const yearsToComplete =
    salahDebt > 0 && dailyIntention > 0
      ? (salahDebt / dailyIntention / DAYS_PER_YEAR).toFixed(1)
      : null;

  return (
    <div className={styles.step}>
      <div className={styles.stepTitleBlock}>
        <h1 className={styles.stepTitle}>{t('onboarding.intention_title')}</h1>
        <p className={styles.stepSubtitle}>
          <GlossaryText>{t('onboarding.intention_subtitle')}</GlossaryText>
        </p>
      </div>

      <div className="noticeBox noticeInfo">
        <GlossaryText>{t('onboarding.intention_explainer')}</GlossaryText>
      </div>

      <div className="formGroup">
        <label className="formLabel" htmlFor="intention-input">
          {t('onboarding.intention_label')}
        </label>
        <div className={styles.intentionValue}>{fmtNumber(dailyIntention)}</div>
        <input
          id="intention-input"
          type="range"
          className={styles.intentionSlider}
          min={MIN_DAILY_INTENTION}
          max={MAX_DAILY_INTENTION}
          value={dailyIntention}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-valuemin={MIN_DAILY_INTENTION}
          aria-valuemax={MAX_DAILY_INTENTION}
          aria-valuenow={dailyIntention}
          aria-label={t('onboarding.intention_label')}
        />
        <p className={styles.intentionUnit}>{t('onboarding.prayers_per_day_unit')}</p>
      </div>

      {yearsToComplete !== null && salahDebt > 0 && (
        <div className={styles.projectionPreview}>
          <GlossaryText>
            {t('onboarding.projection_preview', {
              n: fmtNumber(dailyIntention),
              years: yearsToComplete,
            })}
          </GlossaryText>
        </div>
      )}

      <p className={styles.scholarNote}>
        <GlossaryText>{t('onboarding.intention_scholar_note')}</GlossaryText>
      </p>
    </div>
  );
};
