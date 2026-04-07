import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { Shield, Lock, Eye, Trash2, Download, Mail } from 'lucide-react';
import styles from './privacy-page.module.css';

interface PrivacyPageProps {
  embedded?: boolean;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ embedded = false }) => {
  const { t } = useLanguage();

  return (
    <main
      className={`${styles.wrapper} ${embedded ? styles.embedded : ''}`}
      aria-label={t('privacy.title')}
    >
      <header className={styles.header}>
        <span className={styles.overline}>{t('privacy.last_updated')}</span>
        <h1 className={styles.title}>{t('privacy.title')}</h1>
        <p className={styles.lead}>{t('privacy.intro_body')}</p>
      </header>

      <div className={styles.content}>
        {/* Section 1: What we store */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Shield size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.what_we_store_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.dataList}>
              <div className={styles.dataItem}>{t('onboarding.privacy_data_dob')}</div>
              <div className={styles.dataItem}>{t('onboarding.privacy_data_bulugh')}</div>
              <div className={styles.dataItem}>{t('onboarding.privacy_data_periods')}</div>
              <div className={styles.dataItem}>{t('onboarding.privacy_data_logs')}</div>
              <div className={styles.dataItem}>{t('onboarding.privacy_data_email')}</div>
            </div>
          </div>
        </section>

        {/* Section 2: How stored */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Lock size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.how_stored_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <p className={styles.paragraph}>{t('privacy.how_stored_body')}</p>
          </div>
        </section>

        {/* Section 3: Sharing */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Eye size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.sharing_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <p className={styles.paragraph}>{t('privacy.sharing_body')}</p>
          </div>
        </section>

        {/* Section 4: Rights */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Download size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.rights_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <p className={styles.paragraph}>{t('privacy.rights_body')}</p>
            <div className={styles.rightsList}>
              <div className={styles.rightItem}>
                <Eye size={16} />
                <span>{t('privacy.right_access')}</span>
              </div>
              <div className={styles.rightItem}>
                <Trash2 size={16} />
                <span>{t('privacy.right_delete')}</span>
              </div>
              <div className={styles.rightItem}>
                <Download size={16} />
                <span>{t('privacy.right_export')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Cookies */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Lock size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.cookies_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <p className={styles.paragraph}>{t('privacy.cookies_body')}</p>
          </div>
        </section>

        {/* Section 6: Contact */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Mail size={22} />
            </div>
            <h2 className={styles.sectionTitle}>{t('privacy.contact_title')}</h2>
          </div>
          <div className={styles.sectionBody}>
            <p className={styles.paragraph}>
              {t('privacy.contact_body', { email: import.meta.env.VITE_APP_EMAIL })}
            </p>
            <Link to="/about" className={styles.linkButton}>
              {t('about.nav_link')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
