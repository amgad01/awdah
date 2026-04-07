import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { useResponsiveMenu } from '@/hooks/use-responsive-menu';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import { Loader2, Menu } from 'lucide-react';
import styles from '../../App.module.css';

function LoadingFallback() {
  return (
    <div className={styles.loadingScreen}>
      <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
    </div>
  );
}

interface PublicTopBarProps {
  onShowLogin?: () => void;
  onShowSignup?: () => void;
  hideAuthLinksOnMobile?: boolean;
}

function PublicTopBar({
  onShowLogin,
  onShowSignup,
  hideAuthLinksOnMobile = false,
}: PublicTopBarProps) {
  const { t } = useLanguage();
  const { isOpen, toggle, close, menuRef, triggerRef } = useResponsiveMenu();

  return (
    <header className={styles.publicTopBar}>
      <Link to="/" className={styles.publicBrand} aria-label={t('common.app_name')}>
        <BrandLockup tone="dark" />
      </Link>

      <button
        ref={triggerRef}
        className={styles.publicBurgerBtn}
        onClick={toggle}
        aria-label={t('common.menu')}
        aria-expanded={isOpen}
        data-testid="public-nav-burger"
      >
        <Menu size={22} />
      </button>

      <nav
        ref={menuRef as React.RefObject<HTMLElement>}
        className={`${styles.publicTopNav} ${isOpen ? styles.publicTopNavOpen : ''}`}
        aria-label={t('common.app_name')}
      >
        <Link to="/demo" className={styles.publicTopLink} onClick={close}>
          {t('nav.demo')}
        </Link>
        <Link to="/about" className={styles.publicTopLink} onClick={close}>
          {t('about.nav_link')}
        </Link>
        <Link to="/learn" className={styles.publicTopLink} onClick={close}>
          {t('nav.learn')}
        </Link>
        <Link to="/contribute" className={styles.publicTopLink} onClick={close}>
          {t('nav.contributing')}
        </Link>
        <Link to="/privacy" className={styles.publicTopLink} onClick={close}>
          {t('privacy.nav_link')}
        </Link>
        {onShowSignup ? (
          <Link
            to="/?auth=signup"
            className={`${styles.publicTopCta} ${hideAuthLinksOnMobile ? styles.publicTopAuthHideMobile : ''}`}
            onClick={() => {
              close();
              onShowSignup();
            }}
          >
            {t('auth.sign_up')}
          </Link>
        ) : null}
        {onShowLogin ? (
          <Link
            to="/?auth=login"
            className={`${styles.publicTopCta} ${hideAuthLinksOnMobile ? styles.publicTopAuthHideMobile : ''}`}
            onClick={() => {
              close();
              onShowLogin();
            }}
          >
            {t('auth.login')}
          </Link>
        ) : null}
      </nav>

      <div className={styles.publicTopActions}>
        <LanguageSwitcher tone="inverse" />
        <ThemeToggle />
      </div>
    </header>
  );
}

interface PublicPageShellProps {
  badge?: string;
  title: string;
  subtitle?: string;
  ctaTitle?: string;
  ctaText?: string;
  onShowLogin: () => void;
  onShowSignup: () => void;
  children: React.ReactNode;
}

export const PublicPageShell: React.FC<PublicPageShellProps> = ({
  badge,
  title,
  subtitle,
  ctaTitle,
  ctaText,
  onShowLogin,
  onShowSignup,
  children,
}) => {
  const { t } = useLanguage();
  const hasCtaCopy = Boolean(ctaTitle || ctaText);

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar onShowLogin={onShowLogin} onShowSignup={onShowSignup} />

        <section className={styles.learnHero}>
          <div className={styles.learnHeroCopy}>
            {badge ? <span className={styles.heroBadge}>{badge}</span> : null}
            <h1 className={styles.learnTitle}>{title}</h1>
            {subtitle ? <p className={styles.learnSubtitle}>{subtitle}</p> : null}
          </div>

          <aside
            className={`${styles.learnCtaCard} ${!hasCtaCopy ? styles.learnCtaCardCompact : ''}`}
          >
            {hasCtaCopy ? (
              <p className={styles.learnCtaKicker}>{t('marketing.panel_kicker')}</p>
            ) : null}
            {ctaTitle ? <h2 className={styles.learnCtaTitle}>{ctaTitle}</h2> : null}
            {ctaText ? <p className={styles.learnCtaText}>{ctaText}</p> : null}
            <div className={styles.learnCtaActions}>
              <Link to="/?auth=signup" className={styles.learnPrimary} onClick={onShowSignup}>
                {t('marketing.primary_cta')}
              </Link>
              <Link to="/?auth=login" className={styles.learnSecondary} onClick={onShowLogin}>
                {t('marketing.secondary_cta')}
              </Link>
            </div>
          </aside>
        </section>

        <section className={styles.learnSurface}>
          <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </section>
      </div>
    </div>
  );
};

export { PublicTopBar, LoadingFallback };
