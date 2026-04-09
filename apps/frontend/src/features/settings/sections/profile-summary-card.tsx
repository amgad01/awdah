import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { DualDateLabel } from '@/components/ui/dual-date-label/dual-date-label';
import styles from '../settings-page.module.css';

interface ProfileSummaryCardProps {
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  bulughDate?: string;
  revertDate?: string;
  onEdit: () => void;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  gender,
  dateOfBirth,
  bulughDate,
  revertDate,
  onEdit,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.periodsList}>
      <div className={styles.periodRow}>
        <div className={styles.periodInfo}>
          <div className={styles.periodRowTitle}>
            <span className={styles.periodDates}>{t('settings.profile_section')}</span>
            <span className={styles.periodDatesSecondary}>
              {gender
                ? `${t('settings.gender')}: ${gender === 'male' ? t('onboarding.gender_male') : t('onboarding.gender_female')}`
                : t('settings.gender')}
            </span>
          </div>
          <div className={styles.profileSummaryStack}>
            {dateOfBirth ? (
              <span className={styles.periodType}>
                {t('settings.dob')}: <DualDateLabel date={dateOfBirth} layout="inline" />
              </span>
            ) : null}
            {bulughDate ? (
              <span className={styles.periodType}>
                {t('settings.bulugh_date')}: <DualDateLabel date={bulughDate} layout="inline" />
              </span>
            ) : null}
            {revertDate ? (
              <span className={styles.periodType}>
                {t('settings.revert_date')}: <DualDateLabel date={revertDate} layout="inline" />
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.periodActions}>
          <button type="button" className={styles.profileExpandBtn} onClick={onEdit}>
            {t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  );
};
