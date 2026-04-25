import { useQuery } from '@tanstack/react-query';
import type { FastLogResponse, HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useProfile } from '@/hooks/use-profile';
import {
  updateSawmDebtCache,
  markSawmHistoryStale,
  appendSawmDailyLog,
  removeSawmDailyLog,
  removeSawmQueries,
} from '@/utils/query-invalidation';
import { sawmRepository } from '@/domains/sawm/sawm-repository';
import { ERROR_CODES } from '@awdah/shared';
import {
  useDailyHistoryQuery,
  useInfiniteHistoryQuery,
  useLifecycleResetMutation,
  useRangeHistoryQuery,
  useWorshipLogMutation,
  isQadaaLogType,
  createOptimisticEventId,
} from './worship-query-helpers';

export { invalidateSawmQueries } from '@/utils/query-invalidation';

export async function fetchFastHistoryPage(
  startDate: string,
  endDate: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<HistoryPageResponse<FastLogResponse>> {
  return (
    (await sawmRepository.getHistoryPage(
      {
        startDate,
        endDate,
        limit: HISTORY_PAGE_SIZE,
        cursor,
      },
      signal,
    )) ?? { items: [], hasMore: false }
  );
}

export const useSawmDebt = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: QUERY_KEYS.sawmDebt,
    queryFn: ({ signal }) => sawmRepository.getDebt(signal),
    enabled: !!profile?.bulughDate,
  });
};

export const useLogFast = () => {
  return useWorshipLogMutation(sawmRepository.logFast, (queryClient, variables) => {
    if (isQadaaLogType(variables.type)) {
      updateSawmDebtCache(queryClient, 1);
    }
    appendSawmDailyLog(queryClient, variables.date, {
      eventId: createOptimisticEventId(),
      date: variables.date,
      type: variables.type,
      loggedAt: new Date().toISOString(),
    });
    markSawmHistoryStale(queryClient);
  });
};

export const useDeleteFast = () => {
  return useWorshipLogMutation(sawmRepository.deleteFastLog, (queryClient, variables) => {
    if (isQadaaLogType(variables.type)) {
      updateSawmDebtCache(queryClient, -1);
    }
    removeSawmDailyLog(queryClient, variables.date, variables.eventId);
    markSawmHistoryStale(queryClient);
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
    (pageParam, signal) => fetchFastHistoryPage(startDate, endDate, pageParam, signal),
    enabled && !!startDate && !!endDate,
  );
};

export const useResetFastLogs = () => {
  return useLifecycleResetMutation(
    sawmRepository.resetLogs,
    'reset-fasts',
    removeSawmQueries,
    'settings.reset_done',
    {
      cooldownAction: 'fasts',
      noLogsMessageKey: ERROR_CODES.RESET_FASTS_NO_RECORDS,
      rateLimitedMessageKey: ERROR_CODES.RESET_FASTS_RATE_LIMITED,
    },
  );
};
