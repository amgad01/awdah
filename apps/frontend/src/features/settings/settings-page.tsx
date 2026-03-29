import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useExportData, useProfile, usePracticingPeriods } from '@/hooks/use-profile';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { User, Bell, Languages, Info, Shield, Download } from 'lucide-react';
import { SettingsSection } from './components';
import { ProfileSection, PeriodsSection, LogoutSection, DangerZoneSection } from './sections';
import type { PeriodLike } from './types';
import { getErrorMessage } from './helpers';
import styles from './settings-page.module.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: periods } = usePracticingPeriods();
  const { data: profile } = useProfile();
  const exportData = useExportData();

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportData = async () => {
    setExportError(null);
    try {
      await exportData.mutateAsync();
    } catch (error) {
      setExportError(getErrorMessage(error, t('common.error')));
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
        <div className={styles.accountInfo}>
          <div className={styles.avatar}>{(user?.username?.[0] ?? 'U').toUpperCase()}</div>
          <div className={styles.accountDetails}>
            <p className={styles.accountName}>{user?.username ?? '—'}</p>
            <p className={styles.accountEmail}>{user?.email ?? user?.userId ?? ''}</p>
          </div>
        </div>
      </SettingsSection>

      {/* Logout - MOVED UP */}
      <LogoutSection />

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

      {/* Danger Zone - NOW INCLUDES RESETS */}
      <DangerZoneSection />
    </div>
  );
};
