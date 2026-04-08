import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { getAuthErrorKey } from '@/lib/auth-errors';
import {
  useExportData,
  useProfile,
  usePracticingPeriods,
  useUpdateProfile,
} from '@/hooks/use-profile';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { getUserDisplayInitial, getUserDisplayName } from '@/lib/user-display';
import {
  User,
  Bell,
  Languages,
  Shield,
  Download,
  Check,
  Edit2,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import { SettingsSection } from './components';
import { ProfileSection, PeriodsSection, LogoutSection, DangerZoneSection } from './sections';
import type { PeriodLike } from './types';
import { getErrorMessage } from './helpers';
import styles from './settings-page.module.css';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, verifyPassword } = useAuth();
  const { data: periods } = usePracticingPeriods();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const exportData = useExportData();
  const displayName = getUserDisplayName({
    profileUsername: profile?.username,
    email: user?.email,
    fallback: t('common.user'),
  });
  const avatarInitial = getUserDisplayInitial(displayName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportPassword, setExportPassword] = useState('');

  const handleExportData = async () => {
    setExportError(null);
    const email = user?.email || user?.username || '';

    try {
      await verifyPassword(email, exportPassword);
    } catch (error) {
      setExportError(t(getAuthErrorKey(error, 'settings.verify_password_failed')));
      return;
    }

    try {
      await exportData.mutateAsync();
      setShowExportConfirm(false);
      setExportPassword('');
    } catch (error) {
      setExportError(getErrorMessage(error, t('common.error')));
    }
  };

  const handleStartEdit = () => {
    setTempName(profile?.username ?? '');
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setTempName('');
  };

  const handleSaveName = async () => {
    if (!profile) return;
    try {
      await updateProfile.mutateAsync({
        username: tempName.trim() || undefined,
        bulughDate: profile.bulughDate,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth || undefined,
        revertDate: profile.revertDate || undefined,
      });
      setIsEditingName(false);
    } catch {
      // toast will handle error
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroBadge}>{t('settings.hero_badge')}</span>
        <h1 className={styles.title}>{t('nav.settings')}</h1>
        <p className={styles.subtitle}>{t('settings.subtitle')}</p>
      </section>

      {/* Account */}
      <SettingsSection icon={<User size={18} />} title={t('settings.account')}>
        <div className={styles.accountCard}>
          <div className={styles.accountHeader}>
            <div className={styles.avatar}>{avatarInitial}</div>
            <div className={styles.accountPrimary}>
              <span className={styles.accountEmailLabel}>{t('settings.account_email_label')}</span>
              <span className={styles.accountEmailValue}>{user?.email}</span>
            </div>
          </div>

          <div className={styles.accountDivider} />

          <div className={styles.accountField}>
            <div className={styles.fieldHeader}>
              <label className={styles.fieldLabel}>{t('settings.display_name_label')}</label>
              {!isEditingName && (
                <button
                  className={styles.editNameBtn}
                  onClick={handleStartEdit}
                  aria-label={t('common.edit')}
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className={styles.usernameEditGroup}>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className={styles.usernameInput}
                  placeholder={t('settings.username_placeholder')}
                  maxLength={40}
                  autoFocus
                />
                <div className={styles.editActions}>
                  <button
                    className={styles.editActionBtn}
                    onClick={() => void handleSaveName()}
                    disabled={updateProfile.isPending}
                    aria-label={t('common.save')}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                  <button
                    className={`${styles.editActionBtn} ${styles.cancelBtn}`}
                    onClick={handleCancelEdit}
                    disabled={updateProfile.isPending}
                    aria-label={t('common.cancel')}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className={styles.accountName}>{displayName}</p>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Profile & Qadaa Data */}
      {profile !== undefined && <ProfileSection periods={(periods ?? []) as PeriodLike[]} />}

      {/* Practicing Periods */}
      <PeriodsSection />

      {/* Language */}
      <SettingsSection icon={<Languages size={18} />} title={t('settings.language')}>
        <LanguageSwitcher variant="full" />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection icon={<Bell size={18} />} title={t('settings.notifications')}>
        <p className={styles.comingSoon}>{t('settings.coming_soon')}</p>
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection icon={<Shield size={18} />} title={t('settings.privacy')}>
        <p className={styles.privacyText}>{t('settings.privacy_note')}</p>

        {!showExportConfirm ? (
          <button
            className={styles.exportBtn}
            onClick={() => {
              setShowExportConfirm(true);
              setExportPassword('');
              setExportError(null);
            }}
            disabled={exportData.isPending}
            data-testid="export-data-button"
          >
            <Download size={16} />
            {t('settings.export_data')}
          </button>
        ) : (
          <div className={styles.exportConfirm}>
            <p className={styles.exportConfirmText}>{t('settings.export_reauth_hint')}</p>
            <div className={styles.exportPasswordRow}>
              <Lock size={16} className={styles.exportPasswordIcon} />
              <input
                type="password"
                className={styles.exportPasswordInput}
                placeholder={t('settings.export_confirm_password')}
                value={exportPassword}
                onChange={(e) => {
                  setExportPassword(e.target.value);
                  setExportError(null);
                }}
                aria-label={t('settings.export_confirm_password')}
              />
            </div>
            {exportError && (
              <p
                className={styles.exportErrorText}
                role="alert"
                data-testid="settings-export-error"
              >
                {exportError}
              </p>
            )}
            <div className={styles.exportConfirmBtns}>
              <button
                className={styles.cancelAddBtn}
                onClick={() => {
                  setShowExportConfirm(false);
                  setExportPassword('');
                  setExportError(null);
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                className={styles.confirmAddBtn}
                onClick={() => void handleExportData()}
                disabled={exportData.isPending || !exportPassword}
              >
                <Check size={16} />
                {exportData.isPending ? t('settings.exporting') : t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Logout */}
      <LogoutSection />

      {/* Danger Zone - NOW INCLUDES RESETS */}
      <DangerZoneSection />
    </div>
  );
};
