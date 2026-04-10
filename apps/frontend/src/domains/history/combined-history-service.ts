import type { FastLogResponse, PrayerLogResponse } from '@/lib/api';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { fetchPrayerHistoryPage } from '@/hooks/use-salah-queries';
import { fetchFastHistoryPage } from '@/hooks/use-sawm-queries';

export interface CombinedHistoryCursor {
  prayerCursor?: string;
  fastCursor?: string;
  prayerBuffer: PrayerLogResponse[];
  fastBuffer: FastLogResponse[];
  prayerExhausted: boolean;
  fastExhausted: boolean;
}

export type CombinedHistoryItem =
  | ({ kind: 'prayer' } & PrayerLogResponse)
  | ({ kind: 'fast' } & FastLogResponse);

export interface CombinedHistoryPage {
  items: CombinedHistoryItem[];
  hasMore: boolean;
  nextPageParam?: CombinedHistoryCursor;
}

interface CombinedHistoryDependencies {
  fetchFastPage: typeof fetchFastHistoryPage;
  fetchPrayerPage: typeof fetchPrayerHistoryPage;
}

export const INITIAL_COMBINED_HISTORY_CURSOR: CombinedHistoryCursor = {
  prayerBuffer: [],
  fastBuffer: [],
  prayerExhausted: false,
  fastExhausted: false,
};

const defaultCombinedHistoryDependencies: CombinedHistoryDependencies = {
  fetchFastPage: fetchFastHistoryPage,
  fetchPrayerPage: fetchPrayerHistoryPage,
};

function compareLoggedAtDesc(a?: { loggedAt: string }, b?: { loggedAt: string }): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
}

export async function fetchCombinedHistoryPage(
  startDate: string,
  endDate: string,
  pageParam: CombinedHistoryCursor,
  signal?: AbortSignal,
  dependencies: CombinedHistoryDependencies = defaultCombinedHistoryDependencies,
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
        needsPrayerPage
          ? dependencies.fetchPrayerPage(startDate, endDate, prayerCursor, signal)
          : Promise.resolve(null),
        needsFastPage
          ? dependencies.fetchFastPage(startDate, endDate, fastCursor, signal)
          : Promise.resolve(null),
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
