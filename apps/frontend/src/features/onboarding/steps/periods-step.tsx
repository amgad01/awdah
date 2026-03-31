import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { formatGregorianDisplay, formatHijriDisplay } from '@/lib/profile-date-utils';
import { getPracticingPeriodValidationError } from '@/lib/practicing-periods';
import { todayHijriDate } from '@/utils/date-utils';
import { Plus, Trash2 } from 'lucide-react';
import styles from '../onboarding.module.css';

export interface LocalPeriod {
  id: string;
  startHijri: string;
  endHijri?: string;
  type: 'salah' | 'sawm' | 'both';
}

interface PeriodsStepProps {
  dateOfBirthHijri?: string;
  periods: LocalPeriod[];
  onChange: (periods: LocalPeriod[]) => void;
}

export const PeriodsStep: React.FC<PeriodsStepProps> = ({
  dateOfBirthHijri,
  periods,
  onChange,
}) => {
  const { t, language, fmtNumber } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [startHijri, setStartHijri] = useState('');
  const [endHijri, setEndHijri] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [periodType, setPeriodType] = useState<'salah' | 'sawm' | 'both'>('both');
  const [formError, setFormError] = useState('');

  const handleAddPeriod = () => {
    setFormError('');
    const nextEndHijri = isCurrent ? undefined : endHijri || undefined;
    const validationError = getPracticingPeriodValidationError({
      startDate: startHijri,
      endDate: nextEndHijri,
      dateOfBirth: dateOfBirthHijri,
      existingPeriods: periods,
    });
    if (validationError) {
      setFormError(t(validationError.messageKey));
      return;
    }

    const newPeriod: LocalPeriod = {
      id: `${Date.now()}`,
      startHijri,
      endHijri: nextEndHijri,
      type: periodType,
    };

    onChange([...periods, newPeriod]);
    setStartHijri('');
    setEndHijri('');
    setIsCurrent(false);
    setPeriodType('both');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    onChange(periods.filter((p) => p.id !== id));
  };

  return (
    <div className={styles.step}>
      <div className={styles.stepTitleBlock}>
        <h1 className={styles.stepTitle}>{t('onboarding.periods_title')}</h1>
        <p className={styles.stepSubtitle}>{t('onboarding.periods_subtitle')}</p>
      </div>

      <div className={styles.explainer}>{t('onboarding.periods_explainer')}</div>

      {/* Period list */}
      {periods.length === 0 && !showForm ? (
        <div className={styles.emptyPeriods}>
          <p>{t('onboarding.periods_empty')}</p>
          <p className={styles.emptyPeriodsHint}>{t('onboarding.periods_empty_hint')}</p>
        </div>
      ) : (
        <div className={styles.periodList}>
          {periods.map((p) => (
            <div key={p.id} className={styles.periodItem}>
              <div className={styles.periodItemDates}>
                <span className={styles.periodDatesText}>
                  {t('onboarding.period_from')}{' '}
                  {formatHijriDisplay(p.startHijri, language, t, fmtNumber)}{' '}
                  {t('onboarding.period_to')}{' '}
                  {p.endHijri
                    ? formatHijriDisplay(p.endHijri, language, t, fmtNumber)
                    : t('onboarding.period_ongoing')}
                </span>
                <span className={styles.periodDatesText}>
                  {formatGregorianDisplay(p.startHijri, language)} {t('onboarding.period_to')}{' '}
                  {p.endHijri
                    ? formatGregorianDisplay(p.endHijri, language)
                    : t('onboarding.period_ongoing')}
                </span>
                <span className={styles.periodTypeTag}>
                  {t(`onboarding.period_type_${p.type}`)}
                </span>
              </div>
              <button
                type="button"
                className={styles.deletePeriodBtn}
                onClick={() => handleDelete(p.id)}
                aria-label={t('onboarding.period_delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      {showForm ? (
        <div className={styles.periodForm}>
          <p className={styles.periodFormTitle}>{t('onboarding.periods_add_btn')}</p>

          <div className={styles.field}>
            <label className={styles.label}>{t('onboarding.period_start')}</label>
            <HijriDatePicker
              value={startHijri}
              onChange={(value) => {
                setFormError('');
                setStartHijri(value);
              }}
              onError={(msg) => setFormError(msg ?? '')}
              label={t('onboarding.period_start')}
              minDate={dateOfBirthHijri}
              maxDate={todayHijriDate()}
            />
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
            />
            <span className={styles.checkLabel}>{t('onboarding.period_current')}</span>
          </label>

          {!isCurrent && (
            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.period_end')}</label>
              <HijriDatePicker
                value={endHijri}
                onChange={(value) => {
                  setFormError('');
                  setEndHijri(value);
                }}
                onError={(msg) => setFormError(msg ?? '')}
                label={t('onboarding.period_end')}
                minDate={startHijri || dateOfBirthHijri}
                maxDate={todayHijriDate()}
                disabled={!startHijri}
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>{t('onboarding.period_type_label')}</label>
            <select
              className={styles.select}
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'salah' | 'sawm' | 'both')}
            >
              <option value="both">{t('onboarding.period_type_both')}</option>
              <option value="salah">{t('onboarding.period_type_salah')}</option>
              <option value="sawm">{t('onboarding.period_type_sawm')}</option>
            </select>
          </div>

          {formError && <p className={styles.error}>⚠ {formError}</p>}

          <div className={styles.periodFormBtns}>
            <button
              type="button"
              className={styles.periodSaveBtn}
              onClick={handleAddPeriod}
              disabled={!startHijri || (!isCurrent && !endHijri)}
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              className={styles.periodCancelBtn}
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.addPeriodBtn}
          onClick={() => setShowForm(true)}
          aria-label={t('onboarding.periods_add_btn')}
        >
          <Plus size={16} />
          {t('onboarding.periods_add_btn')}
        </button>
      )}
    </div>
  );
};
