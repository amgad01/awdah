import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';

export const useSalahDebt = () => {
  return useQuery({
    queryKey: QUERY_KEYS.salahDebt,
    queryFn: () => api.salah.getDebt(),
  });
};

export const useLogPrayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.salah.logPrayer,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(variables.date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix });
    },
  });
};

export const useDeletePrayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.salah.deleteLog,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(variables.date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix });
    },
  });
};

export const useDailyPrayerLogs = (date: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.salahDailyLogs(date),
    queryFn: () => api.salah.getHistory({ startDate: date, endDate: date }),
  });
};

export const useSalahHistory = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.salahHistory(startDate, endDate),
    queryFn: () => api.salah.getHistory({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });
};

export const useSawmDebt = () => {
  return useQuery({
    queryKey: QUERY_KEYS.sawmDebt,
    queryFn: () => api.sawm.getDebt(),
  });
};

export const useLogFast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sawm.logFast,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(variables.date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix });
    },
  });
};

export const useDeleteFast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sawm.deleteLog,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(variables.date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix });
    },
  });
};

export const useDailySawmLog = (date: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.sawmDailyLog(date),
    queryFn: () => api.sawm.getHistory({ startDate: date, endDate: date }),
  });
};

export const useSawmHistory = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.sawmHistory(startDate, endDate),
    queryFn: () => api.sawm.getHistory({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });
};

export const useWorship = () => {
  const salahQuery = useSalahDebt();
  const sawmQuery = useSawmDebt();

  return {
    salahDebt: salahQuery.data,
    sawmDebt: sawmQuery.data,
    loading: salahQuery.isLoading || sawmQuery.isLoading,
    error: salahQuery.error || sawmQuery.error,
  };
};
