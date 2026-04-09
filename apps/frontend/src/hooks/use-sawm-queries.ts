import { useQuery } from '@tanstack/react-query';
import type { FastLogResponse, HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useProfile } from '@/hooks/use-profile';
import { invalidateSawmQueries } from '@/utils/query-invalidation';
import { sawmRepository } from '@/domains/sawm/sawm-repository';
import {
  useDailyHistoryQuery,
  useInfiniteHistoryQuery,
  useLifecycleResetMutation,
  useRangeHistoryQuery,
  useWorshipLogMutation,
} from './worship-query-helpers';

export { invalidateSawmQueries } from '@/utils/query-invalidation';

export async function fetchFastHistoryPage(
  startDate: string,
  endDate: string,
  cursor?: string,
): Promise<HistoryPageResponse<FastLogResponse>> {
  return (
    (await sawmRepository.getHistoryPage({
      startDate,
      endDate,
      limit: HISTORY_PAGE_SIZE,
      cursor,
    })) ?? { items: [], hasMore: false }
  );
}

export const useSawmDebt = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: QUERY_KEYS.sawmDebt,
    queryFn: () => sawmRepository.getDebt(),
    enabled: !!profile?.bulughDate,
  });
};

export const useLogFast = () => {
  return useWorshipLogMutation(sawmRepository.logFast, (queryClient, variables) => {
    invalidateSawmQueries(queryClient, variables.date);
  });
};

export const useDeleteFast = () => {
  return useWorshipLogMutation(sawmRepository.deleteFastLog, (queryClient, variables) => {
    invalidateSawmQueries(queryClient, variables.date);
  });
};

export const useDailySawmLog = (date: string) => {
  return useDailyHistoryQuery(QUERY_KEYS.sawmDailyLog(date), sawmRepository.getHistory, date);
};

export const useSawmHistory = (startDate: string, endDate: string) => {
  return useRangeHistoryQuery(
    QUERY_KEYS.sawmHistory(startDate, endDate),
    sawmRepository.getHistory,
    startDate,
    endDate,
  );
};

export const useInfiniteSawmHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteHistoryQuery<FastLogResponse>(
    QUERY_KEYS.sawmHistoryPage(startDate, endDate, HISTORY_PAGE_SIZE),
    (pageParam) => fetchFastHistoryPage(startDate, endDate, pageParam),
    enabled && !!startDate && !!endDate,
  );
};

export const useResetFastLogs = () => {
  return useLifecycleResetMutation(
    sawmRepository.resetLogs,
    'reset-fasts',
    invalidateSawmQueries,
    'settings.reset_done',
  );
};
