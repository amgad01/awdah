import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api, type PrayerLogResponse, type HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { useProfile } from '@/hooks/use-profile';
import { waitForLifecycleJob } from '@/lib/user-lifecycle-jobs';

export function invalidateSalahQueries(queryClient: QueryClient, date?: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix });
  if (date) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(date) });
}

export async function fetchPrayerHistoryPage(
  startDate: string,
  endDate: string,
  cursor?: string,
): Promise<HistoryPageResponse<PrayerLogResponse>> {
  return (
    (await api.salah.getHistoryPage({
      startDate,
      endDate,
      limit: HISTORY_PAGE_SIZE,
      cursor,
    })) ?? { items: [], hasMore: false }
  );
}

export const useSalahDebt = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: QUERY_KEYS.salahDebt,
    queryFn: () => api.salah.getDebt(),
    enabled: !!profile?.bulughDate,
  });
};

export const useLogPrayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: api.salah.logPrayer,
    onSuccess: (_data, variables) => {
      invalidateSalahQueries(queryClient, variables.date);
      // Optional: tiny toast for confirmation? User said "where possible"
      // Maybe not too noisy for individual prayers, but errors definitely need it.
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
};

export const useDeletePrayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: api.salah.deleteLog,
    onSuccess: (_data, variables) => {
      invalidateSalahQueries(queryClient, variables.date);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
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

export const useInfiniteSalahHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteQuery<
    HistoryPageResponse<PrayerLogResponse>,
    Error,
    InfiniteData<HistoryPageResponse<PrayerLogResponse>, string | undefined>,
    ReturnType<typeof QUERY_KEYS.salahHistoryPage>,
    string | undefined
  >({
    queryKey: QUERY_KEYS.salahHistoryPage(startDate, endDate, HISTORY_PAGE_SIZE),
    queryFn: ({ pageParam }) => fetchPrayerHistoryPage(startDate, endDate, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!startDate && !!endDate,
  });
};

export const useResetPrayerLogs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async () => {
      const started = await api.salah.resetLogs();
      const job = started?.job;

      if (!job) {
        throw new Error('Prayer log reset could not be started.');
      }

      await waitForLifecycleJob(job.jobId, 'reset-prayers');
      return job;
    },
    onSuccess: () => {
      invalidateSalahQueries(queryClient);
      toast.success(t('settings.reset_done'));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
};
