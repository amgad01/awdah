import React from 'react';
import { Moon, Sun, BookOpen } from 'lucide-react';
import type { HistoryEntry } from './history-helpers';
import styles from './history-page.module.css';

interface HistoryTimelineEntryProps {
  entry: HistoryEntry;
  formatDual: (
    dateStr: string,
    opts?: Record<string, unknown>,
  ) => { primary: string; secondary: string; hijri: string; gregorian: string };
  t: (key: string) => string;
}

export const HistoryTimelineEntry: React.FC<HistoryTimelineEntryProps> = ({
  entry,
  formatDual,
  t,
}) => (
  <div
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
            : `${t('history.action_marked')} · ${entry.logType === 'qadaa' ? t('history.type_qadaa') : t('history.type_obligatory')} · ${formatDual(entry.date).hijri} · ${formatDual(entry.date).gregorian}`}
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
);

interface HistoryDayGroupProps {
  date: string;
  entries: HistoryEntry[];
  formatDual: (
    dateStr: string,
    opts?: Record<string, unknown>,
  ) => { primary: string; secondary: string; hijri: string; gregorian: string };
  t: (key: string) => string;
}

export const HistoryDayGroup: React.FC<HistoryDayGroupProps> = ({
  date,
  entries,
  formatDual,
  t,
}) => {
  const d = formatDual(date, { weekday: 'long', includeGregorianYear: true });

  return (
    <div className={styles.dayGroup}>
      <div className={styles.dayLabel}>
        {d.primary}
        <span className={styles.dayLabelSec}>{d.secondary}</span>
      </div>
      <div className={styles.dayEntries}>
        {entries.map((entry) => (
          <HistoryTimelineEntry key={entry.eventId} entry={entry} formatDual={formatDual} t={t} />
        ))}
      </div>
    </div>
  );
};
