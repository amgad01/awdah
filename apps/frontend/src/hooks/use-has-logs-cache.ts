import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';

function checkHasLogs(
  queryClient: ReturnType<typeof useQueryClient>,
  type: 'prayers' | 'fasts',
): boolean | null {
  const historyPrefix =
    type === 'prayers' ? QUERY_KEYS.salahHistoryPrefix : QUERY_KEYS.sawmHistoryPrefix;
  const dailyPrefix = type === 'prayers' ? ['salah-daily'] : ['sawm-daily'];

  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;

      const matchesHistory =
        key.length >= historyPrefix.length &&
        key.slice(0, historyPrefix.length).every((k, i) => k === historyPrefix[i]);

      const matchesDaily =
        key.length >= dailyPrefix.length &&
        key.slice(0, dailyPrefix.length).every((k, i) => k === dailyPrefix[i]);

      return matchesHistory || matchesDaily;
    },
  });

  let hasSuccessfulQuery = false;
  let allSuccessfulQueriesEmpty = true;

  for (const query of queries) {
    const { data, status } = query.state;

    if (status === 'success') {
      hasSuccessfulQuery = true;

      if (!data) {
        continue;
      }

      if (typeof data === 'object' && 'pages' in data) {
        const pages = (data as { pages: unknown[] }).pages;
        let hasItems = false;
        for (const page of pages) {
          if (
            typeof page === 'object' &&
            page !== null &&
            'items' in page &&
            Array.isArray((page as { items: unknown[] }).items) &&
            (page as { items: unknown[] }).items.length > 0
          ) {
            hasItems = true;
            break;
          }
        }
        if (hasItems) {
          return true;
        }
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (
          firstItem &&
          typeof firstItem === 'object' &&
          'eventId' in firstItem &&
          'date' in firstItem &&
          'loggedAt' in firstItem &&
          ('prayerName' in firstItem || 'fastType' in firstItem || 'type' in firstItem)
        ) {
          return true;
        }
      }
    } else if (status === 'error' || status === 'pending') {
      allSuccessfulQueriesEmpty = false;
    }
  }

  if (hasSuccessfulQuery && allSuccessfulQueriesEmpty) {
    return false;
  }

  return null;
}

/**
 * Check if any logs exist in the React Query cache.
 * This is a performance optimization to avoid backend calls when we already know
 * the user has no logs (or has logs) based on cached query data.
 * Updates reactively when cache changes.
 */
export function useHasLogsCache(type: 'prayers' | 'fasts'): boolean | null {
  const queryClient = useQueryClient();
  const [hasLogs, setHasLogs] = useState<boolean | null>(() => checkHasLogs(queryClient, type));

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setHasLogs(checkHasLogs(queryClient, type));
    });

    // Initial check - defer to avoid cascading renders warning
    queueMicrotask(() => {
      setHasLogs(checkHasLogs(queryClient, type));
    });

    return unsubscribe;
  }, [queryClient, type]);

  return hasLogs;
}

/**
 * Mark logs as cleared in the cache after a successful reset.
 * This updates the cache optimistically without waiting for revalidation.
 */
export function useMarkLogsCleared() {
  const queryClient = useQueryClient();

  return (type: 'prayers' | 'fasts') => {
    const historyPrefix =
      type === 'prayers' ? QUERY_KEYS.salahHistoryPrefix : QUERY_KEYS.sawmHistoryPrefix;
    const dailyPrefix = type === 'prayers' ? ['salah-daily'] : ['sawm-daily'];

    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;

        const matchesHistory =
          key.length >= historyPrefix.length &&
          key.slice(0, historyPrefix.length).every((k, i) => k === historyPrefix[i]);

        const matchesDaily =
          key.length >= dailyPrefix.length &&
          key.slice(0, dailyPrefix.length).every((k, i) => k === dailyPrefix[i]);

        return matchesHistory || matchesDaily;
      },
    });

    if (type === 'prayers') {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
    }
  };
}

function checkDailyLog(
  queryClient: ReturnType<typeof useQueryClient>,
  date: string,
  type: 'prayers' | 'fasts',
): boolean | null {
  const queryKey =
    type === 'prayers' ? QUERY_KEYS.salahDailyLogs(date) : QUERY_KEYS.sawmDailyLog(date);

  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) return null;

  const data = query.state.data;
  if (!data) return null;

  if (Array.isArray(data) && data.length > 0) {
    return true;
  }

  return false;
}

/**
 * Check cache for specific date log existence.
 * Used for daily log buttons. Reactively updates when cache changes.
 */
export function useHasDailyLog(date: string, type: 'prayers' | 'fasts'): boolean | null {
  const queryClient = useQueryClient();
  const [hasLog, setHasLog] = useState<boolean | null>(() =>
    checkDailyLog(queryClient, date, type),
  );

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setHasLog(checkDailyLog(queryClient, date, type));
    });

    queueMicrotask(() => {
      setHasLog(checkDailyLog(queryClient, date, type));
    });

    return unsubscribe;
  }, [queryClient, date, type]);

  return hasLog;
}
