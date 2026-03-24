import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HijriDate } from '@awdah/shared';
import {
  type CombinedHistoryItem,
  useInfiniteCombinedHistory,
  useInfiniteSalahHistory,
  useInfiniteSawmHistory,
} from '@/hooks/use-worship';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { DateFilterPicker } from '@/components/ui/date-filter-picker/date-filter-picker';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { getCoveredPracticingDays, periodCoversContext } from '@/lib/practicing-periods';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Moon, Sun, Filter, Loader2, Inbox, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { addHijriDays, hijriToGregorianDate, todayHijriDate } from '@/utils/date-utils';
import { PRAYERS } from '@/lib/constants';
import styles from './history-page.module.css';

type EntryType = 'prayer' | 'fast' | 'period' | 'covered';
const MAX_HISTORY_RANGE_DAYS = 365;

interface HistoryEntry {
  eventId: string;
  date: string;
  type: EntryType;
  prayerName?: string;
  logType: string;
  loggedAt: string;
  periodEventKind?: 'start' | 'end';
  periodKind?: string;
}

function isPrayerItem(
  item: CombinedHistoryItem,
): item is Extract<CombinedHistoryItem, { kind: 'prayer' }> {
  return item.kind === 'prayer';
}

function isFastItem(
  item: CombinedHistoryItem,
): item is Extract<CombinedHistoryItem, { kind: 'fast' }> {
  return item.kind === 'fast';
}

function defaultStartDate(): string {
  return addHijriDays(todayHijriDate(), -29);
}

