import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import { Loader2 } from 'lucide-react';
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
}

function PublicTopBar({ onShowLogin }: PublicTopBarProps) {
  const { t } = useLanguage();

  return (
    <header className={styles.publicTopBar}>
      <Link to="/" className={styles.publicBrand} aria-label={t('common.app_name')}>
        <BrandLockup tone="dark" />
      </Link>

      <nav className={styles.publicTopNav} aria-label={t('common.app_name')}>
        <Link to="/demo" className={styles.publicTopLink}>
          {t('nav.demo')}
        </Link>
        <Link to="/about" className={styles.publicTopLink}>
          {t('about.nav_link')}
        </Link>
        <Link to="/learn" className={styles.publicTopLink}>
          {t('nav.learn')}
        </Link>
        <Link to="/contribute" className={styles.publicTopLink}>
          {t('nav.contributing')}
        </Link>
        <Link to="/privacy" className={styles.publicTopLink}>
          {t('privacy.nav_link')}
        </Link>
      </nav>

      <div className={styles.publicTopActions}>
        {onShowLogin ? (
          <Link to="/" className={styles.publicTopCta} onClick={onShowLogin}>
            {t('auth.login')}
          </Link>
        ) : null}
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
        <PublicTopBar onShowLogin={onShowLogin} />

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
              <Link to="/" className={styles.learnPrimary} onClick={onShowSignup}>
                {t('marketing.primary_cta')}
              </Link>
              <Link to="/" className={styles.learnSecondary} onClick={onShowLogin}>
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
