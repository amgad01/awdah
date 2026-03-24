import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Moon, Sun, Settings, LogOut, History, BookOpen } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import styles from './nav.module.css';

export const Nav: React.FC = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logoLink} aria-label={t('common.app_name')}>
        <span className={styles.logoEn}>Awdah</span>
        <span className={styles.logoDivider}>·</span>
        <span className={styles.logoAr}>عودة</span>
      </Link>

      <div className={styles.links}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>{t('nav.dashboard')}</span>
        </NavLink>

        <NavLink
          to="/salah"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Moon size={20} />
          <span>{t('nav.salah')}</span>
        </NavLink>

        <NavLink
          to="/sawm"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Sun size={20} />
          <span>{t('nav.sawm')}</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <History size={20} />
          <span>{t('nav.history')}</span>
        </NavLink>

        <NavLink
          to="/learn"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <BookOpen size={20} />
          <span>{t('nav.learn')}</span>
        </NavLink>
      </div>

      <div className={styles.footer}>
        <LanguageSwitcher tone="inverse" />
        <ThemeToggle />
        <NavLink
          to="/settings"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Settings size={20} />
          <span>{t('nav.settings')}</span>
        </NavLink>
        <button className={styles.logoutBtn} onClick={handleLogout} aria-label={t('nav.logout')}>
          <LogOut size={20} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </nav>
  );
};
