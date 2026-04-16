import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteAccount } from '@/hooks/use-profile';
import { getAuthErrorKey } from '@/lib/auth-errors';
import { deleteLocalUser } from '@/lib/local-auth.service';
import { clearOnboardingLocalState } from '@/lib/onboarding-state';
import { Trash2 } from 'lucide-react';
import { SettingsSection } from '../components';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '../helpers';
import styles from '../settings-page.module.css';

export const DangerZoneSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, verifyPassword, signOut } = useAuth();
  const { toast } = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useDeleteAccount();
  const accountIdentifier = user?.email || user?.username || '';

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);

    try {
      await verifyPassword(accountIdentifier, deletePassword);
    } catch (error) {
      setDeleteError(t(getAuthErrorKey(error, 'settings.delete_error')));
      setIsDeleting(false);
      return;
    }

    try {
      const result = await deleteAccount.mutateAsync();
      clearOnboardingLocalState(user?.userId);

      if (import.meta.env.VITE_AUTH_MODE === 'local' && accountIdentifier) {
        deleteLocalUser(accountIdentifier);
      } else if (result && !result.authDeleted) {
        toast.info(t('settings.delete_partial_cleanup_notice'), 10000);
      }

      setShowDeleteConfirm(false);
      setDeletePassword('');
      await signOut();
    } catch (error: unknown) {
      setIsDeleting(false);
      setDeleteError(t(getErrorMessage(error, 'common.account_deletion_failed')));
    }
  };

  return (
    <SettingsSection icon={<Trash2 size={18} />} title={t('settings.danger_zone')} variant="danger">
      <div className={styles.dangerZoneActions}>
        <p className={styles.privacyText}>{t('settings.delete_account_hint')}</p>
        <p className={styles.workflowNote}>{t('settings.delete_account_flow_hint')}</p>

        {!showDeleteConfirm ? (
          <button
            className={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={t('settings.delete_account')}
            data-testid="delete-account-button"
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
              <p
                className={styles.deleteErrorText}
                role="alert"
                data-testid="settings-delete-error"
              >
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
                disabled={isDeleting}
                aria-label={t('settings.delete_cancel')}
              >
                {t('settings.delete_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
};
