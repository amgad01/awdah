import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInfiniteCombinedHistory,
  useInfiniteSalahHistory,
  useInfiniteSawmHistory,
} from '@/hooks/use-worship';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { getCoveredPracticingDays, periodCoversContext } from '@/lib/practicing-periods';
import {
  invalidatePracticingPeriods,
  invalidateSalahQueries,
  invalidateSawmQueries,
} from '@/utils/query-invalidation';
import { addHijriDays, todayHijriDate } from '@/utils/date-utils';
import {
  type HistoryEntry,
  MAX_HISTORY_RANGE_DAYS,
  hijriBoundaryIso,
  isFastItem,
  isPrayerItem,
  isWithinHistoryRange,
} from './history-helpers';

function defaultStartDate(): string {
  return addHijriDays(todayHijriDate(), -29);
}

export function useHistoryPage() {
  const { t, fmtNumber } = useLanguage();
  const { format: formatDual } = useDualDate();
  const queryClient = useQueryClient();
  const today = todayHijriDate();

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState<'all' | 'prayers' | 'fasting'>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'qadaa' | 'obligatory'>('all');
  const [prayerFilter, setPrayerFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const isAllFilter = typeFilter === 'all';
  const isPrayerFilter = typeFilter === 'prayers';
  const isFastingFilter = typeFilter === 'fasting';
  const isHistoryRangeValid = isWithinHistoryRange(startDate, endDate, MAX_HISTORY_RANGE_DAYS);

  const combinedHistory = useInfiniteCombinedHistory(
    startDate,
    endDate,
    isAllFilter && isHistoryRangeValid,
  );
  const salahHistory = useInfiniteSalahHistory(
    startDate,
    endDate,
    isPrayerFilter && isHistoryRangeValid,
  );
  const sawmHistory = useInfiniteSawmHistory(
    startDate,
    endDate,
    isFastingFilter && isHistoryRangeValid,
  );

  const {
    data: periods,
    error: periodsError,
    isError: isPeriodsError,
    isLoading: periodsLoading,
  } = usePracticingPeriods();

  const activeHistory = isAllFilter ? combinedHistory : isPrayerFilter ? salahHistory : sawmHistory;

  const salahLogs = useMemo(() => {
    if (isAllFilter) {
      return (combinedHistory.data?.pages ?? []).flatMap((page) =>
        page.items.filter(isPrayerItem).map(({ kind: _kind, ...log }) => log),
      );
    }

    return (salahHistory.data?.pages ?? []).flatMap((page) => page.items);
  }, [combinedHistory.data?.pages, isAllFilter, salahHistory.data?.pages]);

  const sawmLogs = useMemo(() => {
    if (isAllFilter) {
      return (combinedHistory.data?.pages ?? []).flatMap((page) =>
        page.items.filter(isFastItem).map(({ kind: _kind, ...log }) => log),
      );
    }

    return (sawmHistory.data?.pages ?? []).flatMap((page) => page.items);
  }, [combinedHistory.data?.pages, isAllFilter, sawmHistory.data?.pages]);

  const entries = useMemo<HistoryEntry[]>(() => {
    const result: HistoryEntry[] = [];

    if (!isFastingFilter) {
      for (const log of salahLogs) {
        if (prayerFilter !== 'all' && log.prayerName !== prayerFilter) continue;
        if (logTypeFilter !== 'all' && log.type !== logTypeFilter) continue;
        result.push({
          eventId: log.eventId,
          date: log.date,
          type: 'prayer',
          prayerName: log.prayerName,
          logType: log.type,
          loggedAt: log.loggedAt,
          action: log.action,
        });
      }
    }

    if (!isPrayerFilter) {
      for (const log of sawmLogs) {
        if (logTypeFilter !== 'all' && log.type !== logTypeFilter) continue;
        result.push({
          eventId: log.eventId,
          date: log.date,
          type: 'fast',
          logType: log.type,
          loggedAt: log.loggedAt,
          action: 'prayed',
        });
      }
    }

    if (periods) {
      const periodContext =
        typeFilter === 'prayers' ? 'salah' : typeFilter === 'fasting' ? 'sawm' : 'all';

      for (const period of periods) {
        const visibleForFilter =
          typeFilter === 'all' ||
          (typeFilter === 'prayers' && periodCoversContext(period.type, 'salah')) ||
          (typeFilter === 'fasting' && periodCoversContext(period.type, 'sawm'));

        if (!visibleForFilter) continue;

        if (period.startDate >= startDate && period.startDate <= endDate) {
          result.push({
            eventId: `period-start-${period.periodId}`,
            date: period.startDate,
            type: 'period',
            logType: period.type,
            loggedAt: hijriBoundaryIso(period.startDate),
            periodEventKind: 'start',
            periodKind: period.type,
          });
        }

        if (period.endDate && period.endDate >= startDate && period.endDate <= endDate) {
          result.push({
            eventId: `period-end-${period.periodId}`,
            date: period.endDate,
            type: 'period',
            logType: period.type,
            loggedAt: hijriBoundaryIso(period.endDate, true),
            periodEventKind: 'end',
            periodKind: period.type,
          });
        }

        const coveredDays = getCoveredPracticingDays([period], periodContext, startDate, endDate);
        for (const coveredDay of coveredDays) {
          result.push({
            eventId: `period-day-${coveredDay.periodId}-${coveredDay.date}`,
            date: coveredDay.date,
            type: 'covered',
            logType: coveredDay.type,
            loggedAt: hijriBoundaryIso(coveredDay.date),
            periodKind: coveredDay.type,
          });
        }
      }
    }

    return result.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  }, [
    endDate,
    isFastingFilter,
    isPrayerFilter,
    logTypeFilter,
    periods,
    prayerFilter,
    salahLogs,
    sawmLogs,
    startDate,
    typeFilter,
  ]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const group = map.get(entry.date) ?? [];
      group.push(entry);
      map.set(entry.date, group);
    }

    return Array.from(map.entries()).sort(([left], [right]) => (left > right ? -1 : 1));
  }, [entries]);

  const totalCount = entries.length;
  const prayerCount = entries.filter((entry) => entry.type === 'prayer').length;
  const fastCount = entries.filter((entry) => entry.type === 'fast').length;

  const rangeError = isHistoryRangeValid ? null : new Error(t('history.range_limit_error'));
  const isLoading = (isHistoryRangeValid && activeHistory.isLoading) || periodsLoading;
  const pageError = rangeError || activeHistory.error || periodsError;
  const isPageError = !isHistoryRangeValid || activeHistory.isError || isPeriodsError;
  const hasMoreHistory = isHistoryRangeValid ? activeHistory.hasNextPage : false;
  const isFetchingMoreHistory = activeHistory.isFetchingNextPage;

  const retry = () => {
    void invalidateSalahQueries(queryClient);
    void invalidateSawmQueries(queryClient);
    void invalidatePracticingPeriods(queryClient);
  };

  const loadMore = () => {
    void activeHistory.fetchNextPage();
  };

  return {
    t,
    fmtNumber,
    formatDual,
    today,
    startDate,
    endDate,
    typeFilter,
    logTypeFilter,
    prayerFilter,
    showFilters,
    totalCount,
    prayerCount,
    fastCount,
    groupedEntries,
    isLoading,
    isPageError,
    pageError,
    hasMoreHistory,
    isFetchingMoreHistory,
    toggleFilters: () => setShowFilters((value) => !value),
    setStartDate,
    setEndDate,
    setTypeFilter,
    setLogTypeFilter,
    setPrayerFilter,
    retry,
    loadMore,
  };
}
