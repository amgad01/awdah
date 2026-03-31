import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import {
  formatGregorianDisplay,
  formatHijriDisplay,
  getAgeBasedBulughDate,
  getCurrentHijriAge,
  getDefaultBulughDate,
  isBulughEarly,
} from '@/lib/profile-date-utils';
import { todayHijriDate } from '@/utils/date-utils';
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
  const { t, fmtNumber, language } = useLanguage();
  const defaultBulugh = useMemo(
    () => getDefaultBulughDate(dateOfBirthHijri, { allowFuture: true }),
    [dateOfBirthHijri],
  );
  const [inputMode, setInputMode] = useState<BulughInputMode>(
    revertDateHijri
      ? 'revert'
      : bulughDateHijri && bulughDateHijri !== defaultBulugh
        ? 'date'
        : 'default',
  );
  const [ageInput, setAgeInput] = useState('');
  const [ageError, setAgeError] = useState('');
  const [dateError, setDateError] = useState('');
  const [revertDateError, setRevertDateError] = useState('');

  const ageBasedBulugh = useMemo(
    () => getAgeBasedBulughDate(dateOfBirthHijri, ageInput, { allowFuture: true }),
    [dateOfBirthHijri, ageInput],
  );
  const currentHijriAge = useMemo(() => getCurrentHijriAge(dateOfBirthHijri), [dateOfBirthHijri]);
  const showNoTakliefWarning = currentHijriAge !== null && currentHijriAge < 12;

  useEffect(() => {
    if (inputMode === 'default' && defaultBulugh) {
      onChange({ bulughDateHijri: defaultBulugh });
    }
  }, [inputMode, defaultBulugh, onChange]);

  useEffect(() => {
    if (inputMode !== 'age') return;
    onChange({ bulughDateHijri: ageBasedBulugh ?? '' });
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

  const bulughEarlyWarning = useMemo(
    () => isBulughEarly(dateOfBirthHijri, bulughDateHijri),
    [dateOfBirthHijri, bulughDateHijri],
  );

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

      <div className="noticeBox noticeWarning">{t('onboarding.bulugh_explainer')}</div>

      {showNoTakliefWarning && (
        <div className="noticeBox noticeInfo">{t('onboarding.bulugh_no_taklief')}</div>
      )}

      <div className="formGroup">
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
        <div className="formGroup">
          <label className="formLabel">{t('onboarding.bulugh_date_label')}</label>
          <HijriDatePicker
            value={bulughDateHijri}
            onChange={(v) => {
              setDateError('');
              onChange({ bulughDateHijri: v });
            }}
            onError={setDateError}
            label={t('onboarding.bulugh_date_label')}
            validate={validateBulugh}
            maxDate={todayHijriDate()}
          />
          {dateError && <p className={styles.error}>{dateError}</p>}
          {bulughEarlyWarning && !dateError && (
            <p className="formHint">{t('settings.bulugh_early_warning')}</p>
          )}
        </div>
      )}

      {inputMode === 'age' && (
        <div className="formGroup">
          {!dateOfBirthHijri ? (
            <p className="formHint">{t('onboarding.bulugh_no_dob_hint')}</p>
          ) : (
            <div className={styles.ageInputGroup}>
              <label className="formLabel">{t('onboarding.bulugh_age_label')}</label>
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
                  <span className="formHint">{t('onboarding.bulugh_age_gives')}</span>
                  <span className={styles.calculatedDateValue}>
                    {formatHijriDisplay(ageBasedBulugh || '', language, t, fmtNumber)}
                  </span>
                </div>
              )}
              {bulughEarlyWarning && !ageError && (
                <p className="formHint">{t('settings.bulugh_early_warning')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {inputMode === 'default' &&
        (defaultBulugh ? (
          <div className={`${styles.calculatedDate} sectionCard`}>
            <p className="formHint">{t('onboarding.bulugh_calculated_note')}</p>
            <span className={styles.calculatedDateValue}>
              {t('onboarding.bulugh_hijri_label')}{' '}
              {formatHijriDisplay(defaultBulugh || '', language, t, fmtNumber)}
            </span>
            <span className={styles.calculatedDateValue}>
              {t('onboarding.bulugh_gregorian_label')}{' '}
              {formatGregorianDisplay(defaultBulugh || '', language)}
            </span>
            <p className={styles.calculatedDateNote}>
              {t('onboarding.bulugh_default_explanation')}
            </p>
            <p className={styles.hadithNote}>{t('onboarding.bulugh_hadith_note')}</p>
          </div>
        ) : (
          <p className="formHint">{t('onboarding.bulugh_no_dob_hint')}</p>
        ))}

      {inputMode === 'revert' && (
        <div className="formGroup">
          <div className="noticeBox noticeInfo" style={{ marginBottom: 'var(--spacing-md)' }}>
            {t('onboarding.revert_explainer')}
          </div>
          <label className="formLabel">{t('onboarding.revert_date_label')}</label>
          <HijriDatePicker
            value={revertDateHijri ?? ''}
            onChange={(v) => {
              setRevertDateError('');
              onChange({
                bulughDateHijri: bulughDateHijri || defaultBulugh || v,
                revertDateHijri: v,
              });
            }}
            onError={setRevertDateError}
            label={t('onboarding.revert_date_label')}
            maxDate={todayHijriDate()}
          />
          {revertDateError && <p className={styles.error}>{revertDateError}</p>}
          <p className="formHint">{t('onboarding.revert_bulugh_note')}</p>
        </div>
      )}
    </div>
  );
};
