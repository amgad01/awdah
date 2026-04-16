import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';

function _invalidateSalahQueries(
  queryClient: QueryClient,
  date?: string,
  skipCombined = false,
): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt, exact: true }));
  promises.push(
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix, exact: false }),
  );
  if (!skipCombined) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix, exact: false }),
    );
  }
  if (date) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(date), exact: true }),
    );
  }
  return Promise.all(promises).then(() => undefined);
}

function _invalidateSawmQueries(
  queryClient: QueryClient,
  date?: string,
  skipCombined = false,
): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt, exact: true }));
  promises.push(
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix, exact: false }),
  );
  if (!skipCombined) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix, exact: false }),
    );
  }
  if (date) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(date), exact: true }),
    );
  }
  return Promise.all(promises).then(() => undefined);
}

export function invalidateSalahQueries(queryClient: QueryClient, date?: string): Promise<void> {
  return _invalidateSalahQueries(queryClient, date, false);
}

export function invalidateSawmQueries(queryClient: QueryClient, date?: string): Promise<void> {
  return _invalidateSawmQueries(queryClient, date, false);
}

export function invalidateUserProfile(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile, exact: true });
}

export function invalidatePracticingPeriods(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods, exact: true });
}

export function invalidateAllWorshipQueries(queryClient: QueryClient): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(_invalidateSalahQueries(queryClient, undefined, true));
  promises.push(_invalidateSawmQueries(queryClient, undefined, true));
  // Invalidate combined history only once
  promises.push(
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix, exact: false }),
  );
  return Promise.all(promises).then(() => undefined);
}

// Removal functions for reset operations - immediately clear cache without waiting for refetch
function _removeSalahQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: QUERY_KEYS.salahDebt, exact: true });
  queryClient.removeQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix, exact: false });
  queryClient.removeQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix, exact: false });
}

function _removeSawmQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: QUERY_KEYS.sawmDebt, exact: true });
  queryClient.removeQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix, exact: false });
  queryClient.removeQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix, exact: false });
}

export function removeSalahQueries(queryClient: QueryClient): void {
  _removeSalahQueries(queryClient);
}

export function removeSawmQueries(queryClient: QueryClient): void {
  _removeSawmQueries(queryClient);
}
