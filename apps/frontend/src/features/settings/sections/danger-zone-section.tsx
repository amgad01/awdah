import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteAccount } from '@/hooks/use-profile';
import { useResetPrayerLogs, useResetFastLogs } from '@/hooks/use-worship';
import { getAuthErrorKey } from '@/lib/auth-errors';
import { deleteLocalUser } from '@/lib/local-auth.service';
import { clearOnboardingLocalState } from '@/lib/onboarding-state';
import { Trash2, RotateCcw } from 'lucide-react';
import { SettingsSection } from '../components';
import { useToast } from '@/hooks/use-toast';
import styles from '../settings-page.module.css';

export const DangerZoneSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, verifyPassword, signOut } = useAuth();
  const resetPrayerLogs = useResetPrayerLogs();
  const resetFastLogs = useResetFastLogs();
  const { toast } = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useDeleteAccount();

  const [confirmReset, setConfirmReset] = useState<'prayers' | 'fasts' | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const email = user?.email || user?.username || '';
      await verifyPassword(email, deletePassword);
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
      setDeleteError(t(getAuthErrorKey(err, 'settings.delete_error')));
    }
  };

  const handleResetData = (type: 'prayers' | 'fasts') => {
    setConfirmReset(type);
    setResetPassword('');
    setResetError('');
  };

  const executeReset = async (type: 'prayers' | 'fasts') => {
    setResetError('');
    try {
      const email = user?.email || user?.username || '';
      await verifyPassword(email, resetPassword);
      if (type === 'prayers') {
        await resetPrayerLogs.mutateAsync();
      } else {
        await resetFastLogs.mutateAsync();
      }
      setConfirmReset(null);
      setResetPassword('');
    } catch (err) {
      setResetError(t(getAuthErrorKey(err, 'settings.verify_password_failed')));
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
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteConfirmText}>{t('settings.reset_confirm_prayers')}</p>
              <input
                type="password"
                className={styles.deletePasswordInput}
                placeholder={t('settings.delete_confirm_password')}
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetError('');
                }}
                aria-label={t('settings.delete_confirm_password')}
              />
              {resetError && (
                <p className={styles.deleteErrorText} role="alert">
                  {resetError}
                </p>
              )}
              <div className={styles.resetConfirmBtns}>
                <button
                  type="button"
                  className={styles.cancelAddBtn}
                  onClick={() => {
                    setConfirmReset(null);
                    setResetPassword('');
                    setResetError('');
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className={styles.resetConfirmBtn}
                  onClick={() => void executeReset('prayers')}
                  disabled={resetPrayerLogs.isPending || !resetPassword}
                >
                  {resetPrayerLogs.isPending ? t('settings.resetting') : t('common.confirm')}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.resetBtn}
              onClick={() => handleResetData('prayers')}
              disabled={resetPrayerLogs.isPending}
              data-testid="reset-prayers-button"
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
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteConfirmText}>{t('settings.reset_confirm_fasts')}</p>
              <input
                type="password"
                className={styles.deletePasswordInput}
                placeholder={t('settings.delete_confirm_password')}
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetError('');
                }}
                aria-label={t('settings.delete_confirm_password')}
              />
              {resetError && (
                <p className={styles.deleteErrorText} role="alert">
                  {resetError}
                </p>
              )}
              <div className={styles.resetConfirmBtns}>
                <button
                  type="button"
                  className={styles.cancelAddBtn}
                  onClick={() => {
                    setConfirmReset(null);
                    setResetPassword('');
                    setResetError('');
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className={styles.resetConfirmBtn}
                  onClick={() => void executeReset('fasts')}
                  disabled={resetFastLogs.isPending || !resetPassword}
                >
                  {resetFastLogs.isPending ? t('settings.resetting') : t('common.confirm')}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.resetBtn}
              onClick={() => handleResetData('fasts')}
              disabled={resetFastLogs.isPending}
              data-testid="reset-fasts-button"
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
