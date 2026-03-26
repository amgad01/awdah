import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { LogOut } from 'lucide-react';
import { SettingsSection } from '../components';
import styles from '../settings-page.module.css';

export const LogoutSection: React.FC = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <SettingsSection icon={<LogOut size={18} />} title={t('settings.logout_section')}>
      <button
        className={styles.signOutBtn}
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label={t('nav.logout')}
      >
        <LogOut size={18} />
        {signingOut ? t('settings.signing_out') : t('nav.logout')}
      </button>
    </SettingsSection>
  );
};
