import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { Loader2 } from 'lucide-react';
import styles from '../../App.module.css';

function LoadingFallback() {
  return (
    <div className={styles.loadingScreen}>
      <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
    </div>
  );
}

function PublicTopBar() {
  const { t } = useLanguage();

  return (
    <header className={styles.publicTopBar}>
      <Link to="/" className={styles.publicBrand} aria-label={t('common.app_name')}>
        <span className={styles.publicBrandEn}>Awdah</span>
        <span className={styles.publicBrandDivider}>·</span>
        <span className={styles.publicBrandAr}>عودة</span>
      </Link>

      <div className={styles.publicTopActions}>
        <Link to="/demo" className={styles.publicTopLink}>
          {t('nav.demo')}
        </Link>
        <Link to="/about" className={styles.publicTopLink}>
          {t('about.nav_link')}
        </Link>
        <Link to="/learn" className={styles.publicTopLink}>
          {t('nav.learn')}
        </Link>
        <LanguageSwitcher tone="inverse" />
      </div>
    </header>
  );
}

interface PublicPageShellProps {
  badge: string;
  title: string;
  subtitle: string;
  ctaTitle: string;
  ctaText: string;
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

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar />

        <section className={styles.learnHero}>
          <div className={styles.learnHeroCopy}>
            <span className={styles.heroBadge}>{badge}</span>
            <h1 className={styles.learnTitle}>{title}</h1>
            <p className={styles.learnSubtitle}>{subtitle}</p>
          </div>

          <aside className={styles.learnCtaCard}>
            <p className={styles.learnCtaKicker}>{t('marketing.panel_kicker')}</p>
            <h2 className={styles.learnCtaTitle}>{ctaTitle}</h2>
            <p className={styles.learnCtaText}>{ctaText}</p>
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
