import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingStatus } from '@/hooks/use-profile';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Loader2 } from 'lucide-react';
import styles from './App.module.css';

const Layout = lazy(() =>
  import('@/components/layout/layout').then((module) => ({ default: module.Layout })),
);
const Dashboard = lazy(() =>
  import('@/features/dashboard/dashboard').then((module) => ({ default: module.Dashboard })),
);
const SalahPage = lazy(() =>
  import('@/features/salah/salah-page').then((module) => ({ default: module.SalahPage })),
);
const SawmPage = lazy(() =>
  import('@/features/sawm/sawm-page').then((module) => ({ default: module.SawmPage })),
);
const HistoryPage = lazy(() =>
  import('@/features/history/history-page').then((module) => ({ default: module.HistoryPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
);
const LearnPage = lazy(() =>
  import('@/features/learn/learn-page').then((module) => ({ default: module.LearnPage })),
);
const DemoPage = lazy(() =>
  import('@/features/demo/demo-page').then((module) => ({ default: module.DemoPage })),
);
const AboutPage = lazy(() =>
  import('@/features/about/about-page').then((module) => ({ default: module.AboutPage })),
);
const LoginForm = lazy(() =>
  import('@/features/auth/login-form').then((module) => ({ default: module.LoginForm })),
);
const SignupForm = lazy(() =>
  import('@/features/auth/signup-form').then((module) => ({ default: module.SignupForm })),
);
const OnboardingWizard = lazy(() =>
  import('@/features/onboarding/onboarding-wizard').then((module) => ({
    default: module.OnboardingWizard,
  })),
);
const NotFound = lazy(() =>
  import('@/components/not-found/not-found').then((module) => ({ default: module.NotFound })),
);
const PrivacyPage = lazy(() =>
  import('@/features/privacy/privacy-page').then((module) => ({ default: module.PrivacyPage })),
);

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
    </div>
  );
}

function ProfileLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.statusScreen}>
      <ErrorState message={message} onRetry={onRetry} />
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

function PublicLanding({
  authNotice,
  authView,
  onShowLogin,
  onShowSignup,
  onAuthSuccess,
}: {
  authNotice: boolean;
  authView: 'login' | 'signup';
  onShowLogin: () => void;
  onShowSignup: () => void;
  onAuthSuccess: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar />

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
              <div className={styles.statPill}>{t('marketing.stat_bilingual')}</div>
              <div className={styles.statPill}>{t('marketing.stat_hijri')}</div>
              <div className={styles.statPill}>{t('marketing.stat_privacy')}</div>
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
              <p className={styles.authKicker}>{t('marketing.panel_kicker')}</p>
              <h2 className={styles.authPanelTitle}>
                {authView === 'login' ? t('auth.login') : t('auth.sign_up')}
              </h2>
              <p className={styles.authPanelText}>{t('marketing.panel_text')}</p>
              {authNotice ? <p className={styles.authNotice}>{t('auth.session_expired')}</p> : null}
            </div>

            <Suspense fallback={<LoadingScreen />}>
              {authView === 'login' ? (
                <LoginForm onSuccess={onAuthSuccess} onSwitchToSignup={onShowSignup} />
              ) : (
                <SignupForm onSuccess={onAuthSuccess} onSwitchToLogin={onShowLogin} />
              )}
            </Suspense>
          </section>
        </div>

        <footer className={styles.publicFooter}>
          <Link to="/privacy" className={styles.publicFooterLink}>
            {t('privacy.nav_link')}
          </Link>
        </footer>
      </div>
    </div>
  );
}

function PublicLearnPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar />

        <section className={styles.learnHero}>
          <div className={styles.learnHeroCopy}>
            <span className={styles.heroBadge}>{t('marketing.badge')}</span>
            <h1 className={styles.learnTitle}>{t('learn.title')}</h1>
            <p className={styles.learnSubtitle}>{t('learn.subtitle')}</p>
          </div>

          <aside className={styles.learnCtaCard}>
            <p className={styles.learnCtaKicker}>{t('marketing.panel_kicker')}</p>
            <h2 className={styles.learnCtaTitle}>{t('marketing.learn_panel_title')}</h2>
            <p className={styles.learnCtaText}>{t('marketing.learn_panel_body')}</p>
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
          <Suspense fallback={<LoadingScreen />}>
            <LearnPage showHeading={false} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

function PublicDemoPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar />

        <section className={styles.learnHero}>
          <div className={styles.learnHeroCopy}>
            <span className={styles.heroBadge}>{t('demo.badge')}</span>
            <h1 className={styles.learnTitle}>{t('demo.public_title')}</h1>
            <p className={styles.learnSubtitle}>{t('demo.public_subtitle')}</p>
          </div>

          <aside className={styles.learnCtaCard}>
            <p className={styles.learnCtaKicker}>{t('marketing.panel_kicker')}</p>
            <h2 className={styles.learnCtaTitle}>{t('demo.public_panel_title')}</h2>
            <p className={styles.learnCtaText}>{t('demo.public_panel_body')}</p>
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
          <Suspense fallback={<LoadingScreen />}>
            <DemoPage showHeading={false} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

function PublicAboutPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.authScreen}>
      <div className={styles.publicFrame}>
        <PublicTopBar />

        <section className={styles.learnHero}>
          <div className={styles.learnHeroCopy}>
            <span className={styles.heroBadge}>{t('about.project_badge')}</span>
            <h1 className={styles.learnTitle}>{t('about.project_title')}</h1>
            <p className={styles.learnSubtitle}>{t('about.project_subtitle')}</p>
          </div>

          <aside className={styles.learnCtaCard}>
            <p className={styles.learnCtaKicker}>{t('marketing.panel_kicker')}</p>
            <h2 className={styles.learnCtaTitle}>{t('marketing.learn_panel_title')}</h2>
            <p className={styles.learnCtaText}>{t('marketing.learn_panel_body')}</p>
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
          <Suspense fallback={<LoadingScreen />}>
            <AboutPage />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { error, isComplete, isError, isLoading } = useOnboardingStatus();
  const queryClient = useQueryClient();
  useLanguage(); // ensure language is initialised

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <ProfileLoadError
        message={error instanceof Error ? error.message : 'Please try again in a moment.'}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
        }}
      />
    );
  }

  if (!isComplete) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OnboardingWizard
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/salah" element={<SalahPage />} />
          <Route path="/sawm" element={<SawmPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Suspense>
  );
}

function App() {
  const { isAuthenticated, loading, authNotice, checkUser } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  // Bootstrap theme from localStorage / system preference on first render
  useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <AuthenticatedApp />
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <PublicLanding
                authNotice={!!authNotice}
                authView={authView}
                onShowLogin={() => setAuthView('login')}
                onShowSignup={() => setAuthView('signup')}
                onAuthSuccess={checkUser}
              />
            }
          />
          <Route
            path="/learn"
            element={
              <PublicLearnPage
                onShowLogin={() => setAuthView('login')}
                onShowSignup={() => setAuthView('signup')}
              />
            }
          />
          <Route
            path="/demo"
            element={
              <PublicDemoPage
                onShowLogin={() => setAuthView('login')}
                onShowSignup={() => setAuthView('signup')}
              />
            }
          />
          <Route
            path="/about"
            element={
              <PublicAboutPage
                onShowLogin={() => setAuthView('login')}
                onShowSignup={() => setAuthView('signup')}
              />
            }
          />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
