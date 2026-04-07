import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlayCircle, Info, Users, Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import styles from './mobile-footer.module.css';

export const MobileFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className={styles.mobileFooter}>
      <nav className={styles.footerNav}>
        <NavLink
          to="/demo"
          className={({ isActive }) =>
            `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
          }
        >
          <PlayCircle size={16} />
          <span>{t('nav.demo')}</span>
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
          }
        >
          <Info size={16} />
          <span>{t('nav.about')}</span>
        </NavLink>

        <NavLink
          to="/contribute"
          className={({ isActive }) =>
            `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
          }
        >
          <Users size={16} />
          <span>{t('nav.contributing')}</span>
        </NavLink>

        <NavLink
          to="/privacy"
          className={({ isActive }) =>
            `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
          }
        >
          <Shield size={16} />
          <span>{t('nav.privacy')}</span>
        </NavLink>
      </nav>
    </footer>
  );
};