function hijriBoundaryIso(dateStr: string, endOfDay = false): string {
  const date = hijriToGregorianDate(dateStr);
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

function formatTime(isoStr: string, locale: string): string {
  return new Date(isoStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function isWithinHistoryRange(startDate: string, endDate: string, maxDays: number): boolean {
  const start = HijriDate.fromString(startDate).toGregorian().getTime();
  const end = HijriDate.fromString(endDate).toGregorian().getTime();
  return Math.floor((end - start) / 86_400_000) <= maxDays;
}

export const HistoryPage: React.FC = () => {
  const { t, language, fmtNumber } = useLanguage();
  const queryClient = useQueryClient();
  const locale = language === 'ar' ? 'ar-SA' : 'en-GB';
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
        });
      }
    }

    // Include practicing period boundary events that fall in the date range
    if (periods) {
      for (const p of periods) {
        const visibleForFilter =
          typeFilter === 'all' ||
          (typeFilter === 'prayers' && periodCoversContext(p.type, 'salah')) ||
          (typeFilter === 'fasting' && periodCoversContext(p.type, 'sawm'));

        if (!visibleForFilter) {
          continue;
        }

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

  // Group entries by date for timeline display
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
        <button
          className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="history-filters"
        >
          <Filter size={16} />
          {t('history.filters')}
        </button>
      </section>

      {showFilters && (
        <Card className={styles.filterCard} id="history-filters">
          <div className={styles.filterGrid}>
            {/* Date Range */}
            <DateFilterPicker
              id="history-start-date"
              label={t('history.date_from')}
              value={startDate}
              max={endDate}
              onChange={setStartDate}
            />
            <DateFilterPicker
              id="history-end-date"
              label={t('history.date_to')}
              value={endDate}
              min={startDate}
              max={today}
              onChange={setEndDate}
            />

            {/* Type Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('history.filter_type')}</label>
              <div className={styles.segmented}>
                {(['all', 'prayers', 'fasting'] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.segBtn} ${typeFilter === opt ? styles.segBtnActive : ''}`}
                    aria-pressed={typeFilter === opt}
                    onClick={() => {
                      setTypeFilter(opt);
                      if (opt === 'fasting') setPrayerFilter('all');
                    }}
                  >
                    {t(`history.filter_${opt}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Prayer Filter (only when showing prayers) */}
            {typeFilter !== 'fasting' && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>{t('history.filter_prayer')}</label>
                <div className={styles.segmented}>
                  <button
                    className={`${styles.segBtn} ${prayerFilter === 'all' ? styles.segBtnActive : ''}`}
                    aria-pressed={prayerFilter === 'all'}
                    onClick={() => setPrayerFilter('all')}
                  >
                    {t('history.filter_all')}
                  </button>
                  {PRAYERS.map((p) => (
                    <button
                      key={p}
                      className={`${styles.segBtn} ${prayerFilter === p ? styles.segBtnActive : ''}`}
                      aria-pressed={prayerFilter === p}
                      onClick={() => setPrayerFilter(p)}
                    >
                      {t(`prayers.${p}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Log type filter (Qadaa / Obligatory) */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('history.filter_log_type')}</label>
              <div className={styles.segmented}>
                {(['all', 'qadaa', 'obligatory'] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.segBtn} ${logTypeFilter === opt ? styles.segBtnActive : ''}`}
                    aria-pressed={logTypeFilter === opt}
                    onClick={() => setLogTypeFilter(opt)}
                  >
                    {t(`history.filter_log_type_${opt}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary strip */}
      <div className={styles.summary}>
        <div className={styles.summaryChip}>
          <span className={styles.summaryNum}>{fmtNumber(totalCount)}</span>
          <span className={styles.summaryLbl}>{t('history.total_entries')}</span>
        </div>
        {typeFilter !== 'fasting' && (
          <div className={`${styles.summaryChip} ${styles.summaryPrayer}`}>
            <Moon size={14} />
            <span className={styles.summaryNum}>{fmtNumber(prayerCount)}</span>
            <span className={styles.summaryLbl}>{t('history.prayers_label')}</span>
          </div>
        )}
        {typeFilter !== 'prayers' && (
          <div className={`${styles.summaryChip} ${styles.summaryFast}`}>
            <Sun size={14} />
            <span className={styles.summaryNum}>{fmtNumber(fastCount)}</span>
            <span className={styles.summaryLbl}>{t('history.fasts_label')}</span>
          </div>
        )}
      </div>

      {/* Timeline */}
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
            <div key={date} className={styles.dayGroup}>
              <div className={styles.dayLabel}>
                {(() => {
                  const d = formatDual(date, { weekday: 'long', includeGregorianYear: true });
                  return (
                    <>
                      {d.primary}
                      <span className={styles.dayLabelSec}>{d.secondary}</span>
                    </>
                  );
                })()}
              </div>
              <div className={styles.dayEntries}>
                {dayEntries.map((entry) => (
                  <div
                    key={entry.eventId}
                    className={`${styles.entry} ${
                      entry.type === 'period'
                        ? styles.entryPeriod
                        : entry.type === 'covered'
                          ? styles.entryCovered
                          : ''
                    }`}
                  >
                    <div
                      className={`${styles.entryIcon} ${
                        entry.type === 'prayer'
                          ? styles.entryIconPrayer
                          : entry.type === 'fast'
                            ? styles.entryIconFast
                            : entry.type === 'covered'
                              ? styles.entryIconCovered
                              : styles.entryIconPeriod
                      }`}
                    >
                      {entry.type === 'prayer' ? (
                        <Moon size={14} />
                      ) : entry.type === 'fast' ? (
                        <Sun size={14} />
                      ) : entry.type === 'covered' ? (
                        <BookOpen size={14} />
                      ) : (
                        <BookOpen size={14} />
                      )}
                    </div>
                    <div className={styles.entryBody}>
                      <span className={styles.entryTitle}>
                        {entry.type === 'prayer'
                          ? t(`prayers.${entry.prayerName}`)
                          : entry.type === 'fast'
                            ? t('sawm.fast_logged')
                            : entry.type === 'covered'
                              ? t('history.period_active_event')
                              : entry.periodEventKind === 'start'
                                ? t('history.period_start_event')
                                : t('history.period_end_event')}
                      </span>
                      <span className={styles.entryMeta}>
                        {entry.type === 'period'
                          ? t(`onboarding.period_type_${entry.periodKind}`)
                          : entry.type === 'covered'
                            ? `${t('history.covered_by_period')} · ${t(`onboarding.period_type_${entry.periodKind}`)}`
                            : `${t('history.action_marked')} · ${entry.logType === 'qadaa' ? t('history.type_qadaa') : t('history.type_obligatory')} · ${formatDual(entry.date).hijri} · ${formatDual(entry.date).gregorian} · ${formatTime(entry.loggedAt, locale)}`}
                      </span>
                    </div>
                    <div
                      className={`${styles.entryBadge} ${
                        entry.type === 'prayer'
                          ? styles.badgePrayer
                          : entry.type === 'fast'
                            ? styles.badgeFast
                            : entry.type === 'covered'
                              ? styles.badgeCovered
                              : styles.badgePeriod
                      }`}
                    >
                      {entry.type === 'prayer'
                        ? t('history.prayer_badge')
                        : entry.type === 'fast'
                          ? t('history.fast_badge')
                          : entry.type === 'covered'
                            ? t('history.covered_badge')
                            : t('history.period_badge')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
