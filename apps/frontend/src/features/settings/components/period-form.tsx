import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { DebtImpactPreview } from './debt-impact-preview';
import { Plus, Save } from 'lucide-react';
import type { DebtPreview } from '../types';
import styles from '../settings-page.module.css';

interface PeriodFormProps {
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  periodType: 'both' | 'salah' | 'sawm';
  startError: string;
  endError: string;
  preview: DebtPreview | null;
  isPending: boolean;
  mode: 'add' | 'edit';
  minDate?: string;

  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onOngoingChange: (checked: boolean) => void;
  onTypeChange: (type: 'both' | 'salah' | 'sawm') => void;
  onStartError: (message: string) => void;
  onEndError: (message: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const PeriodForm: React.FC<PeriodFormProps> = ({
  startDate,
  endDate,
  isOngoing,
  periodType,
  startError,
  endError,
  preview,
  isPending,
  mode,
  minDate,
  onStartChange,
  onEndChange,
  onOngoingChange,
  onTypeChange,
  onStartError,
  onEndError,
  onSubmit,
  onCancel,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.addPeriodForm}>
      <div className={styles.periodFormRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>{t('onboarding.period_start')}</label>
          <HijriDatePicker
            value={startDate}
            onChange={onStartChange}
            onError={onStartError}
            label={t('onboarding.period_start')}
            minDate={minDate}
          />
          {startError && <p className={styles.fieldError}>{startError}</p>}
        </div>

        {!isOngoing && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('onboarding.period_end')}</label>
            <HijriDatePicker
              value={endDate}
              onChange={onEndChange}
              onError={onEndError}
              label={t('onboarding.period_end')}
              minDate={startDate || minDate}
              disabled={!startDate}
            />
            {!startDate && <p className={styles.fieldHint}>{t('settings.select_start_first')}</p>}
            {endError && <p className={styles.fieldError}>{endError}</p>}
          </div>
        )}
      </div>

      <label className={styles.ongoingLabel}>
        <input
          type="checkbox"
          checked={isOngoing}
          onChange={(e) => onOngoingChange(e.target.checked)}
        />
        <span>{t('onboarding.period_current')}</span>
      </label>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>{t('onboarding.period_type_label')}</label>
        <select
          className={styles.typeSelect}
          value={periodType}
          onChange={(e) => onTypeChange(e.target.value as 'both' | 'salah' | 'sawm')}
        >
          <option value="both">{t('onboarding.period_type_both')}</option>
          <option value="salah">{t('onboarding.period_type_salah')}</option>
          <option value="sawm">{t('onboarding.period_type_sawm')}</option>
        </select>
      </div>

      {preview ? <DebtImpactPreview preview={preview} /> : null}

      <div className={styles.addPeriodActions}>
        <button type="button" className={styles.cancelAddBtn} onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={styles.confirmAddBtn}
          onClick={onSubmit}
          disabled={
            !startDate || (!isOngoing && !endDate) || !!startError || !!endError || isPending
          }
        >
          {mode === 'add' ? <Plus size={14} /> : <Save size={14} />}
          {isPending
            ? t('common.loading')
            : mode === 'add'
              ? t('settings.add_period')
              : t('settings.save_period_edit')}
        </button>
      </div>
    </div>
  );
};
