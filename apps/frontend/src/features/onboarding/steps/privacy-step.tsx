import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import styles from '../onboarding.module.css';

interface PrivacyStepProps {
  consentData: boolean;
  consentPolicy: boolean;
  onChange: (key: 'consentData' | 'consentPolicy', value: boolean) => void;
}

export const PrivacyStep: React.FC<PrivacyStepProps> = ({
  consentData,
  consentPolicy,
  onChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.step}>
      <div className={styles.privacyWelcome}>
        <div className={styles.privacyIcon}>🕌</div>
        <div className={styles.stepTitleBlock}>
          <h1 className={styles.stepTitle}>{t('onboarding.privacy_title')}</h1>
          <p className={styles.stepSubtitle}>{t('onboarding.privacy_subtitle')}</p>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('onboarding.privacy_data_title')}</span>
        <ul className={styles.privacyDataList}>
          {(
            [
              'privacy_data_dob',
              'privacy_data_bulugh',
              'privacy_data_periods',
              'privacy_data_logs',
              'privacy_data_email',
            ] as const
          ).map((key) => (
            <li key={key} className={styles.privacyDataItem}>
              {t(`onboarding.${key}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.explainer}>
        <strong>{t('onboarding.privacy_rights_title')}</strong>
        <br />
        {t('onboarding.privacy_rights_text')}
      </div>

      <div className={styles.consentBlock}>
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={consentData}
            onChange={(e) => onChange('consentData', e.target.checked)}
            aria-label={t('onboarding.privacy_consent_data')}
          />
          <span className={styles.consentText}>{t('onboarding.privacy_consent_data')}</span>
        </label>
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={consentPolicy}
            onChange={(e) => onChange('consentPolicy', e.target.checked)}
            aria-label={t('onboarding.privacy_consent_policy')}
          />
          <span className={styles.consentText}>{t('onboarding.privacy_consent_policy')}</span>
        </label>
      </div>
    </div>
  );
};
