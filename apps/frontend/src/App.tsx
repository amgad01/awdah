import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { PublicPageShell } from '@/components/public-page-shell/public-page-shell';
import { PublicLanding } from '@/components/public-landing/public-landing';
import { AuthenticatedApp } from '@/components/authenticated-app/authenticated-app';
import { resolveRouterBase } from '@/lib/router-base';
import { Loader2 } from 'lucide-react';
import styles from './App.module.css';

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
const ForgotPasswordForm = lazy(() =>
  import('@/features/auth/forgot-password-form').then((module) => ({
    default: module.ForgotPasswordForm,
  })),
);
const ContributingPage = lazy(() =>
  import('@/features/contributing/contributing-page').then((module) => ({
    default: module.ContributingPage,
  })),
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

function PublicLearnPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <PublicPageShell
      badge={t('marketing.badge')}
      title={t('learn.title')}
      subtitle={t('learn.subtitle')}
      ctaTitle={t('marketing.learn_panel_title')}
      ctaText={t('marketing.learn_panel_body')}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      <LearnPage showHeading={false} />
    </PublicPageShell>
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
    <PublicPageShell
      title={t('demo.public_title')}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      <DemoPage showHeading={false} />
    </PublicPageShell>
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
    <PublicPageShell
      badge={t('about.project_badge')}
      title={t('about.project_title')}
      subtitle={t('about.project_subtitle')}
      ctaTitle={t('marketing.learn_panel_title')}
      ctaText={t('marketing.learn_panel_body')}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      <AboutPage />
    </PublicPageShell>
  );
}

function PublicContributingPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <PublicPageShell
      badge={t('contributing.project_badge')}
      title={t('contributing.project_title')}
      subtitle={t('contributing.project_subtitle')}
      ctaTitle={t('marketing.learn_panel_title')}
      ctaText={t('marketing.learn_panel_body')}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      <ContributingPage />
    </PublicPageShell>
  );
}

function PublicPrivacyPage({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const { t } = useLanguage();

  return (
    <PublicPageShell
      badge={t('privacy.nav_link')}
      title={t('privacy.title')}
      subtitle={t('privacy.intro_body')}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      <PrivacyPage embedded />
    </PublicPageShell>
  );
}

/**
 * The unauthenticated shell follows the auth query string so buttons and direct links
 * always reopen the requested form, even after the user navigates elsewhere.
 */
function UnauthenticatedRoutes({
  authNotice,
  checkUser,
}: {
  authNotice: boolean;
  checkUser: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const authView = (() => {
    const next = new URLSearchParams(location.search).get('auth');
    return next === 'login' || next === 'signup' || next === 'forgot' ? next : 'login';
  })();

  const showLogin = () => navigate('/?auth=login');
  const showSignup = () => navigate('/?auth=signup');
  const showForgot = () => navigate('/?auth=forgot');

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicLanding
              authNotice={authNotice}
              authView={authView}
              onShowLogin={showLogin}
              onShowSignup={showSignup}
              onShowForgot={showForgot}
              onAuthSuccess={checkUser}
              LoginForm={LoginForm}
              SignupForm={SignupForm}
              ForgotPasswordForm={ForgotPasswordForm}
            />
          }
        />
        <Route
          path="/learn"
          element={<PublicLearnPage onShowLogin={showLogin} onShowSignup={showSignup} />}
        />
        <Route
          path="/demo"
          element={<PublicDemoPage onShowLogin={showLogin} onShowSignup={showSignup} />}
        />
        <Route
          path="/about"
          element={<PublicAboutPage onShowLogin={showLogin} onShowSignup={showSignup} />}
        />
        <Route
          path="/contribute"
          element={<PublicContributingPage onShowLogin={showLogin} onShowSignup={showSignup} />}
        />
        <Route
          path="/privacy"
          element={<PublicPrivacyPage onShowLogin={showLogin} onShowSignup={showSignup} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const { user, isAuthenticated, loading, authNotice, checkUser } = useAuth();
  const runtimeBase = resolveRouterBase({
    configuredBasePath: import.meta.env.BASE_URL,
    currentPathname: typeof window === 'undefined' ? '/' : window.location.pathname,
  });
  useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter basename={runtimeBase}>
      {isAuthenticated ? (
        <AuthenticatedApp key={user?.userId ?? 'authenticated'} />
      ) : (
        <UnauthenticatedRoutes authNotice={!!authNotice} checkUser={checkUser} />
      )}
    </BrowserRouter>
  );
}

export default App;
