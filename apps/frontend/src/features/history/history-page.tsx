import React, { useMemo, useState } from 'react';
import { useSalahHistory, useSawmHistory } from '@/hooks/use-worship';
import { useLanguage } from '@/hooks/use-language';
import { Moon, Sun, Filter, CalendarDays, Loader2, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { isoDate } from '@/utils/date-utils';
import styles from './history-page.module.css';

type EntryType = 'prayer' | 'fast';

interface HistoryEntry {
  eventId: string;
  date: string;
  type: EntryType;
  prayerName?: string;
  logType: string;
  loggedAt: string;
}

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return isoDate(d);
}

function formatDisplayDate(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTime(isoStr: string, locale: string): string {
  return new Date(isoStr).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HistoryPage: React.FC = () => {
  const { t, language, fmtNumber } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA' : 'en-GB';
  const today = isoDate(new Date());

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState<'all' | 'prayers' | 'fasting'>('all');
  const [prayerFilter, setPrayerFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: salahLogs, isLoading: salahLoading } = useSalahHistory(startDate, endDate);
  const { data: sawmLogs, isLoading: sawmLoading } = useSawmHistory(startDate, endDate);

  const isLoading = salahLoading || sawmLoading;

  const entries: HistoryEntry[] = useMemo(() => {
    const result: HistoryEntry[] = [];

    if (typeFilter !== 'fasting' && salahLogs) {
      for (const log of salahLogs) {
        if (prayerFilter !== 'all' && log.prayerName !== prayerFilter) continue;
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

    if (typeFilter !== 'prayers' && sawmLogs) {
      for (const log of sawmLogs) {
        result.push({
          eventId: log.eventId,
          date: log.date,
          type: 'fast',
          logType: log.type,
          loggedAt: log.loggedAt,
        });
      }
    }

    return result.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  }, [salahLogs, sawmLogs, typeFilter, prayerFilter]);

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
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('nav.history')}</h1>
          <p className={styles.subtitle}>{t('history.subtitle')}</p>
        </div>
        <button
          className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <Filter size={16} />
          {t('history.filters')}
        </button>
      </header>

      {showFilters && (
        <Card className={styles.filterCard}>
          <div className={styles.filterGrid}>
            {/* Date Range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <CalendarDays size={14} />
                {t('history.date_from')}
              </label>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <CalendarDays size={14} />
                {t('history.date_to')}
              </label>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('history.filter_type')}</label>
              <div className={styles.segmented}>
                {(['all', 'prayers', 'fasting'] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.segBtn} ${typeFilter === opt ? styles.segBtnActive : ''}`}
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
                    onClick={() => setPrayerFilter('all')}
                  >
                    {t('history.filter_all')}
                  </button>
                  {PRAYERS.map((p) => (
                    <button
                      key={p}
                      className={`${styles.segBtn} ${prayerFilter === p ? styles.segBtnActive : ''}`}
                      onClick={() => setPrayerFilter(p)}
                    >
                      {t(`prayers.${p}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              <div className={styles.dayLabel}>{formatDisplayDate(date, locale)}</div>
              <div className={styles.dayEntries}>
                {dayEntries.map((entry) => (
                  <div key={entry.eventId} className={styles.entry}>
                    <div
                      className={`${styles.entryIcon} ${
                        entry.type === 'prayer' ? styles.entryIconPrayer : styles.entryIconFast
                      }`}
                    >
                      {entry.type === 'prayer' ? <Moon size={14} /> : <Sun size={14} />}
                    </div>
                    <div className={styles.entryBody}>
                      <span className={styles.entryTitle}>
                        {entry.type === 'prayer'
                          ? t(`prayers.${entry.prayerName}`)
                          : t('sawm.fast_logged')}
                      </span>
                      <span className={styles.entryMeta}>
                        {t(`history.action_marked`)} ·{' '}
                        {entry.logType === 'qadaa' ? t('history.type_qadaa') : entry.logType} ·{' '}
                        {formatTime(entry.loggedAt, locale)}
                      </span>
                    </div>
                    <div
                      className={`${styles.entryBadge} ${
                        entry.type === 'prayer' ? styles.badgePrayer : styles.badgeFast
                      }`}
                    >
                      {entry.type === 'prayer'
                        ? t('history.prayer_badge')
                        : t('history.fast_badge')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
