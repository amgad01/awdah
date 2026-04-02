import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
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
  Info,
  Shield,
  Download,
  Edit2,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { SettingsSection } from './components';
import { ProfileSection, PeriodsSection, LogoutSection, DangerZoneSection } from './sections';
import type { PeriodLike } from './types';
import { getErrorMessage } from './helpers';
import styles from './settings-page.module.css';

const APP_VERSION =
  import.meta.env.VITE_APP_RELEASE_TAG || import.meta.env.VITE_APP_VERSION || 'v1.0.0-dev';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
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

  const handleExportData = async () => {
    setExportError(null);
    try {
      await exportData.mutateAsync();
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
        <button
          className={styles.exportBtn}
          onClick={() => void handleExportData()}
          disabled={exportData.isPending}
        >
          <Download size={16} />
          {exportData.isPending ? t('settings.exporting') : t('settings.export_data')}
        </button>
        {exportError && (
          <p className={styles.sectionError} role="alert">
            {exportError}
          </p>
        )}
      </SettingsSection>

      {/* About */}
      <SettingsSection icon={<Info size={18} />} title={t('settings.about')}>
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
      </SettingsSection>

      {/* Logout */}
      <LogoutSection />

      {/* Danger Zone - NOW INCLUDES RESETS */}
      <DangerZoneSection />
    </div>
  );
};
