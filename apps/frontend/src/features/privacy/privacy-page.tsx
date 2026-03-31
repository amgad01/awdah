import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import styles from './privacy-page.module.css';

export const PrivacyPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <main className={styles.wrapper} aria-label={t('privacy.title')}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('privacy.title')}</h1>
        <p className={styles.lastUpdated}>{t('privacy.last_updated')}</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.intro_title')}</h2>
        <p>{t('privacy.intro_body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.what_we_store_title')}</h2>
        <ul className={styles.list}>
          <li>{t('onboarding.privacy_data_dob')}</li>
          <li>{t('onboarding.privacy_data_bulugh')}</li>
          <li>{t('onboarding.privacy_data_periods')}</li>
          <li>{t('onboarding.privacy_data_logs')}</li>
          <li>{t('onboarding.privacy_data_email')}</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.how_stored_title')}</h2>
        <p>{t('privacy.how_stored_body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.sharing_title')}</h2>
        <p>{t('privacy.sharing_body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.rights_title')}</h2>
        <p>{t('privacy.rights_body')}</p>
        <ul className={styles.list}>
          <li>{t('privacy.right_access')}</li>
          <li>{t('privacy.right_delete')}</li>
          <li>{t('privacy.right_export')}</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.cookies_title')}</h2>
        <p>{t('privacy.cookies_body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('privacy.contact_title')}</h2>
        <p>{t('privacy.contact_body', { email: import.meta.env.VITE_APP_EMAIL })}</p>
      </section>
    </main>
  );
};
