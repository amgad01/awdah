import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteAccount } from '@/hooks/use-profile';
import { Trash2 } from 'lucide-react';
import { SettingsSection } from '../components';
import styles from '../settings-page.module.css';

export const DangerZoneSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, signIn, signOut } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useDeleteAccount();

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const email = user?.email || user?.username || '';
      await signIn(email, deletePassword);
      const result = await deleteAccount.mutateAsync();
      if (result && !result.authDeleted) {
        window.alert(t('settings.delete_partial_cleanup_notice'));
      }
      await signOut();
    } catch (err: unknown) {
      setIsDeleting(false);
      setDeleteError(err instanceof Error ? err.message : t('settings.delete_error'));
    }
  };

  return (
    <SettingsSection icon={<Trash2 size={18} />} title={t('settings.danger_zone')} variant="danger">
      <p className={styles.privacyText}>{t('settings.delete_account_hint')}</p>

      {!showDeleteConfirm ? (
        <button
          className={styles.deleteBtn}
          onClick={() => setShowDeleteConfirm(true)}
          aria-label={t('settings.delete_account')}
        >
          <Trash2 size={16} />
          {t('settings.delete_account')}
        </button>
      ) : (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteConfirmText}>{t('settings.delete_confirm_text')}</p>
          <input
            type="password"
            className={styles.deletePasswordInput}
            placeholder={t('settings.delete_confirm_password')}
            value={deletePassword}
            onChange={(e) => {
              setDeletePassword(e.target.value);
              setDeleteError('');
            }}
            aria-label={t('settings.delete_confirm_password')}
          />
          {deleteError && (
            <p className={styles.deleteErrorText} role="alert">
              {deleteError}
            </p>
          )}
          <div className={styles.deleteConfirmBtns}>
            <button
              className={styles.deleteConfirmBtn}
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword}
              aria-label={t('settings.delete_confirm_btn')}
            >
              {isDeleting ? t('settings.deleting') : t('settings.delete_confirm_btn')}
            </button>
            <button
              className={styles.deleteCancelBtn}
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletePassword('');
                setDeleteError('');
              }}
              aria-label={t('settings.delete_cancel')}
            >
              {t('settings.delete_cancel')}
            </button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
};
