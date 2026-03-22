import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { PROFILE_STALE_TIME_MS } from '@/lib/constants';

export const useProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.userProfile,
    queryFn: () => api.user.getProfile(),
    retry: false,
    staleTime: PROFILE_STALE_TIME_MS,
  });
};

export const useOnboardingStatus = () => {
  const { data, isLoading, isError } = useProfile();
  return {
    isLoading,
    // Onboarding is complete when the profile exists and has a bulughDate
    isComplete: !isLoading && !isError && data != null && !!data.bulughDate,
  };
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { bulughDate: string; gender: string; dateOfBirth?: string }) =>
      api.user.updateProfile(data),
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
    },
  });
};

export const useDeletePracticingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) => api.salah.deletePeriod(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: () => api.user.deleteAccount(),
  });
};

export const useExportData = () => {
  return useMutation({
    mutationFn: () => api.user.exportData(),
    onSuccess: (response) => {
      if (!response?.data) return;
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `awdah-data-export-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    },
  });
};
