import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { todayHijriDate } from '@/utils/date-utils';
import styles from '../onboarding.module.css';

interface ProfileStepProps {
  dateOfBirthHijri: string;
  gender: 'male' | 'female' | '';
  username: string;
  onChange: (updates: {
    dateOfBirthHijri?: string;
    gender?: 'male' | 'female';
    username?: string;
  }) => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({
  dateOfBirthHijri,
  gender,
  username,
  onChange,
}) => {
  const { t } = useLanguage();
  const [error, setError] = React.useState('');

  return (
    <div className={styles.step}>
      <div className={styles.stepTitleBlock}>
        <h1 className={styles.stepTitle}>{t('onboarding.profile_title')}</h1>
        <p className={styles.stepSubtitle}>{t('onboarding.profile_subtitle')}</p>
      </div>

      {/* Username — optional */}
      <div className="formGroup">
        <label className="formLabel">{t('settings.username_label')}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => onChange({ username: e.target.value })}
          className={styles.textInput}
          placeholder={t('settings.username_placeholder')}
          maxLength={40}
        />
        <p className="formHint">{t('settings.username_hint')}</p>
      </div>

      {/* Date of birth — optional */}
      <div className="formGroup">
        <label className="formLabel">{t('onboarding.dob_label')}</label>
        <p className="formHint">{t('onboarding.dob_skip_hint')}</p>
        <HijriDatePicker
          value={dateOfBirthHijri}
          onChange={(v) => {
            setError('');
            onChange({ dateOfBirthHijri: v });
          }}
          onError={setError}
          label={t('onboarding.dob_label')}
          maxDate={todayHijriDate()}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* Gender */}
      <div className="formGroup">
        <span className="formLabel">{t('onboarding.gender_label')}</span>
        <p className="formHint">{t('onboarding.gender_hint')}</p>
        <div className={styles.radioGroup}>
          {(['male', 'female'] as const).map((g) => (
            <label key={g} className={`${styles.radioCard} ${gender === g ? styles.selected : ''}`}>
              <input
                type="radio"
                name="gender"
                value={g}
                checked={gender === g}
                onChange={() => onChange({ gender: g })}
              />
              <span className={styles.radioLabel}>
                {g === 'male' ? t('onboarding.gender_male') : t('onboarding.gender_female')}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
