import React from 'react';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { Loader2, Inbox } from 'lucide-react';
import { HistoryFilterToggle, HistoryFilterPanel, HistorySummaryStrip } from './history-filters';
import { HistoryDayGroup } from './history-timeline';
import { useHistoryPage } from './use-history-page';
import styles from './history-page.module.css';

export const HistoryPage: React.FC = () => {
  const {
    endDate,
    fastCount,
    fmtNumber,
    formatDual,
    groupedEntries,
    hasMoreHistory,
    isFetchingMoreHistory,
    isLoading,
    isPageError,
    loadMore,
    logTypeFilter,
    pageError,
    prayerCount,
    prayerFilter,
    retry,
    setEndDate,
    setLogTypeFilter,
    setPrayerFilter,
    setStartDate,
    setTypeFilter,
    showFilters,
    startDate,
    t,
    today,
    toggleFilters,
    totalCount,
    typeFilter,
  } = useHistoryPage();

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
        <HistoryFilterToggle showFilters={showFilters} onToggle={toggleFilters} t={t} />
      </section>

      <HistoryFilterPanel
        showFilters={showFilters}
        startDate={startDate}
        endDate={endDate}
        today={today}
        typeFilter={typeFilter}
        logTypeFilter={logTypeFilter}
        prayerFilter={prayerFilter}
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
          onRetry={retry}
        />
      ) : groupedEntries.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{t('history.no_entries')}</p>
          <p className={styles.emptyHint}>{t('history.no_entries_hint')}</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {groupedEntries.map(([date, dayEntries]) => (
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
            {groupedEntries.length === 0
              ? t('history.load_more_empty_hint')
              : t('history.load_more_hint')}
          </p>
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={loadMore}
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
