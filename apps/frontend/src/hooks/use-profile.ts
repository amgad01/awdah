import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { QUERY_KEYS } from '@/lib/query-keys';
import { PROFILE_STALE_TIME_MS } from '@/lib/constants';
import { waitForLifecycleJob } from '@/lib/user-lifecycle-jobs';

function invalidatePeriodRelatedQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
}

export const useProfile = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.userProfile,
    queryFn: () => api.user.getProfile(),
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
  return useMutation({
    mutationFn: (data: {
      username?: string;
      bulughDate: string;
      gender: string;
      dateOfBirth?: string;
      revertDate?: string;
    }) => api.user.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
    },
  });
};

export const usePracticingPeriods = () => {
  return useQuery({
    queryKey: QUERY_KEYS.practicingPeriods,
    queryFn: () => api.salah.getPeriods(),
    retry: false,
  });
};

export const useAddPracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { startDate: string; endDate?: string; type: string }) =>
      api.salah.addPeriod(data),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useUpdatePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { periodId: string; startDate: string; endDate?: string; type: string }) =>
      api.salah.updatePeriod(data),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useDeletePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) => api.salah.deletePeriod(periodId),
    onSuccess: () => {
      invalidatePeriodRelatedQueries(queryClient);
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: async () => {
      const started = await api.user.startDeleteAccount();
      const job = started?.job;

      if (!job) {
        throw new Error('Account deletion could not be started.');
      }

      await waitForLifecycleJob(job.jobId, 'delete-account');
      return api.user.finalizeDeleteAccount(job.jobId);
    },
  });
};

export const useExportData = () => {
  return useMutation({
    mutationFn: async () => {
      const started = await api.user.startExportData();
      const job = started?.job;

      if (!job) {
        throw new Error('Data export could not be started.');
      }

      await waitForLifecycleJob(job.jobId, 'export');
      return api.user.downloadExportData(job.jobId);
    },
    onSuccess: (response) => {
      if (!response?.data) return;
      const dataBlob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const objectUrl = URL.createObjectURL(dataBlob);
      const exportFileDefaultName =
        response.fileName || `awdah-data-export-${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', objectUrl);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
};
