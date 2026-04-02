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
  ClipboardList,
  PlayCircle,
  Info,
  Users,
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
      <div className={styles.navHeader}>
        <Link to="/" className={styles.logoLink} aria-label={t('common.app_name')}>
          <BrandLockup tone="dark" />
        </Link>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <p className={styles.sectionLabel}>{t('nav.tracker')}</p>
          <div className={styles.links}>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard size={20} />
              <span>{t('nav.dashboard')}</span>
            </NavLink>

            <NavLink
              to="/salah"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-salah"
            >
              <Moon size={20} />
              <span>{t('nav.salah')}</span>
            </NavLink>

            <NavLink
              to="/sawm"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-sawm"
            >
              <Sun size={20} />
              <span>{t('nav.sawm')}</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-history"
            >
              <History size={20} />
              <span>{t('nav.history')}</span>
            </NavLink>

            <NavLink
              to="/learn"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-learn"
            >
              <BookOpen size={20} />
              <span>{t('nav.learn')}</span>
            </NavLink>

            {needsSetup && (
              <NavLink
                to="/onboarding"
                className={({ isActive }) =>
                  `${styles.link} ${styles.setupLink} ${isActive ? styles.active : ''}`
                }
                data-testid="nav-setup"
              >
                <ClipboardList size={20} />
                <span>{t('nav.setup')}</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerMeta}>
          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            data-testid="nav-settings"
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
        </div>

        <div className={styles.footerLinks}>
          <NavLink
            to="/demo"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
            data-testid="nav-demo"
          >
            <PlayCircle size={16} />
            <span>{t('nav.demo')}</span>
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
            data-testid="nav-about"
          >
            <Info size={16} />
            <span>{t('nav.about')}</span>
          </NavLink>

          <NavLink
            to="/contribute"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
            data-testid="nav-contribute"
          >
            <Users size={16} />
            <span>{t('nav.contributing')}</span>
          </NavLink>

          <NavLink
            to="/privacy"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
            data-testid="nav-privacy"
          >
            <Shield size={16} />
            <span>{t('nav.privacy')}</span>
          </NavLink>
        </div>

        <div className={styles.footerControls}>
          <LanguageSwitcher tone="inverse" density="compact" />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
