import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { PublicTopBar, LoadingFallback } from '@/components/public-page-shell/public-page-shell';
import styles from '../../App.module.css';

interface PublicLandingProps {
  authNotice: boolean;
  authView: 'login' | 'signup' | 'forgot';
  onShowLogin: () => void;
  onShowSignup: () => void;
  onShowForgot: () => void;
  onAuthSuccess: () => void;
  LoginForm: React.LazyExoticComponent<
    React.FC<{
      onSuccess: () => void;
      onSwitchToSignup: () => void;
      onSwitchToForgotPassword: () => void;
    }>
  >;
  SignupForm: React.LazyExoticComponent<
    React.FC<{ onSuccess: () => void; onSwitchToLogin: () => void }>
  >;
  ForgotPasswordForm: React.LazyExoticComponent<
    React.FC<{ onSuccess: () => void; onSwitchToLogin: () => void }>
  >;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  authNotice,
  authView,
  onShowLogin,
  onShowSignup,
  onShowForgot,
  onAuthSuccess,
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar onShowLogin={onShowLogin} />

        <div className={styles.authShell}>
          <section className={styles.heroPanel}>
            <span className={styles.heroBadge}>{t('marketing.badge')}</span>
            <h1 className={styles.authTitle}>{t('marketing.title')}</h1>
            <p className={styles.authSubtitle}>{t('marketing.subtitle')}</p>

            <div className={styles.heroActions}>
              <button type="button" className={styles.heroPrimary} onClick={onShowSignup}>
                {t('marketing.primary_cta')}
              </button>
              <button type="button" className={styles.heroSecondary} onClick={onShowLogin}>
                {t('marketing.secondary_cta')}
              </button>
              <Link to="/demo" className={styles.heroTertiary}>
                {t('marketing.demo_cta')}
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statPill}>{t('marketing.stat_multilingual')}</div>
              <div className={styles.statPill}>{t('marketing.stat_hijri')}</div>
              <div className={styles.statPill}>{t('marketing.stat_privacy')}</div>
              <div className={styles.statPill}>{t('marketing.stat_selfhost')}</div>
            </div>

            <div className={styles.featureGrid}>
              {[1, 2, 3].map((index) => (
                <article key={index} className={styles.featureCard}>
                  <h2 className={styles.featureTitle}>{t(`marketing.feature_${index}_title`)}</h2>
                  <p className={styles.featureText}>{t(`marketing.feature_${index}_body`)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.authPanel}>
            <div className={styles.authBranding}>
              <BrandLockup tone="light" size="sm" className={styles.authPanelBrand} />
              <p className={styles.authKicker}>{t('marketing.panel_kicker')}</p>
              <h2 className={styles.authPanelTitle}>
                {authView === 'login' ? t('auth.login') : t('auth.sign_up')}
              </h2>
              <p className={styles.authPanelText}>{t('marketing.panel_text')}</p>
              {authNotice ? <p className={styles.authNotice}>{t('auth.session_expired')}</p> : null}
            </div>

            <Suspense fallback={<LoadingFallback />}>
              {authView === 'login' ? (
                <LoginForm
                  onSuccess={onAuthSuccess}
                  onSwitchToSignup={onShowSignup}
                  onSwitchToForgotPassword={onShowForgot}
                />
              ) : authView === 'signup' ? (
                <SignupForm onSuccess={onAuthSuccess} onSwitchToLogin={onShowLogin} />
              ) : (
                <ForgotPasswordForm onSuccess={onAuthSuccess} onSwitchToLogin={onShowLogin} />
              )}
            </Suspense>
          </section>
        </div>

        <footer className={styles.publicFooter}>
          <Link to="/about" className={styles.publicFooterLink}>
            {t('about.nav_link')}
          </Link>
          <Link to="/contribute" className={styles.publicFooterLink}>
            {t('nav.contributing')}
          </Link>
          <Link to="/demo" className={styles.publicFooterLink}>
            {t('nav.demo')}
          </Link>
          <Link to="/privacy" className={styles.publicFooterLink}>
            {t('privacy.nav_link')}
          </Link>
        </footer>
      </div>
    </div>
  );
};
