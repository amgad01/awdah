import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { QUERY_KEYS } from '@/lib/query-keys';
import { PROFILE_STALE_TIME_MS } from '@/lib/constants';
import type {
  CreatePracticingPeriodInput,
  UpdatePracticingPeriodInput,
} from '@/domains/salah/salah-repository';
import type { UpdateUserProfileInput } from '@/domains/user/user-repository';
import type { CooldownController } from '@/types/cooldown.types';
import {
  deleteUserAccountWorkflow,
  prepareUserDataExportWorkflow,
} from '@/domains/user/user-lifecycle-service';
import {
  invalidateUserProfile,
  invalidatePracticingPeriods,
  invalidateAllWorshipQueries,
} from '@/utils/query-invalidation';
import { salahRepository } from '@/domains/salah/salah-repository';
import { userRepository } from '@/domains/user/user-repository';
import { createRateLimitError, shouldSuppressToast } from '@/utils/lifecycle-errors';

function invalidatePeriodRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  invalidatePracticingPeriods(queryClient);
  invalidateAllWorshipQueries(queryClient);
}

export const useProfile = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.userProfile,
    queryFn: ({ signal }) => userRepository.getProfile(signal),
    enabled: isAuthenticated,
    retry: false,
    staleTime: PROFILE_STALE_TIME_MS,
  });
};

export const useOnboardingStatus = () => {
  const { data, error, isLoading, isError } = useProfile();
  return {
    data,
    error,
    isLoading,
    isError,
    // Onboarding is complete when the profile exists and has a bulughDate
    isComplete: !isLoading && !isError && data != null && !!data.bulughDate,
  };
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, UpdateUserProfileInput>({
    mutationFn: (data) => userRepository.updateProfile(data),
    onSuccess: () => {
      invalidateUserProfile(queryClient);
      invalidateAllWorshipQueries(queryClient);
    },
  });
};

export const usePracticingPeriods = () => {
  return useQuery({
    queryKey: QUERY_KEYS.practicingPeriods,
    queryFn: ({ signal }) => salahRepository.getPracticingPeriods(signal),
    retry: false,
  });
};

export const useAddPracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, CreatePracticingPeriodInput>({
    mutationFn: (data) => salahRepository.addPracticingPeriod(data),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useUpdatePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, UpdatePracticingPeriodInput>({
    mutationFn: (data) => salahRepository.updatePracticingPeriod(data),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useDeletePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) => salahRepository.deletePracticingPeriod(periodId),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: deleteUserAccountWorkflow,
  });
};

const EXPORT_DOWNLOAD_RETRY_ATTEMPTS = 3;
const EXPORT_DOWNLOAD_RETRY_DELAY_MS = 1000;

interface ExportDataOptions {
  cooldown: Pick<CooldownController, 'checkBeforeRequest' | 'secondsRemaining' | 'recordAttempt'>;
}

export const useExportData = (options: ExportDataOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { cooldown } = options;

  return useMutation({
    mutationFn: async () => {
      // Check cooldown before sending request
      if (!cooldown.checkBeforeRequest()) {
        throw createRateLimitError('export', cooldown.secondsRemaining);
      }

      const jobId = await prepareUserDataExportWorkflow();

      // Retry download while artifact is still propagating (404s)
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= EXPORT_DOWNLOAD_RETRY_ATTEMPTS; attempt++) {
        try {
          return await userRepository.downloadExportData(jobId);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          // Only retry on 404 (artifact still propagating)
          const is404 = err instanceof ApiRequestError && err.status === 404;
          if (is404 && attempt < EXPORT_DOWNLOAD_RETRY_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, EXPORT_DOWNLOAD_RETRY_DELAY_MS));
            continue;
          }
          throw lastError;
        }
      }
      throw lastError ?? new Error('common.export_download_failed');
    },
    onSuccess: (response) => {
      // Record cooldown only after successful completion
      cooldown.recordAttempt();

      if (!response?.data) return;
      const dataBlob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(dataBlob);
        const rawPrefix = user?.username || user?.email || 'user';
        // Sanitize filename: replace non-alphanumeric chars (except ._-) with _, limit length
        const sanitizedPrefix = rawPrefix.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 50);
        const datePart = new Date().toISOString().split('T')[0];
        const exportFileName = `awdah-data-export-${sanitizedPrefix}-${datePart}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', objectUrl);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }

      toast.success(t('settings.export_success'));
    },
    onError: (err) => {
      // Skip toast for rate limiting - handled by UI (disabled button + countdown)
      if (!shouldSuppressToast(err)) {
        const message = err instanceof Error ? err.message : 'common.error';
        toast.error(t(message));
      }
    },
  });
};
