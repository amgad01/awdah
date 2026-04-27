import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError, type ExportDownloadResponse } from '@/lib/api';
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
  invalidateAllWorshipQueries,
  updateProfileCache,
  updatePeriodsCache,
} from '@/utils/query-invalidation';
import { salahRepository } from '@/domains/salah/salah-repository';
import { userRepository } from '@/domains/user/user-repository';
import { createRateLimitError, shouldSuppressToast } from '@/utils/lifecycle-errors';
import { resolveApiErrorKey } from '@/lib/api-error-codes';
import { ERROR_CODES } from '@awdah/shared';

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
    isComplete: !isLoading && !isError && data != null && !!data.bulughDate,
  };
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, UpdateUserProfileInput>({
    mutationFn: (data) => userRepository.updateProfile(data),
    onSuccess: (_result, variables) => {
      updateProfileCache(queryClient, variables);
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
    onSuccess: (_result, variables) => {
      updatePeriodsCache(queryClient, { action: 'add', period: variables });
      invalidateAllWorshipQueries(queryClient);
    },
  });
};

export const useUpdatePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, UpdatePracticingPeriodInput>({
    mutationFn: (data) => salahRepository.updatePracticingPeriod(data),
    onSuccess: (_result, variables) => {
      updatePeriodsCache(queryClient, { action: 'update', period: variables });
      invalidateAllWorshipQueries(queryClient);
    },
  });
};

export const useDeletePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) => salahRepository.deletePracticingPeriod(periodId),
    onSuccess: (_result, periodId) => {
      updatePeriodsCache(queryClient, { action: 'delete', periodId });
      invalidateAllWorshipQueries(queryClient);
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: deleteUserAccountWorkflow,
  });
};

const EXPORT_DOWNLOAD_MAX_RETRIES = 3;
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
    mutationFn: async (): Promise<ExportDownloadResponse | null> => {
      if (!cooldown.checkBeforeRequest()) {
        throw createRateLimitError('export', cooldown.secondsRemaining);
      }

      const jobId = await prepareUserDataExportWorkflow();

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= EXPORT_DOWNLOAD_MAX_RETRIES; attempt++) {
        try {
          return await userRepository.downloadExportData(jobId);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const is404 = err instanceof ApiRequestError && err.status === 404;
          if (is404 && attempt < EXPORT_DOWNLOAD_MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, EXPORT_DOWNLOAD_RETRY_DELAY_MS));
            continue;
          }
          throw lastError;
        }
      }
      throw lastError ?? new Error(ERROR_CODES.EXPORT_DOWNLOAD_FAILED);
    },
    onSuccess: (response) => {
      cooldown.recordAttempt();

      if (!response?.data) return;
      const dataBlob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      let objectUrl: string | null = null;
      let linkElement: HTMLAnchorElement | null = null;
      try {
        objectUrl = URL.createObjectURL(dataBlob);
        const rawPrefix = user?.username || user?.email || 'user';
        const sanitizedPrefix = rawPrefix.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 50);
        const datePart = new Date().toISOString().split('T')[0];
        const exportFileName = `awdah-data-export-${sanitizedPrefix}-${datePart}.json`;
        linkElement = document.createElement('a');
        linkElement.setAttribute('href', objectUrl);
        linkElement.setAttribute('download', exportFileName);
        document.body.appendChild(linkElement);
        linkElement.click();
      } finally {
        if (linkElement && linkElement.parentNode) {
          linkElement.parentNode.removeChild(linkElement);
        }
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }

      toast.success(t('settings.export_success'));
    },
    onError: (err) => {
      if (!shouldSuppressToast(err)) {
        const key = resolveApiErrorKey(err, 'common.error');
        toast.error(t(key));
      }
    },
  });
};
