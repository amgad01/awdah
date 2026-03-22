import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteAccount, useExportData } from '@/hooks/use-profile';
import { Card } from '@/components/ui/card/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { User, Bell, Languages, Info, LogOut, Shield, Trash2, Download } from 'lucide-react';
import styles from './settings-page.module.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, signIn, signOut } = useAuth();
  const deleteAccount = useDeleteAccount();
  const exportData = useExportData();
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      // Re-authenticate with the entered password before deleting.
      // This prevents accidental deletion and confirms current identity.
      const email = user?.email || user?.username || '';
      await signIn(email, deletePassword);

      await deleteAccount.mutateAsync();
      // signOut clears localStorage; Cognito account is already deleted server-side
      await signOut();
    } catch (err: unknown) {
      setIsDeleting(false);
      setDeleteError(err instanceof Error ? err.message : t('settings.delete_error'));
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('nav.settings')}</h1>
        <p className={styles.subtitle}>{t('settings.subtitle')}</p>
      </header>

      {/* Account Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <User size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
        </div>
        <div className={styles.accountInfo}>
          <div className={styles.avatar}>{(user?.username?.[0] ?? 'U').toUpperCase()}</div>
          <div className={styles.accountDetails}>
            <p className={styles.accountName}>{user?.username ?? '—'}</p>
            <p className={styles.accountEmail}>{user?.email ?? user?.userId ?? ''}</p>
          </div>
        </div>
      </Card>

      {/* Language Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Languages size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
        </div>
        <LanguageSwitcher variant="full" />
      </Card>

      {/* Notifications Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Bell size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
        </div>
        <p className={styles.comingSoon}>{t('settings.coming_soon')}</p>
      </Card>

      {/* Privacy Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Shield size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.privacy')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.privacy_note')}</p>
        <button
          className={styles.exportBtn}
          onClick={() => exportData.mutate()}
          disabled={exportData.isPending}
        >
          <Download size={16} />
          {exportData.isPending ? t('settings.exporting') : t('settings.export_data')}
        </button>
      </Card>

      {/* About Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Info size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.about')}</h2>
        </div>
        <div className={styles.aboutInfo}>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>{t('settings.version')}</span>
            <span className={styles.aboutVal}>{APP_VERSION}</span>
          </div>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>{t('settings.built_with')}</span>
            <span className={styles.aboutVal}>{t('settings.built_with_value')}</span>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <button
        className={styles.signOutBtn}
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label={t('nav.logout')}
      >
        <LogOut size={18} />
        {signingOut ? t('settings.signing_out') : t('nav.logout')}
      </button>

      {/* Danger Zone */}
      <Card className={`${styles.section} ${styles.dangerZone}`}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.sectionIcon} ${styles.dangerIcon}`}>
            <Trash2 size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.danger_zone')}</h2>
        </div>
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
      </Card>
    </div>
  );
};
