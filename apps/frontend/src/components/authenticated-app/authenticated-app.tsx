import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useOnboardingStatus } from '@/hooks/use-profile';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { QUERY_KEYS } from '@/lib/query-keys';
import { readOnboardingSkipped, writeOnboardingSkipped } from '@/lib/onboarding-state';
import { Loader2 } from 'lucide-react';
import styles from '../../App.module.css';

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
const ContributingPage = lazy(() =>
  import('@/features/contributing/contributing-page').then((module) => ({
    default: module.ContributingPage,
  })),
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

export const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();
  const { data: profile, error, isComplete, isError, isLoading } = useOnboardingStatus();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  useLanguage();
  const initialSkip = useMemo(() => readOnboardingSkipped(user?.userId), [user?.userId]);
  const [isOnboardingSkipped, setIsOnboardingSkipped] = useState(initialSkip);
  const showOnboardingRoute = location.pathname === '/onboarding';
  const needsSetup = !profile?.dateOfBirth || !profile?.bulughDate;

  useEffect(() => {
    setIsOnboardingSkipped(initialSkip);
  }, [initialSkip]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    writeOnboardingSkipped(user?.userId, false);
    setIsOnboardingSkipped(false);
  }, [isComplete, user?.userId]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <div className={styles.statusScreen}>
        <ErrorState
          message={error instanceof Error ? error.message : 'Please try again in a moment.'}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
          }}
        />
      </div>
    );
  }

  if ((!isComplete && !isOnboardingSkipped) || showOnboardingRoute) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OnboardingWizard
          onComplete={() => {
            writeOnboardingSkipped(user?.userId, false);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods });
            if (showOnboardingRoute) {
              navigate('/', { replace: true });
            }
          }}
          onSkip={() => {
            if (!isComplete) {
              writeOnboardingSkipped(user?.userId, true);
              setIsOnboardingSkipped(true);
            }
            if (showOnboardingRoute) {
              navigate('/', { replace: true });
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Layout showSetupReminder={needsSetup}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/salah" element={<SalahPage />} />
          <Route path="/sawm" element={<SawmPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contribute" element={<ContributingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Suspense>
  );
};
