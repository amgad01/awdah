import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import {
  fetchCombinedHistoryPage,
  INITIAL_COMBINED_HISTORY_CURSOR,
  type CombinedHistoryCursor,
  type CombinedHistoryPage,
} from '@/domains/history/combined-history-service';

export type { CombinedHistoryItem } from '@/domains/history/combined-history-service';

export const useInfiniteCombinedHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteQuery<
    CombinedHistoryPage,
    Error,
    InfiniteData<CombinedHistoryPage, CombinedHistoryCursor>,
    ReturnType<typeof QUERY_KEYS.combinedHistory>,
    CombinedHistoryCursor
  >({
    queryKey: QUERY_KEYS.combinedHistory(startDate, endDate, HISTORY_PAGE_SIZE),
    queryFn: ({ pageParam, signal }) =>
      fetchCombinedHistoryPage(startDate, endDate, pageParam, signal),
    initialPageParam: INITIAL_COMBINED_HISTORY_CURSOR,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    enabled: enabled && !!startDate && !!endDate,
  });
};
