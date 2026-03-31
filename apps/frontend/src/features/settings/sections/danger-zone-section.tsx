import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteAccount } from '@/hooks/use-profile';
import { useResetPrayerLogs, useResetFastLogs } from '@/hooks/use-worship';
import { deleteLocalUser } from '@/lib/local-auth.service';
import { clearOnboardingLocalState } from '@/lib/onboarding-state';
import { Trash2, RotateCcw } from 'lucide-react';
import { SettingsSection } from '../components';
import { getErrorMessage } from '../helpers';
import { useToast } from '@/hooks/use-toast';
import styles from '../settings-page.module.css';

export const DangerZoneSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, signIn, signOut } = useAuth();
  const resetPrayerLogs = useResetPrayerLogs();
  const resetFastLogs = useResetFastLogs();
  const { toast } = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useDeleteAccount();

  const [confirmReset, setConfirmReset] = useState<'prayers' | 'fasts' | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const email = user?.email || user?.username || '';
      await signIn(email, deletePassword);
      const result = await deleteAccount.mutateAsync();
      if (import.meta.env.VITE_AUTH_MODE === 'local' && email) {
        deleteLocalUser(email);
        clearOnboardingLocalState(user?.userId);
      } else if (result && !result.authDeleted) {
        toast.info(t('settings.delete_partial_cleanup_notice'), 10000);
      }
      await signOut();
    } catch (err: unknown) {
      setIsDeleting(false);
      setDeleteError(err instanceof Error ? err.message : t('settings.delete_error'));
    }
  };

  const handleResetData = (type: 'prayers' | 'fasts') => {
    setConfirmReset(type);
  };

  const executeReset = async (type: 'prayers' | 'fasts') => {
    setConfirmReset(null);
    try {
      if (type === 'prayers') {
        await resetPrayerLogs.mutateAsync();
      } else {
        await resetFastLogs.mutateAsync();
      }
    } catch (err) {
      toast.error(t(getErrorMessage(err, 'common.error')));
    }
  };

  return (
    <SettingsSection icon={<Trash2 size={18} />} title={t('settings.danger_zone')} variant="danger">
      <div className={styles.dangerZoneActions}>
        {/* Reset Actions */}
        <div className={styles.resetItem}>
          <div className={styles.resetItemInfo}>
            <span className={styles.resetItemLabel}>{t('settings.reset_prayers')}</span>
            <span className={styles.resetItemHint}>{t('settings.reset_prayers_hint')}</span>
          </div>
          {confirmReset === 'prayers' ? (
            <div className={styles.resetConfirmBtns}>
              <button
                type="button"
                className={styles.cancelAddBtn}
                onClick={() => setConfirmReset(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={styles.resetConfirmBtn}
                onClick={() => void executeReset('prayers')}
                disabled={resetPrayerLogs.isPending}
              >
                {resetPrayerLogs.isPending ? t('settings.resetting') : t('common.confirm')}
              </button>
            </div>
          ) : (
            <button
              className={styles.resetBtn}
              onClick={() => handleResetData('prayers')}
              disabled={resetPrayerLogs.isPending}
            >
              <RotateCcw size={14} />
              {resetPrayerLogs.isPending ? t('settings.resetting') : t('settings.reset_prayers')}
            </button>
          )}
        </div>

        <div className={styles.resetItem}>
          <div className={styles.resetItemInfo}>
            <span className={styles.resetItemLabel}>{t('settings.reset_fasts')}</span>
            <span className={styles.resetItemHint}>{t('settings.reset_fasts_hint')}</span>
          </div>
          {confirmReset === 'fasts' ? (
            <div className={styles.resetConfirmBtns}>
              <button
                type="button"
                className={styles.cancelAddBtn}
                onClick={() => setConfirmReset(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={styles.resetConfirmBtn}
                onClick={() => void executeReset('fasts')}
                disabled={resetFastLogs.isPending}
              >
                {resetFastLogs.isPending ? t('settings.resetting') : t('common.confirm')}
              </button>
            </div>
          ) : (
            <button
              className={styles.resetBtn}
              onClick={() => handleResetData('fasts')}
              disabled={resetFastLogs.isPending}
            >
              <RotateCcw size={14} />
              {resetFastLogs.isPending ? t('settings.resetting') : t('settings.reset_fasts')}
            </button>
          )}
        </div>

        <div className={styles.dangerDivider} />

        {/* Delete Account */}
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
      </div>
    </SettingsSection>
  );
};
