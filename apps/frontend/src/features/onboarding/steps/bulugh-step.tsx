import React, { useEffect, useMemo, useState } from 'react';
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
type BulughDraftState = {
  date: string;
  age: string;
  revert: string;
};

interface BulughStepProps {
  dateOfBirthHijri: string;
  bulughDateHijri: string;
  revertDateHijri?: string;
  onChange: (updates: { bulughDateHijri?: string; revertDateHijri?: string }) => void;
}

const getInitialMode = (
  bulughDateHijri: string,
  revertDateHijri: string | undefined,
  defaultBulugh: string | null,
): BulughInputMode => {
  if (revertDateHijri) {
    return 'revert';
  }

  if (!bulughDateHijri || bulughDateHijri === defaultBulugh) {
    return 'default';
  }

  return 'date';
};

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
  const currentHijriAge = useMemo(() => getCurrentHijriAge(dateOfBirthHijri), [dateOfBirthHijri]);
  const showNoTakliefWarning = currentHijriAge !== null && currentHijriAge < 12;

  const [manualMode, setManualMode] = useState<BulughInputMode | null>(null);
  const inputMode = manualMode ?? getInitialMode(bulughDateHijri, revertDateHijri, defaultBulugh);
  const [drafts, setDrafts] = useState<BulughDraftState>({
    date:
      bulughDateHijri && bulughDateHijri !== defaultBulugh && !revertDateHijri
        ? bulughDateHijri
        : '',
    age: '',
    revert: revertDateHijri ?? '',
  });
  const [ageError, setAgeError] = useState('');
  const [dateError, setDateError] = useState('');
  const [revertDateError, setRevertDateError] = useState('');

  const ageBasedBulugh = useMemo(
    () => getAgeBasedBulughDate(dateOfBirthHijri, drafts.age, { allowFuture: true }),
    [dateOfBirthHijri, drafts.age],
  );

  useEffect(() => {
    if (inputMode !== 'default' || !defaultBulugh) {
      return;
    }

    if (bulughDateHijri !== defaultBulugh || revertDateHijri) {
      onChange({ bulughDateHijri: defaultBulugh, revertDateHijri: undefined });
    }
  }, [inputMode, defaultBulugh, bulughDateHijri, revertDateHijri, onChange]);

  useEffect(() => {
    if (inputMode !== 'age') {
      return;
    }

    const nextBulughDate = ageError ? '' : (ageBasedBulugh ?? '');

    if (bulughDateHijri !== nextBulughDate || revertDateHijri) {
      onChange({ bulughDateHijri: nextBulughDate, revertDateHijri: undefined });
    }
  }, [inputMode, ageBasedBulugh, ageError, bulughDateHijri, revertDateHijri, onChange]);

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

  const effectiveBulughDate =
    inputMode === 'revert' ? bulughDateHijri || defaultBulugh : bulughDateHijri;
  const bulughEarlyWarning = useMemo(
    () => isBulughEarly(dateOfBirthHijri, effectiveBulughDate ?? undefined),
    [dateOfBirthHijri, effectiveBulughDate],
  );

  const handleAgeChange = (value: string) => {
    setDrafts((current) => ({ ...current, age: value }));

    const age = parseInt(value, 10);
    if (value && (Number.isNaN(age) || age < 1 || age > 70)) {
      setAgeError(t('onboarding.bulugh_age_error_invalid'));
      return;
    }

    setAgeError('');
  };

  const switchMode = (mode: BulughInputMode) => {
    setManualMode(mode);
    setDateError('');
    setRevertDateError('');

    if (mode === 'default') {
      onChange({ bulughDateHijri: defaultBulugh || '', revertDateHijri: undefined });
      return;
    }

    if (mode === 'date') {
      onChange({ bulughDateHijri: drafts.date || '', revertDateHijri: undefined });
      return;
    }

    if (mode === 'age') {
      onChange({
        bulughDateHijri: ageError ? '' : (ageBasedBulugh ?? ''),
        revertDateHijri: undefined,
      });
      return;
    }

    onChange({
      bulughDateHijri: bulughDateHijri || defaultBulugh || drafts.date || '',
      revertDateHijri: drafts.revert || '',
    });
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
            aria-pressed={inputMode === 'date'}
          >
            {t('onboarding.bulugh_mode_date')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'age' ? styles.selected : ''}`}
            onClick={() => switchMode('age')}
            disabled={!dateOfBirthHijri}
            aria-pressed={inputMode === 'age'}
          >
            {t('onboarding.bulugh_mode_age')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'default' ? styles.selected : ''}`}
            onClick={() => switchMode('default')}
            disabled={!defaultBulugh}
            aria-pressed={inputMode === 'default'}
          >
            {t('onboarding.bulugh_mode_default')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${inputMode === 'revert' ? styles.selected : ''}`}
            onClick={() => switchMode('revert')}
            aria-pressed={inputMode === 'revert'}
          >
            {t('onboarding.bulugh_mode_revert')}
          </button>
        </div>
      </div>

      {inputMode === 'date' && (
        <div className={styles.bulughSectionCard}>
          <div className={styles.bulughSectionHeader}>
            <label className="formLabel">{t('onboarding.bulugh_date_label')}</label>
            <p className={styles.bulughSectionHint}>{t('onboarding.bulugh_calculated_note')}</p>
          </div>
          <HijriDatePicker
            value={drafts.date}
            onChange={(value) => {
              setDateError('');
              setDrafts((current) => ({ ...current, date: value }));
              onChange({ bulughDateHijri: value, revertDateHijri: undefined });
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
        <div className={styles.bulughSectionCard}>
          {!dateOfBirthHijri ? (
            <p className="formHint">{t('onboarding.bulugh_no_dob_hint')}</p>
          ) : (
            <div className={styles.ageInputGroup}>
              <div className={styles.bulughSectionHeader}>
                <label className="formLabel">{t('onboarding.bulugh_age_label')}</label>
                <p className={styles.bulughSectionHint}>{t('onboarding.bulugh_age_gives')}</p>
              </div>
              <div className={styles.ageInputRow}>
                <input
                  type="number"
                  min={1}
                  max={70}
                  value={drafts.age}
                  onChange={(event) => handleAgeChange(event.target.value)}
                  className={styles.ageInput}
                  placeholder={fmtNumber(15)}
                  aria-label={t('onboarding.bulugh_age_label')}
                />
                <span className={styles.ageInputSuffix}>{t('onboarding.bulugh_age_suffix')}</span>
              </div>
              <div className={styles.bulughQuickActions}>
                <button
                  type="button"
                  className={styles.secondaryChipButton}
                  onClick={() => handleAgeChange('15')}
                >
                  {fmtNumber(15)} {t('onboarding.bulugh_age_suffix')}
                </button>
              </div>
              {ageError && <p className={styles.error}>{ageError}</p>}
              {ageBasedBulugh && !ageError && (
                <div className={styles.ageComputedDate}>
                  <span className={styles.calculatedDateValue}>
                    {formatHijriDisplay(ageBasedBulugh, language, t, fmtNumber)}
                  </span>
                  <span className="formHint">
                    {formatGregorianDisplay(ageBasedBulugh, language)}
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
              {formatHijriDisplay(defaultBulugh, language, t, fmtNumber)}
            </span>
            <span className={styles.calculatedDateValue}>
              {t('onboarding.bulugh_gregorian_label')}{' '}
              {formatGregorianDisplay(defaultBulugh, language)}
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
        <div className={styles.bulughSectionCard}>
          <div className={`${styles.inlineNotice} noticeBox noticeInfo`}>
            {t('onboarding.revert_explainer')}
          </div>
          <div className={styles.bulughSectionHeader}>
            <label className="formLabel">{t('onboarding.revert_date_label')}</label>
            <p className={styles.bulughSectionHint}>{t('onboarding.revert_bulugh_note')}</p>
          </div>
          <HijriDatePicker
            value={drafts.revert}
            onChange={(value) => {
              setRevertDateError('');
              setDrafts((current) => ({ ...current, revert: value }));
              onChange({
                bulughDateHijri: bulughDateHijri || defaultBulugh || drafts.date || '',
                revertDateHijri: value,
              });
            }}
            onError={setRevertDateError}
            label={t('onboarding.revert_date_label')}
            maxDate={todayHijriDate()}
          />
          {revertDateError && <p className={styles.error}>{revertDateError}</p>}
          <div className={styles.bulughRevertMeta}>
            <span className="formHint">{t('onboarding.bulugh_date_label')}</span>
            <span className={styles.revertBaseDateValue}>
              {effectiveBulughDate
                ? formatHijriDisplay(effectiveBulughDate, language, t, fmtNumber)
                : t('onboarding.bulugh_no_dob_hint')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
