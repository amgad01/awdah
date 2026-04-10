import { useQuery } from '@tanstack/react-query';
import type { PrayerLogResponse, HistoryPageResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { useProfile } from '@/hooks/use-profile';
import { invalidateSalahQueries } from '@/utils/query-invalidation';
import { salahRepository } from '@/domains/salah/salah-repository';
import {
  useDailyHistoryQuery,
  useInfiniteHistoryQuery,
  useLifecycleResetMutation,
  useRangeHistoryQuery,
  useWorshipLogMutation,
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
    invalidateSalahQueries(queryClient, variables.date);
  });
};

export const useDeletePrayer = () => {
  return useWorshipLogMutation(salahRepository.deletePrayerLog, (queryClient, variables) => {
    invalidateSalahQueries(queryClient, variables.date);
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
    invalidateSalahQueries,
    'settings.reset_done',
  );
};
