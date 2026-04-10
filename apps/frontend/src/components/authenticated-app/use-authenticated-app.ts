import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useOnboardingStatus } from '@/hooks/use-profile';
import { readOnboardingSkipped, writeOnboardingSkipped } from '@/lib/onboarding-state';
import { invalidatePracticingPeriods, invalidateUserProfile } from '@/utils/query-invalidation';

export function useAuthenticatedApp() {
  const { user } = useAuth();
  const { data: profile, error, isComplete, isError, isLoading } = useOnboardingStatus();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const initialSkip = useMemo(() => readOnboardingSkipped(user?.userId), [user?.userId]);
  const [isOnboardingSkipped, setIsOnboardingSkipped] = useState(initialSkip);

  const showOnboardingRoute = location.pathname === '/onboarding';
  const needsSetup = !profile?.dateOfBirth || !profile?.bulughDate;
  const shouldShowOnboarding = (!isComplete && !isOnboardingSkipped) || showOnboardingRoute;

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

  const handleOnboardingComplete = () => {
    writeOnboardingSkipped(user?.userId, false);
    void invalidateUserProfile(queryClient);
    void invalidatePracticingPeriods(queryClient);
    if (showOnboardingRoute) {
      navigate('/', { replace: true });
    }
  };

  const handleOnboardingSkip = () => {
    if (!isComplete) {
      writeOnboardingSkipped(user?.userId, true);
      setIsOnboardingSkipped(true);
    }

    if (showOnboardingRoute) {
      navigate('/', { replace: true });
    }
  };

  const retryProfileLoad = () => {
    void invalidateUserProfile(queryClient);
  };

  return {
    error,
    isError,
    isLoading,
    needsSetup,
    retryProfileLoad,
    shouldShowOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
  };
}
