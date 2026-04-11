import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { QUERY_KEYS } from '@/lib/query-keys';
import { PROFILE_STALE_TIME_MS } from '@/lib/constants';
import type {
  CreatePracticingPeriodInput,
  UpdatePracticingPeriodInput,
} from '@/domains/salah/salah-repository';
import type { UpdateUserProfileInput } from '@/domains/user/user-repository';
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

export const useExportData = () => {
  return useMutation({
    mutationFn: async () => {
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
      if (!response?.data) return;
      const dataBlob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(dataBlob);
        const exportFileDefaultName =
          response.fileName || `awdah-data-export-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', objectUrl);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
  });
};
