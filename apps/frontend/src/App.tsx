import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useOnboardingStatus } from '@/hooks/use-profile';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Dashboard } from '@/features/dashboard/dashboard';
import { SalahPage } from '@/features/salah/salah-page';
import { SawmPage } from '@/features/sawm/sawm-page';
import { HistoryPage } from '@/features/history/history-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { Layout } from '@/components/layout/layout';
import { LoginForm } from '@/features/auth/login-form';
import { SignupForm } from '@/features/auth/signup-form';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';
import { NotFound } from '@/components/not-found/not-found';
import { Loader2 } from 'lucide-react';
import styles from './App.module.css';

function AuthenticatedApp() {
  const { isComplete, isLoading } = useOnboardingStatus();
  const queryClient = useQueryClient();
  useLanguage(); // ensure language is initialised

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
      </div>
    );
  }

  if (!isComplete) {
    return (
      <OnboardingWizard
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/salah" element={<SalahPage />} />
          <Route path="/sawm" element={<SawmPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function App() {
  const { t } = useLanguage();
  const { isAuthenticated, loading, checkUser } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.authScreen}>
        <div className={styles.authBranding}>
          <h1 className={styles.authTitle}>{t('common.app_name')}</h1>
          <p className={styles.authSubtitle}>{t('common.slogan')}</p>
        </div>

        {authView === 'login' ? (
          <LoginForm onSuccess={checkUser} onSwitchToSignup={() => setAuthView('signup')} />
        ) : (
          <SignupForm onSuccess={checkUser} onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return <AuthenticatedApp />;
}

export default App;
