import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInfiniteCombinedHistory,
  useInfiniteSalahHistory,
  useInfiniteSawmHistory,
} from '@/hooks/use-worship';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { getCoveredPracticingDays, periodCoversContext } from '@/lib/practicing-periods';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Loader2, Inbox } from 'lucide-react';
import { addHijriDays, todayHijriDate } from '@/utils/date-utils';
import {
  type HistoryEntry,
  isPrayerItem,
  isFastItem,
  hijriBoundaryIso,
  isWithinHistoryRange,
  MAX_HISTORY_RANGE_DAYS,
} from './history-helpers';
import { HistoryFilterToggle, HistoryFilterPanel, HistorySummaryStrip } from './history-filters';
import { HistoryDayGroup } from './history-timeline';
import styles from './history-page.module.css';

function defaultStartDate(): string {
  return addHijriDays(todayHijriDate(), -29);
}

export const HistoryPage: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const queryClient = useQueryClient();
  const { format: formatDual } = useDualDate();
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

  const rangeError = isHistoryRangeValid ? null : new Error(t('history.range_limit_error'));
  const isLoading = (isHistoryRangeValid && activeHistory.isLoading) || periodsLoading;
  const pageError = rangeError || activeHistory.error || periodsError;
  const isPageError = !isHistoryRangeValid || activeHistory.isError || isPeriodsError;
  const hasMoreHistory = isHistoryRangeValid ? activeHistory.hasNextPage : false;
  const isFetchingMoreHistory = activeHistory.isFetchingNextPage;

  const entries: HistoryEntry[] = useMemo(() => {
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
          action: 'prayed', // Fasts don't have actions yet, default to prayed for visibility
        });
      }
    }

    if (periods) {
      for (const p of periods) {
        const visibleForFilter =
          typeFilter === 'all' ||
          (typeFilter === 'prayers' && periodCoversContext(p.type, 'salah')) ||
          (typeFilter === 'fasting' && periodCoversContext(p.type, 'sawm'));

        if (!visibleForFilter) continue;

        if (p.startDate >= startDate && p.startDate <= endDate) {
          result.push({
            eventId: `period-start-${p.periodId}`,
            date: p.startDate,
            type: 'period',
            logType: p.type,
            loggedAt: hijriBoundaryIso(p.startDate),
            periodEventKind: 'start',
            periodKind: p.type,
          });
        }
        if (p.endDate && p.endDate >= startDate && p.endDate <= endDate) {
          result.push({
            eventId: `period-end-${p.periodId}`,
            date: p.endDate,
            type: 'period',
            logType: p.type,
            loggedAt: hijriBoundaryIso(p.endDate, true),
            periodEventKind: 'end',
            periodKind: p.type,
          });
        }

        const context =
          typeFilter === 'prayers' ? 'salah' : typeFilter === 'fasting' ? 'sawm' : 'all';
        const coveredDays = getCoveredPracticingDays([p], context, startDate, endDate);
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
    salahLogs,
    sawmLogs,
    periods,
    isFastingFilter,
    isPrayerFilter,
    prayerFilter,
    logTypeFilter,
    startDate,
    endDate,
    typeFilter,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const grp = map.get(entry.date) ?? [];
      grp.push(entry);
      map.set(entry.date, grp);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a > b ? -1 : 1));
  }, [entries]);

  const totalCount = entries.length;
  const prayerCount = entries.filter((e) => e.type === 'prayer').length;
  const fastCount = entries.filter((e) => e.type === 'fast').length;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroBadge}>{t('history.hero_badge')}</span>
          <h1 className={styles.title}>{t('nav.history')}</h1>
          <p className={styles.subtitle}>
            <GlossaryText>{t('history.subtitle')}</GlossaryText>
          </p>
        </div>
        <HistoryFilterToggle
          showFilters={showFilters}
          onToggle={() => setShowFilters((v) => !v)}
          t={t}
        />
      </section>

      <HistoryFilterPanel
        showFilters={showFilters}
        startDate={startDate}
        endDate={endDate}
        today={today}
        typeFilter={typeFilter}
        logTypeFilter={logTypeFilter}
        prayerFilter={prayerFilter}
        onToggleFilters={() => setShowFilters((v) => !v)}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onTypeFilterChange={setTypeFilter}
        onLogTypeFilterChange={setLogTypeFilter}
        onPrayerFilterChange={setPrayerFilter}
        t={t}
      />

      <HistorySummaryStrip
        totalCount={totalCount}
        prayerCount={prayerCount}
        fastCount={fastCount}
        typeFilter={typeFilter}
        fmtNumber={fmtNumber}
        t={t}
      />

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 className="animate-spin" size={32} />
          <p>{t('common.loading')}</p>
        </div>
      ) : isPageError ? (
        <ErrorState
          message={pageError instanceof Error ? pageError.message : t('common.error')}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahHistoryPrefix });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmHistoryPrefix });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedHistoryPrefix });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practicingPeriods });
          }}
        />
      ) : grouped.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{t('history.no_entries')}</p>
          <p className={styles.emptyHint}>{t('history.no_entries_hint')}</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {grouped.map(([date, dayEntries]) => (
            <HistoryDayGroup
              key={date}
              date={date}
              entries={dayEntries}
              formatDual={formatDual}
              t={t}
            />
          ))}
        </div>
      )}

      {!isLoading && !isPageError && hasMoreHistory && (
        <div className={styles.loadMoreSection}>
          <p className={styles.loadMoreHint}>
            {grouped.length === 0 ? t('history.load_more_empty_hint') : t('history.load_more_hint')}
          </p>
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={() => void activeHistory.fetchNextPage()}
            disabled={isFetchingMoreHistory}
          >
            {isFetchingMoreHistory ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {t('history.loading_more')}
              </>
            ) : (
              t('history.load_more')
            )}
          </button>
        </div>
      )}
    </div>
  );
};
