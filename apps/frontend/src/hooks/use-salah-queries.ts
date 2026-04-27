import { useQuery } from '@tanstack/react-query';
import type { PrayerLogResponse, HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useProfile } from '@/hooks/use-profile';
import {
  updateSalahDebtCache,
  markSalahHistoryStale,
  appendSalahDailyLog,
  removeSalahDailyLog,
  removeSalahQueries,
} from '@/utils/query-invalidation';
import { salahRepository } from '@/domains/salah/salah-repository';
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

export { invalidateSalahQueries } from '@/utils/query-invalidation';

export async function fetchPrayerHistoryPage(
  startDate: string,
  endDate: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<HistoryPageResponse<PrayerLogResponse>> {
  return (
    (await salahRepository.getHistoryPage(
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

export const useSalahDebt = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: QUERY_KEYS.salahDebt,
    queryFn: ({ signal }) => salahRepository.getDebt(signal),
    enabled: !!profile?.bulughDate,
  });
};

export const useLogPrayer = () => {
  return useWorshipLogMutation(salahRepository.logPrayer, (queryClient, variables) => {
    if (isQadaaLogType(variables.type)) {
      updateSalahDebtCache(queryClient, variables.prayerName, 1);
    }
    appendSalahDailyLog(queryClient, variables.date, {
      eventId: createOptimisticEventId(),
      date: variables.date,
      prayerName: variables.prayerName,
      type: variables.type,
      action: 'prayed',
      loggedAt: new Date().toISOString(),
    });
    markSalahHistoryStale(queryClient);
  });
};

export const useDeletePrayer = () => {
  return useWorshipLogMutation(salahRepository.deletePrayerLog, (queryClient, variables) => {
    if (isQadaaLogType(variables.type)) {
      updateSalahDebtCache(queryClient, variables.prayerName, -1);
    }
    removeSalahDailyLog(queryClient, variables.date, variables.prayerName, variables.type);
    markSalahHistoryStale(queryClient);
  });
};

export const useDailyPrayerLogs = (date: string) => {
  return useDailyHistoryQuery(QUERY_KEYS.salahDailyLogs(date), salahRepository.getHistory, date);
};

export const useSalahHistory = (startDate: string, endDate: string) => {
  return useRangeHistoryQuery(
    QUERY_KEYS.salahHistory(startDate, endDate),
    salahRepository.getHistory,
    startDate,
    endDate,
  );
};

export const useInfiniteSalahHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteHistoryQuery<PrayerLogResponse>(
    QUERY_KEYS.salahHistoryPage(startDate, endDate, HISTORY_PAGE_SIZE),
    (pageParam, signal) => fetchPrayerHistoryPage(startDate, endDate, pageParam, signal),
    enabled && !!startDate && !!endDate,
  );
};

export const useResetPrayerLogs = () => {
  return useLifecycleResetMutation(
    salahRepository.resetLogs,
    'reset-prayers',
    removeSalahQueries,
    'settings.reset_done',
    {
      cooldownAction: 'prayers',
      noLogsMessageKey: ERROR_CODES.RESET_PRAYERS_NO_RECORDS,
      rateLimitedMessageKey: ERROR_CODES.RESET_PRAYERS_RATE_LIMITED,
    },
  );
};
