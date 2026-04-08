import React from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Menu,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useResponsiveMenu } from '@/hooks/use-responsive-menu';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import styles from './nav.module.css';

export const Nav: React.FC = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, toggle, close, menuRef, triggerRef } = useResponsiveMenu();

  const needsSetup = !profile?.dateOfBirth || !profile?.bulughDate;

  const handleLogout = async () => {
    close();
    await signOut();
    navigate('/', { replace: true });
  };

  const handleNavClick = () => close();

  // Close menu on route change
  React.useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <nav className={styles.nav}>
      <div className={styles.navHeader}>
        <Link to="/" className={styles.logoLink} aria-label={t('common.app_name')}>
          <BrandLockup tone="dark" size="sm" />
        </Link>
        <div className={styles.headerControls}>
          <div className={styles.headerControlsInner}>
            <LanguageSwitcher tone="inverse" density="compact" />
            <ThemeToggle />
          </div>
          <button
            ref={triggerRef}
            className={styles.burgerBtn}
            onClick={toggle}
            aria-label={t('common.menu')}
            aria-expanded={isOpen}
            data-testid="nav-burger"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <div
        ref={menuRef as React.RefObject<HTMLDivElement>}
        className={`${styles.menuPanel} ${isOpen ? styles.menuPanelOpen : ''}`}
      >
        <div className={styles.section}>
          <p className={styles.sectionLabel}>{t('nav.tracker')}</p>
          <div className={styles.links}>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-dashboard"
              onClick={handleNavClick}
            >
              <LayoutDashboard size={20} />
              <span>{t('nav.dashboard')}</span>
            </NavLink>

            <NavLink
              to="/salah"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-salah"
              onClick={handleNavClick}
            >
              <Moon size={20} />
              <span>{t('nav.salah')}</span>
            </NavLink>

            <NavLink
              to="/sawm"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-sawm"
              onClick={handleNavClick}
            >
              <Sun size={20} />
              <span>{t('nav.sawm')}</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-history"
              onClick={handleNavClick}
            >
              <History size={20} />
              <span>{t('nav.history')}</span>
            </NavLink>

            <NavLink
              to="/learn"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-learn"
              onClick={handleNavClick}
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
                onClick={handleNavClick}
              >
                <ClipboardList size={20} />
                <span>{t('nav.setup')}</span>
              </NavLink>
            )}
          </div>
        </div>

        <div className={styles.mobileFooter}>
          <div className={styles.footerMeta}>
            <NavLink
              to="/settings"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              data-testid="nav-settings"
              onClick={handleNavClick}
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
              onClick={handleNavClick}
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
              onClick={handleNavClick}
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
              onClick={handleNavClick}
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
              onClick={handleNavClick}
            >
              <Shield size={16} />
              <span>{t('nav.privacy')}</span>
            </NavLink>
          </div>
        </div>
      </div>

      <div className={styles.desktopFooter}>
        <div className={styles.footerMeta}>
          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            data-testid="nav-settings"
            onClick={handleNavClick}
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
            onClick={handleNavClick}
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
            onClick={handleNavClick}
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
            onClick={handleNavClick}
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
            onClick={handleNavClick}
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
