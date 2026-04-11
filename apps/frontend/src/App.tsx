import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
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

type AuthView = 'forgot' | 'login' | 'signup';

interface PublicShellRouteDefinition {
  path: string;
  badgeKey?: string;
  titleKey: string;
  subtitleKey?: string;
  ctaTitleKey?: string;
  ctaTextKey?: string;
  renderContent: () => ReactNode;
}

interface PublicShellRouteProps {
  config: PublicShellRouteDefinition;
  onShowLogin: () => void;
  onShowSignup: () => void;
}

const PUBLIC_SHELL_ROUTES: PublicShellRouteDefinition[] = [
  {
    path: '/learn',
    badgeKey: 'marketing.badge',
    titleKey: 'learn.title',
    subtitleKey: 'learn.subtitle',
    ctaTitleKey: 'marketing.learn_panel_title',
    ctaTextKey: 'marketing.learn_panel_body',
    renderContent: () => <LearnPage showHeading={false} />,
  },
  {
    path: '/demo',
    titleKey: 'demo.public_title',
    renderContent: () => <DemoPage showHeading={false} />,
  },
  {
    path: '/about',
    badgeKey: 'about.project_badge',
    titleKey: 'about.project_title',
    subtitleKey: 'about.project_subtitle',
    ctaTitleKey: 'marketing.learn_panel_title',
    ctaTextKey: 'marketing.learn_panel_body',
    renderContent: () => <AboutPage />,
  },
  {
    path: '/contribute',
    badgeKey: 'contributing.project_badge',
    titleKey: 'contributing.project_title',
    subtitleKey: 'contributing.project_subtitle',
    ctaTitleKey: 'marketing.learn_panel_title',
    ctaTextKey: 'marketing.learn_panel_body',
    renderContent: () => <ContributingPage />,
  },
  {
    path: '/privacy',
    badgeKey: 'privacy.nav_link',
    titleKey: 'privacy.title',
    subtitleKey: 'privacy.intro_body',
    renderContent: () => <PrivacyPage embedded />,
  },
];

function resolveAuthView(search: string): AuthView {
  const next = new URLSearchParams(search).get('auth');
  return next === 'login' || next === 'signup' || next === 'forgot' ? next : 'login';
}

function buildAuthPath(view: AuthView): string {
  return `/?auth=${view}`;
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
    </div>
  );
}

function PublicShellRoute({ config, onShowLogin, onShowSignup }: PublicShellRouteProps) {
  const { t } = useLanguage();

  return (
    <PublicPageShell
      badge={config.badgeKey ? t(config.badgeKey) : undefined}
      title={t(config.titleKey)}
      subtitle={config.subtitleKey ? t(config.subtitleKey) : undefined}
      ctaTitle={config.ctaTitleKey ? t(config.ctaTitleKey) : undefined}
      ctaText={config.ctaTextKey ? t(config.ctaTextKey) : undefined}
      onShowLogin={onShowLogin}
      onShowSignup={onShowSignup}
    >
      {config.renderContent()}
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
  const authView = resolveAuthView(location.search);
  const showLogin = () => navigate(buildAuthPath('login'));
  const showSignup = () => navigate(buildAuthPath('signup'));
  const showForgot = () => navigate(buildAuthPath('forgot'));

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
        {PUBLIC_SHELL_ROUTES.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={
              <PublicShellRoute config={config} onShowLogin={showLogin} onShowSignup={showSignup} />
            }
          />
        ))}
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
