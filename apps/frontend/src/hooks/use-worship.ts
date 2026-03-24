import { useMemo } from 'react';
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  api,
  type FastLogResponse,
  type PrayerLogResponse,
  type HistoryPageResponse,
} from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { HISTORY_PAGE_SIZE } from '@/lib/constants';
import { isoDate, addHijriDays, todayHijriDate } from '@/utils/date-utils';

function invalidateSalahQueries(queryClient: QueryClient, date?: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix });
  if (date) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(date) });
}

function invalidateSawmQueries(queryClient: QueryClient, date?: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix });
  if (date) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(date) });
}

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

async function fetchPrayerHistoryPage(
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

async function fetchFastHistoryPage(
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
      invalidateSalahQueries(queryClient, variables.date);
    },
  });
};

export const useDeletePrayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.salah.deleteLog,
    onSuccess: (_data, variables) => {
      invalidateSalahQueries(queryClient, variables.date);
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
      invalidateSawmQueries(queryClient, variables.date);
    },
  });
};

export const useDeleteFast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sawm.deleteLog,
    onSuccess: (_data, variables) => {
      invalidateSawmQueries(queryClient, variables.date);
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

export const useResetPrayerLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.salah.resetLogs,
    onSuccess: () => {
      invalidateSalahQueries(queryClient);
    },
  });
};

export const useResetFastLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sawm.resetLogs,
    onSuccess: () => {
      invalidateSawmQueries(queryClient);
    },
  });
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function computeConsecutiveStreak(activeDays: Set<string>): number {
  // If today has no log, start from yesterday — the streak doesn't reset until
  // the whole day has passed without a log.
  const today = new Date();
  const checkDay = new Date(today);
  if (!activeDays.has(isoDate(checkDay))) {
    checkDay.setDate(checkDay.getDate() - 1);
  }
  let count = 0;
  while (activeDays.has(isoDate(checkDay))) {
    count++;
    checkDay.setDate(checkDay.getDate() - 1);
  }
  return count;
}

export const useStreak = () => {
  const startDate = addHijriDays(todayHijriDate(), -120);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  const streak = useMemo(() => {
    const activeDays = new Set<string>();
    for (const log of salah.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.loggedAt.split('T')[0]);
    }
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') activeDays.add(log.loggedAt.split('T')[0]);
    }
    return computeConsecutiveStreak(activeDays);
  }, [salah.data, sawm.data]);

  const milestone = STREAK_MILESTONES.includes(streak) ? streak : null;

  return {
    streak,
    milestone,
    loading: salah.isLoading || sawm.isLoading,
  };
};

export interface BestPrayerStreak {
  name: string;
  count: number;
}

export const useStreakDetails = () => {
  const startDate = addHijriDays(todayHijriDate(), -120);
  const endDate = todayHijriDate();
  const salah = useSalahHistory(startDate, endDate);
  const sawm = useSawmHistory(startDate, endDate);

  // Per-prayer consecutive streak (ending today or yesterday)
  const prayerStreaks = useMemo((): Record<string, number> => {
    const prayerDays: Record<string, Set<string>> = {};
    for (const log of salah.data ?? []) {
      if (log.type !== 'qadaa') continue;
      const day = log.loggedAt.split('T')[0];
      if (!prayerDays[log.prayerName]) prayerDays[log.prayerName] = new Set();
      prayerDays[log.prayerName].add(day);
    }
    const streaks: Record<string, number> = {};
    for (const [name, days] of Object.entries(prayerDays)) {
      streaks[name] = computeConsecutiveStreak(days);
    }
    return streaks;
  }, [salah.data]);

  // Consecutive weeks with both a Monday and a Thursday qadaa fast
  const monThuStreak = useMemo((): number => {
    const fastDays = new Set<string>();
    for (const log of sawm.data ?? []) {
      if (log.type === 'qadaa') fastDays.add(log.loggedAt.split('T')[0]);
    }

    // Locate the most recent Monday (can be today)
    const today = new Date();
    const checkMon = new Date(today);
    while (checkMon.getDay() !== 1) {
      checkMon.setDate(checkMon.getDate() - 1);
    }

    let streak = 0;
    // Walk back week by week; only count fully elapsed weeks (Thu must have passed)
    for (let i = 0; i < 17; i++) {
      const monStr = isoDate(checkMon);
      const thuDate = new Date(checkMon);
      thuDate.setDate(thuDate.getDate() + 3);
      const thuStr = isoDate(thuDate);

      if (thuDate > today) {
        // Current week not yet complete — skip to previous week
        checkMon.setDate(checkMon.getDate() - 7);
        continue;
      }

      if (fastDays.has(monStr) && fastDays.has(thuStr)) {
        streak++;
        checkMon.setDate(checkMon.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  }, [sawm.data]);

  const bestPrayerStreak = useMemo((): BestPrayerStreak | null => {
    let best: BestPrayerStreak | null = null;
    for (const [name, count] of Object.entries(prayerStreaks)) {
      if (count > 0 && (!best || count > best.count)) {
        best = { name, count };
      }
    }
    return best;
  }, [prayerStreaks]);

  return {
    prayerStreaks,
    bestPrayerStreak,
    monThuStreak,
    loading: salah.isLoading || sawm.isLoading,
  };
};
