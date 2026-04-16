import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';

function checkHasLogs(
  queryClient: ReturnType<typeof useQueryClient>,
  type: 'prayers' | 'fasts',
): boolean | null {
  const prefix = type === 'prayers' ? QUERY_KEYS.salahHistoryPrefix : QUERY_KEYS.sawmHistoryPrefix;

  // Get all queries matching the prefix
  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key.length >= prefix.length &&
        key.slice(0, prefix.length).every((k, i) => k === prefix[i])
      );
    },
  });

  // Check if any query has data with items
  for (const query of queries) {
    const data = query.state.data;

    if (!data) continue;

    // Handle infinite query (paginated) data
    if (typeof data === 'object' && 'pages' in data) {
      const pages = (data as { pages: unknown[] }).pages;
      for (const page of pages) {
        if (
          typeof page === 'object' &&
          page !== null &&
          'items' in page &&
          Array.isArray((page as { items: unknown[] }).items) &&
          (page as { items: unknown[] }).items.length > 0
        ) {
          return true;
        }
      }
      continue;
    }

    // Handle regular array data
    if (Array.isArray(data) && data.length > 0) {
      // Verify it's actually logs by checking for required log properties
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
  }

  // If we have queries but none have data, we know there are no logs
  if (queries.length > 0) {
    return false;
  }

  // Unknown - no relevant queries cached
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
    // Subscribe to query cache changes
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
    const prefix =
      type === 'prayers' ? QUERY_KEYS.salahHistoryPrefix : QUERY_KEYS.sawmHistoryPrefix;

    // Invalidate all related queries to trigger refetch
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key.length >= prefix.length &&
          key.slice(0, prefix.length).every((k, i) => k === prefix[i])
        );
      },
    });

    // Also invalidate debt queries
    if (type === 'prayers') {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
    }
  };
}

/**
 * Check cache for specific date log existence.
 * Used for daily log buttons.
 */
export function useHasDailyLog(date: string, type: 'prayers' | 'fasts'): boolean | null {
  const queryClient = useQueryClient();

  return useMemo(() => {
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
  }, [queryClient, date, type]);
}
