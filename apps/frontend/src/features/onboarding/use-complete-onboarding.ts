import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from './onboarding-completion.service';
import type { OnboardingData } from './onboarding-data';
import type { PracticingPeriodResponse } from '@/lib/api';
import {
  invalidateAllWorshipQueries,
  invalidatePracticingPeriods,
} from '@/utils/query-invalidation';

interface CompleteOnboardingInput {
  data: OnboardingData;
  persistedPeriods: PracticingPeriodResponse[];
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, persistedPeriods }: CompleteOnboardingInput) =>
      completeOnboarding(data, persistedPeriods),
    onSuccess: async () => {
      await invalidatePracticingPeriods(queryClient);
      await invalidateAllWorshipQueries(queryClient);
    },
  });
}
