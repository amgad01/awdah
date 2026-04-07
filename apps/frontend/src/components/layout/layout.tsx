import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { Nav } from './nav';
import { MobileFooter } from './mobile-footer';
import styles from './layout.module.css';

interface LayoutProps {
  children: ReactNode;
  showSetupReminder?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showSetupReminder = false }) => {
  const { t } = useLanguage();

  return (
    <div className={styles.wrapper}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.container}>
          {showSetupReminder ? (
            <div className={styles.setupReminder} role="status">
              <div>
                <p className={styles.setupReminderTitle}>{t('settings.setup_reminder_title')}</p>
                <p className={styles.setupReminderBody}>{t('settings.setup_reminder_body')}</p>
              </div>
              <Link to="/onboarding" className={styles.setupReminderCta}>
                {t('settings.setup_reminder_cta')}
              </Link>
            </div>
          ) : null}

          {children}
        </div>
        <MobileFooter />
      </main>
    </div>
  );
};
