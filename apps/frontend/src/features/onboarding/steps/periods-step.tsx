import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
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
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [startGreg, setStartGreg] = useState('');
  const [endGreg, setEndGreg] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [periodType, setPeriodType] = useState<'salah' | 'sawm' | 'both'>('both');
  const [formError, setFormError] = useState('');

  const toHijriStr = (gregValue: string): string | null => {
    if (!gregValue) return null;
    try {
      return HijriDate.fromGregorian(new Date(gregValue + 'T12:00:00')).toString();
    } catch {
      return null;
    }
  };

  const handleAddPeriod = () => {
    setFormError('');
    const startHijri = toHijriStr(startGreg);
    if (!startHijri) {
      setFormError(t('onboarding.error_invalid_date'));
      return;
    }

    // Validate: cannot be before birth
    if (dateOfBirthHijri) {
      try {
        const dob = HijriDate.fromString(dateOfBirthHijri);
        const start = HijriDate.fromString(startHijri);
        if (start.isBefore(dob)) {
          setFormError(t('onboarding.period_error_before_dob'));
          return;
        }
      } catch {
        /* ignore */
      }
    }

    let endHijri: string | undefined;
    if (!isCurrent) {
      endHijri = toHijriStr(endGreg) ?? undefined;
      if (!endHijri) {
        setFormError(t('onboarding.error_invalid_date'));
        return;
      }
      // Validate end >= start
      try {
        const start = HijriDate.fromString(startHijri);
        const end = HijriDate.fromString(endHijri);
        if (end.isBefore(start)) {
          setFormError(t('onboarding.period_error_end_before_start'));
          return;
        }
      } catch {
        /* ignore */
      }
    }

    // Overlap check
    const newStart = HijriDate.fromString(startHijri);
    for (const p of periods) {
      try {
        const pStart = HijriDate.fromString(p.startHijri);
        const pEnd = p.endHijri ? HijriDate.fromString(p.endHijri) : null;
        const newEnd = endHijri ? HijriDate.fromString(endHijri) : null;

        const pEndOrInfinity = pEnd ?? null;
        const newEndOrInfinity = newEnd ?? null;

        const startBeforeOtherEnd =
          !pEndOrInfinity || newStart.isBefore(pEndOrInfinity) || newStart.equals(pEndOrInfinity);
        const endAfterOtherStart =
          !newEndOrInfinity || newEndOrInfinity.isAfter(pStart) || newEndOrInfinity.equals(pStart);

        if (startBeforeOtherEnd && endAfterOtherStart) {
          setFormError(t('onboarding.period_error_overlap'));
          return;
        }
      } catch {
        /* skip */
      }
    }

    const newPeriod: LocalPeriod = {
      id: `${Date.now()}`,
      startHijri,
      endHijri,
      type: periodType,
    };

    onChange([...periods, newPeriod]);
    setStartGreg('');
    setEndGreg('');
    setIsCurrent(false);
    setPeriodType('both');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    onChange(periods.filter((p) => p.id !== id));
  };

  const formatHijri = (hijri: string | undefined, fallback: string) => hijri ?? fallback;

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
                  {t('onboarding.period_from')} {p.startHijri} {t('onboarding.period_to')}{' '}
                  {formatHijri(p.endHijri, t('onboarding.period_ongoing'))}
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
            <input
              type="date"
              className={styles.input}
              value={startGreg}
              onChange={(e) => setStartGreg(e.target.value)}
              aria-label={t('onboarding.period_start')}
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
              <input
                type="date"
                className={styles.input}
                value={endGreg}
                onChange={(e) => setEndGreg(e.target.value)}
                aria-label={t('onboarding.period_end')}
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
              disabled={!startGreg || (!isCurrent && !endGreg)}
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
