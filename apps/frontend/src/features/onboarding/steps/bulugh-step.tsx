import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { BULUGH_DEFAULT_HIJRI_YEARS } from '@/lib/constants';
import styles from '../onboarding.module.css';

interface BulughStepProps {
  dateOfBirthHijri: string;
  bulughDateHijri: string;
  onChange: (updates: { bulughDateHijri: string }) => void;
}

export const BulughStep: React.FC<BulughStepProps> = ({
  dateOfBirthHijri,
  bulughDateHijri,
  onChange,
}) => {
  const { t } = useLanguage();
  const [knowsBulugh, setKnowsBulugh] = useState<boolean>(!!bulughDateHijri);
  const [error, setError] = useState('');

  const defaultBulugh = useMemo<HijriDate | null>(() => {
    if (!dateOfBirthHijri) return null;
    try {
      const dob = HijriDate.fromString(dateOfBirthHijri);
      return new HijriDate(dob.year + BULUGH_DEFAULT_HIJRI_YEARS, dob.month, dob.day);
    } catch {
      return null;
    }
  }, [dateOfBirthHijri]);

  useEffect(() => {
    if (!knowsBulugh && defaultBulugh) {
      onChange({ bulughDateHijri: defaultBulugh.toString() });
    }
  }, [knowsBulugh, defaultBulugh, onChange]);

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

  return (
    <div className={styles.step}>
      <div className={styles.stepTitleBlock}>
        <h1 className={styles.stepTitle}>{t('onboarding.bulugh_title')}</h1>
        <p className={styles.stepSubtitle}>{t('onboarding.bulugh_subtitle')}</p>
      </div>

      <div className={styles.explainer}>{t('onboarding.bulugh_explainer')}</div>

      <div className={styles.field}>
        <div className={styles.bulughToggle}>
          <button
            type="button"
            className={`${styles.toggleOption} ${knowsBulugh ? styles.selected : ''}`}
            onClick={() => setKnowsBulugh(true)}
          >
            {t('onboarding.bulugh_know')}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${!knowsBulugh ? styles.selected : ''}`}
            onClick={() => setKnowsBulugh(false)}
            disabled={!defaultBulugh}
          >
            {t('onboarding.bulugh_not_sure')}
          </button>
        </div>
      </div>

      {knowsBulugh ? (
        <div className={styles.field}>
          <label className={styles.label}>{t('onboarding.bulugh_date_label')}</label>
          <HijriDatePicker
            value={bulughDateHijri}
            onChange={(v) => onChange({ bulughDateHijri: v })}
            onError={setError}
            label={t('onboarding.bulugh_date_label')}
            validate={validateBulugh}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>
      ) : (
        defaultBulugh && (
          <div className={styles.calculatedDate}>
            <p className={styles.hint}>{t('onboarding.bulugh_calculated_note')}</p>
            <span className={styles.calculatedDateValue}>{defaultBulugh.toString()}</span>
            <p className={styles.calculatedDateNote}>
              {t('onboarding.bulugh_default_explanation')}
            </p>
          </div>
        )
      )}

      {!defaultBulugh && !knowsBulugh && (
        <p className={styles.hint}>{t('onboarding.bulugh_no_dob_hint')}</p>
      )}
    </div>
  );
};
