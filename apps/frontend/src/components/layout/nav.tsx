import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Moon,
  Sun,
  Settings,
  LogOut,
  History,
  BookOpen,
  PlayCircle,
  Info,
  Users,
  ClipboardList,
  Shield,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import styles from './nav.module.css';

export const Nav: React.FC = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const needsSetup = !profile?.dateOfBirth || !profile?.bulughDate;

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logoLink} aria-label={t('common.app_name')}>
        <BrandLockup tone="dark" />
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

        <NavLink
          to="/demo"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <PlayCircle size={20} />
          <span>{t('nav.demo')}</span>
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Info size={20} />
          <span>{t('nav.about')}</span>
        </NavLink>

        <NavLink
          to="/contribute"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Users size={20} />
          <span>{t('nav.contributing')}</span>
        </NavLink>

        {needsSetup && (
          <NavLink
            to="/onboarding"
            className={({ isActive }) =>
              `${styles.link} ${styles.setupLink} ${isActive ? styles.active : ''}`
            }
          >
            <ClipboardList size={20} />
            <span>{t('nav.setup')}</span>
          </NavLink>
        )}
      </div>

      <div className={styles.footer}>
        <NavLink
          to="/settings"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Settings size={20} />
          <span>{t('nav.settings')}</span>
        </NavLink>
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          aria-label={t('nav.logout')}
          data-testid="logout-button"
        >
          <LogOut size={20} />
          <span>{t('nav.logout')}</span>
        </button>
        <NavLink
          to="/privacy"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Shield size={20} />
          <span>{t('nav.privacy')}</span>
        </NavLink>
        <LanguageSwitcher tone="inverse" />
        <ThemeToggle />
      </div>
    </nav>
  );
};
