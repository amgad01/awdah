import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api, type FastLogResponse, type HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

export function invalidateSawmQueries(queryClient: QueryClient, date?: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix });
  if (date) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(date) });
}

export async function fetchFastHistoryPage(
  startDate: string,
  endDate: string,
  cursor?: string,
): Promise<HistoryPageResponse<FastLogResponse>> {
  return (
    (await api.sawm.getHistoryPage({
      startDate,
      endDate,
      limit: HISTORY_PAGE_SIZE,
      cursor,
    })) ?? { items: [], hasMore: false }
  );
}

export const useSawmDebt = () => {
  return useQuery({
    queryKey: QUERY_KEYS.sawmDebt,
    queryFn: () => api.sawm.getDebt(),
  });
};

export const useLogFast = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: api.sawm.logFast,
    onSuccess: (_data, variables) => {
      invalidateSawmQueries(queryClient, variables.date);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
};

export const useDeleteFast = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: api.sawm.deleteLog,
    onSuccess: (_data, variables) => {
      invalidateSawmQueries(queryClient, variables.date);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
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

export const useInfiniteSawmHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteQuery<
    HistoryPageResponse<FastLogResponse>,
    Error,
    InfiniteData<HistoryPageResponse<FastLogResponse>, string | undefined>,
    ReturnType<typeof QUERY_KEYS.sawmHistoryPage>,
    string | undefined
  >({
    queryKey: QUERY_KEYS.sawmHistoryPage(startDate, endDate, HISTORY_PAGE_SIZE),
    queryFn: ({ pageParam }) => fetchFastHistoryPage(startDate, endDate, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!startDate && !!endDate,
  });
};

export const useResetFastLogs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: api.sawm.resetLogs,
    onSuccess: () => {
      invalidateSawmQueries(queryClient);
      toast.success(t('settings.reset_done'));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
};
