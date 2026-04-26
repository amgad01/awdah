import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import type {
  SalahDebtResponse,
  SawmDebtResponse,
  PrayerLogResponse,
  FastLogResponse,
  UserProfileResponse,
  PracticingPeriodResponse,
} from '@/lib/api';
import type {
  CreatePracticingPeriodInput,
  UpdatePracticingPeriodInput,
} from '@/domains/salah/salah-repository';
import type { UpdateUserProfileInput } from '@/domains/user/user-repository';

export function updateSalahDebtCache(
  queryClient: QueryClient,
  prayerName: string,
  delta: 1 | -1,
): void {
  queryClient.setQueryData<SalahDebtResponse>(QUERY_KEYS.salahDebt, (prev) => {
    if (!prev) return prev;
    const perPrayer = { ...prev.perPrayerRemaining };
    perPrayer[prayerName] = Math.max(0, (perPrayer[prayerName] ?? 0) - delta);
    return {
      ...prev,
      completedPrayers: prev.completedPrayers + delta,
      remainingPrayers: Math.max(0, prev.remainingPrayers - delta),
      perPrayerRemaining: perPrayer,
    };
  });
}

export function updateSawmDebtCache(queryClient: QueryClient, delta: 1 | -1): void {
  queryClient.setQueryData<SawmDebtResponse>(QUERY_KEYS.sawmDebt, (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      completedDays: prev.completedDays + delta,
      remainingDays: Math.max(0, prev.remainingDays - delta),
    };
  });
}

export function appendSalahDailyLog(
  queryClient: QueryClient,
  date: string,
  entry: PrayerLogResponse,
): void {
  queryClient.setQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs(date), (prev) =>
    prev ? [...prev, entry] : [entry],
  );
}

export function removeSalahDailyLog(
  queryClient: QueryClient,
  date: string,
  prayerName: string,
  type: string,
): void {
  queryClient.setQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs(date), (prev) => {
    if (!prev) return prev;
    const idx = [...prev]
      .reverse()
      .findIndex((l) => l.prayerName === prayerName && l.type === type);
    if (idx === -1) return prev;
    const realIdx = prev.length - 1 - idx;
    return prev.filter((_, i) => i !== realIdx);
  });
}

export function appendSawmDailyLog(
  queryClient: QueryClient,
  date: string,
  entry: FastLogResponse,
): void {
  queryClient.setQueryData<FastLogResponse[]>(QUERY_KEYS.sawmDailyLog(date), (prev) =>
    prev ? [...prev, entry] : [entry],
  );
}

export function refetchSawmDailyLog(queryClient: QueryClient, date: string): void {
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.sawmDailyLog(date),
    exact: true,
  });
}

export function removeSawmDailyLog(queryClient: QueryClient, date: string, eventId: string): void {
  queryClient.setQueryData<FastLogResponse[]>(QUERY_KEYS.sawmDailyLog(date), (prev) =>
    prev ? prev.filter((l) => l.eventId !== eventId) : prev,
  );
}

export function updateProfileCache(
  queryClient: QueryClient,
  variables: UpdateUserProfileInput,
): void {
  queryClient.setQueryData<UserProfileResponse>(QUERY_KEYS.userProfile, (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      username: variables.username ?? prev.username,
      bulughDate: variables.bulughDate,
      gender: variables.gender as UserProfileResponse['gender'],
      dateOfBirth: variables.dateOfBirth ?? undefined,
      revertDate: variables.revertDate ?? undefined,
    };
  });
}

type PeriodsUpdate =
  | { action: 'add'; period: CreatePracticingPeriodInput }
  | { action: 'update'; period: UpdatePracticingPeriodInput }
  | { action: 'delete'; periodId: string };

export function updatePeriodsCache(queryClient: QueryClient, update: PeriodsUpdate): void {
  queryClient.setQueryData<PracticingPeriodResponse[]>(QUERY_KEYS.practicingPeriods, (prev) => {
    if (!prev) return prev;
    if (update.action === 'add') {
      return [
        ...prev,
        {
          periodId: `optimistic-${Date.now()}`,
          startDate: update.period.startDate,
          endDate: update.period.endDate,
          type: update.period.type,
        },
      ];
    }
    if (update.action === 'update') {
      return prev.map((p) =>
        p.periodId === update.period.periodId
          ? {
              ...p,
              startDate: update.period.startDate,
              endDate: update.period.endDate,
              type: update.period.type,
            }
          : p,
      );
    }
    return prev.filter((p) => p.periodId !== update.periodId);
  });
  if (update.action === 'add') {
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.practicingPeriods,
      exact: true,
      refetchType: 'none',
    });
  }
}

export function markSalahHistoryStale(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.salahHistoryPrefix,
    exact: false,
    refetchType: 'none',
  });
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.combinedHistoryPrefix,
    exact: false,
    refetchType: 'none',
  });
}

export function markSawmHistoryStale(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.sawmHistoryPrefix,
    exact: false,
    refetchType: 'none',
  });
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.combinedHistoryPrefix,
    exact: false,
    refetchType: 'none',
  });
}

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

/**
 * Invalidates debt queries immediately (server must recompute after profile/period changes).
 * History is marked stale-only — it will refetch on next mount/focus, not right now.
 */
export function invalidateAllWorshipQueries(queryClient: QueryClient): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt, exact: true }));
  promises.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt, exact: true }));
  markSalahHistoryStale(queryClient);
  markSawmHistoryStale(queryClient);
  return Promise.all(promises).then(() => undefined);
}

/**
 * Invalidates practicing periods and all worship debt/history.
 * Use after any practicing-period mutation or profile update that affects debt calculation.
 */
export function invalidatePeriodRelatedQueries(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    invalidatePracticingPeriods(queryClient),
    invalidateAllWorshipQueries(queryClient),
  ]).then(() => undefined);
}

function _removeSalahQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: QUERY_KEYS.salahDebt, exact: true });
  markSalahHistoryStale(queryClient);
}

function _removeSawmQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: QUERY_KEYS.sawmDebt, exact: true });
  markSawmHistoryStale(queryClient);
}

export function removeSalahQueries(queryClient: QueryClient): void {
  _removeSalahQueries(queryClient);
}

export function removeSawmQueries(queryClient: QueryClient): void {
  _removeSawmQueries(queryClient);
}
