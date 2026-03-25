import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { PublicPageShell } from '@/components/public-page-shell/public-page-shell';
import { PublicLanding } from '@/components/public-landing/public-landing';
import { AuthenticatedApp } from '@/components/authenticated-app/authenticated-app';
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
      badge={t('demo.badge')}
      title={t('demo.public_title')}
      subtitle={t('demo.public_subtitle')}
      ctaTitle={t('demo.public_panel_title')}
      ctaText={t('demo.public_panel_body')}
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

function App() {
  const { isAuthenticated, loading, authNotice, checkUser } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <AuthenticatedApp />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
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
                  LoginForm={LoginForm}
                  SignupForm={SignupForm}
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
        </Suspense>
      )}
    </BrowserRouter>
  );
}

export default App;
