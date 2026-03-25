import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import type { PrayerLogResponse, FastLogResponse } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { fetchPrayerHistoryPage } from './use-salah-queries';
import { fetchFastHistoryPage } from './use-sawm-queries';

type CombinedHistoryCursor = {
  prayerCursor?: string;
  fastCursor?: string;
  prayerBuffer: PrayerLogResponse[];
  fastBuffer: FastLogResponse[];
  prayerExhausted: boolean;
  fastExhausted: boolean;
};

export type CombinedHistoryItem =
  | ({ kind: 'prayer' } & PrayerLogResponse)
  | ({ kind: 'fast' } & FastLogResponse);

interface CombinedHistoryPage {
  items: CombinedHistoryItem[];
  hasMore: boolean;
  nextPageParam?: CombinedHistoryCursor;
}

const INITIAL_COMBINED_HISTORY_CURSOR: CombinedHistoryCursor = {
  prayerBuffer: [],
  fastBuffer: [],
  prayerExhausted: false,
  fastExhausted: false,
};

function compareLoggedAtDesc(a?: { loggedAt: string }, b?: { loggedAt: string }): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
}

async function fetchCombinedHistoryPage(
  startDate: string,
  endDate: string,
  pageParam: CombinedHistoryCursor,
): Promise<CombinedHistoryPage> {
  let prayerCursor = pageParam.prayerCursor;
  let fastCursor = pageParam.fastCursor;
  let prayerBuffer = [...pageParam.prayerBuffer];
  let fastBuffer = [...pageParam.fastBuffer];
  let prayerExhausted = pageParam.prayerExhausted;
  let fastExhausted = pageParam.fastExhausted;
  const items: CombinedHistoryItem[] = [];

  while (items.length < HISTORY_PAGE_SIZE) {
    const needsPrayerPage = prayerBuffer.length === 0 && !prayerExhausted;
    const needsFastPage = fastBuffer.length === 0 && !fastExhausted;

    if (needsPrayerPage || needsFastPage) {
      const [prayerPage, fastPage] = await Promise.all([
        needsPrayerPage ? fetchPrayerHistoryPage(startDate, endDate, prayerCursor) : null,
        needsFastPage ? fetchFastHistoryPage(startDate, endDate, fastCursor) : null,
      ]);

      if (prayerPage) {
        prayerBuffer = prayerPage.items;
        prayerCursor = prayerPage.nextCursor;
        prayerExhausted = !prayerPage.hasMore;
      }

      if (fastPage) {
        fastBuffer = fastPage.items;
        fastCursor = fastPage.nextCursor;
        fastExhausted = !fastPage.hasMore;
      }
    }

    const nextPrayer = prayerBuffer[0];
    const nextFast = fastBuffer[0];

    if (!nextPrayer && !nextFast) {
      break;
    }

    if (compareLoggedAtDesc(nextPrayer, nextFast) <= 0) {
      items.push({ kind: 'prayer', ...prayerBuffer.shift()! });
      continue;
    }

    items.push({ kind: 'fast', ...fastBuffer.shift()! });
  }

  const hasMore =
    prayerBuffer.length > 0 || fastBuffer.length > 0 || !prayerExhausted || !fastExhausted;

  return {
    items,
    hasMore,
    nextPageParam: hasMore
      ? {
          prayerCursor,
          fastCursor,
          prayerBuffer,
          fastBuffer,
          prayerExhausted,
          fastExhausted,
        }
      : undefined,
  };
}

export const useInfiniteCombinedHistory = (startDate: string, endDate: string, enabled = true) => {
  return useInfiniteQuery<
    CombinedHistoryPage,
    Error,
    InfiniteData<CombinedHistoryPage, CombinedHistoryCursor>,
    ReturnType<typeof QUERY_KEYS.combinedHistory>,
    CombinedHistoryCursor
  >({
    queryKey: QUERY_KEYS.combinedHistory(startDate, endDate, HISTORY_PAGE_SIZE),
    queryFn: ({ pageParam }) => fetchCombinedHistoryPage(startDate, endDate, pageParam),
    initialPageParam: INITIAL_COMBINED_HISTORY_CURSOR,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    enabled: enabled && !!startDate && !!endDate,
  });
};
