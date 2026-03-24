import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { BULUGH_DEFAULT_HIJRI_YEARS } from '@/lib/constants';
import styles from '../onboarding.module.css';

type BulughInputMode = 'date' | 'age' | 'default' | 'revert';

interface BulughStepProps {
  dateOfBirthHijri: string;
  bulughDateHijri: string;
  revertDateHijri?: string;
  onChange: (updates: { bulughDateHijri?: string; revertDateHijri?: string }) => void;
}

export const BulughStep: React.FC<BulughStepProps> = ({
  dateOfBirthHijri,
  bulughDateHijri,
  revertDateHijri,
  onChange,
}) => {
  const { t, fmtNumber } = useLanguage();
  const [inputMode, setInputMode] = useState<BulughInputMode>(
    revertDateHijri ? 'revert' : bulughDateHijri ? 'date' : 'default',
  );
  const [ageInput, setAgeInput] = useState('');
  const [ageError, setAgeError] = useState('');
  const [dateError, setDateError] = useState('');
  const [revertDateError, setRevertDateError] = useState('');

  const defaultBulugh = useMemo<HijriDate | null>(() => {
    if (!dateOfBirthHijri) return null;
    try {
      const dob = HijriDate.fromString(dateOfBirthHijri);
      return new HijriDate(dob.year + BULUGH_DEFAULT_HIJRI_YEARS, dob.month, dob.day);
    } catch {
      return null;
    }
  }, [dateOfBirthHijri]);

  const ageBasedBulugh = useMemo<HijriDate | null>(() => {
    if (!dateOfBirthHijri || !ageInput) return null;
    const age = parseInt(ageInput, 10);
    if (isNaN(age) || age < 1 || age > 70) return null;
    try {
      const dob = HijriDate.fromString(dateOfBirthHijri);
      return new HijriDate(dob.year + age, dob.month, dob.day);
    } catch {
      return null;
    }
  }, [dateOfBirthHijri, ageInput]);

  useEffect(() => {
    if (inputMode === 'default' && defaultBulugh) {
      onChange({ bulughDateHijri: defaultBulugh.toString() });
    }
  }, [inputMode, defaultBulugh, onChange]);

  useEffect(() => {
    if (inputMode !== 'age') return;
    onChange({ bulughDateHijri: ageBasedBulugh ? ageBasedBulugh.toString() : '' });
  }, [inputMode, ageBasedBulugh, onChange]);

  const validateBulugh = (date: HijriDate): string | null => {
    if (dateOfBirthHijri) {
      try {
        const dob = HijriDate.fromString(dateOfBirthHijri);
        if (date.isBefore(dob)) {
          return t('onboarding.bulugh_error_before_dob');
        }
      } catch {
        // DOB is invalid — skip validation
      }
    }
    return null;
  };

  const handleAgeChange = (val: string) => {
    setAgeInput(val);
    const age = parseInt(val, 10);
    if (val && (isNaN(age) || age < 1 || age > 70)) {
      setAgeError(t('onboarding.bulugh_age_error_invalid'));
    } else {
      setAgeError('');
    }
  };

  const switchMode = (mode: BulughInputMode) => {
    setInputMode(mode);
    if (mode !== 'age') {
      setAgeInput('');
      setAgeError('');
    }
    if (mode !== 'revert') {
      setRevertDateError('');
      onChange({ revertDateHijri: undefined });
    }
  };

  return (
    <div className={styles.step}>
      <div className={styles.stepTitleBlock}>
        <h1 className={styles.stepTitle}>
          <TermTooltip termId="bulugh">{t('onboarding.bulugh_title')}</TermTooltip>
        </h1>
        <p className={styles.stepSubtitle}>{t('onboarding.bulugh_subtitle')}</p>
      </div>

      <div className={styles.explainer}>{t('onboarding.bulugh_explainer')}</div>

      <div className={styles.field}>
        <div className={styles.bulughToggle}>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'date' ? styles.selected : ''}`}
            onClick={() => switchMode('date')}
          >
            {t('onboarding.bulugh_mode_date')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'age' ? styles.selected : ''}`}
            onClick={() => switchMode('age')}
            disabled={!dateOfBirthHijri}
          >
            {t('onboarding.bulugh_mode_age')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'default' ? styles.selected : ''}`}
            onClick={() => switchMode('default')}
            disabled={!defaultBulugh}
          >
            {t('onboarding.bulugh_mode_default')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'revert' ? styles.selected : ''}`}
            onClick={() => switchMode('revert')}
          >
            {t('onboarding.bulugh_mode_revert')}
          </button>
        </div>
      </div>

      {inputMode === 'date' && (
        <div className={styles.field}>
          <label className={styles.label}>{t('onboarding.bulugh_date_label')}</label>
          <HijriDatePicker
            value={bulughDateHijri}
            onChange={(v) => onChange({ bulughDateHijri: v })}
            onError={setDateError}
            label={t('onboarding.bulugh_date_label')}
            validate={validateBulugh}
          />
          {dateError && <p className={styles.error}>{dateError}</p>}
        </div>
      )}

      {inputMode === 'age' && (
        <div className={styles.field}>
          {!dateOfBirthHijri ? (
            <p className={styles.hint}>{t('onboarding.bulugh_no_dob_hint')}</p>
          ) : (
            <div className={styles.ageInputGroup}>
              <label className={styles.label}>{t('onboarding.bulugh_age_label')}</label>
              <div className={styles.ageInputRow}>
                <input
                  type="number"
                  min={1}
                  max={70}
                  value={ageInput}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  className={styles.ageInput}
                  placeholder={fmtNumber(15)}
                  aria-label={t('onboarding.bulugh_age_label')}
                />
                <span className={styles.ageInputSuffix}>{t('onboarding.bulugh_age_suffix')}</span>
              </div>
              {ageError && <p className={styles.error}>{ageError}</p>}
              {ageBasedBulugh && !ageError && (
                <div className={styles.ageComputedDate}>
                  <span className={styles.hint}>{t('onboarding.bulugh_age_gives')}</span>
                  <span className={styles.calculatedDateValue}>{ageBasedBulugh.toString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {inputMode === 'default' &&
        (defaultBulugh ? (
          <div className={styles.calculatedDate}>
            <p className={styles.hint}>{t('onboarding.bulugh_calculated_note')}</p>
            <span className={styles.calculatedDateValue}>{defaultBulugh.toString()}</span>
            <p className={styles.calculatedDateNote}>
              {t('onboarding.bulugh_default_explanation')}
            </p>
            <p className={styles.hadithNote}>{t('onboarding.bulugh_hadith_note')}</p>
          </div>
        ) : (
          <p className={styles.hint}>{t('onboarding.bulugh_no_dob_hint')}</p>
        ))}

      {inputMode === 'revert' && (
        <div className={styles.field}>
          <div className={styles.explainer}>{t('onboarding.revert_explainer')}</div>
          <label className={styles.label}>{t('onboarding.revert_date_label')}</label>
          <HijriDatePicker
            value={revertDateHijri ?? ''}
            onChange={(v) => {
              onChange({ revertDateHijri: v });
              // Set bulugh date to the default if available, otherwise keep existing
              if (!bulughDateHijri && defaultBulugh) {
                onChange({ bulughDateHijri: defaultBulugh.toString(), revertDateHijri: v });
              } else {
                onChange({ revertDateHijri: v });
              }
            }}
            onError={setRevertDateError}
            label={t('onboarding.revert_date_label')}
          />
          {revertDateError && <p className={styles.error}>{revertDateError}</p>}
          <p className={styles.hint}>{t('onboarding.revert_bulugh_note')}</p>
        </div>
      )}
    </div>
  );
};
