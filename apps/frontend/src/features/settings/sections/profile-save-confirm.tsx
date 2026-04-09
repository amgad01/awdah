import React from 'react';
import { Save } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import styles from '../settings-page.module.css';
import type { DebtPreview } from '../types';

interface ProfileSaveConfirmProps {
  preview: DebtPreview | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  describeDebtPreview: (preview: DebtPreview) => string;
}

export const ProfileSaveConfirm: React.FC<ProfileSaveConfirmProps> = ({
  preview,
  isPending,
  onCancel,
  onConfirm,
  describeDebtPreview,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.inlineConfirm} role="alert">
      <p className={styles.inlineConfirmMsg}>{t('settings.confirm_profile_change_body')}</p>
      {preview ? (
        <p className={styles.inlineConfirmPreview}>{describeDebtPreview(preview)}</p>
      ) : null}
      <div className={styles.inlineConfirmActions}>
        <button type="button" className={styles.cancelAddBtn} onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={styles.saveProfileBtn}
          onClick={onConfirm}
          disabled={isPending}
        >
          <Save size={14} />
          {isPending ? t('settings.saving_profile') : t('common.confirm')}
        </button>
      </div>
    </div>
  );
};
