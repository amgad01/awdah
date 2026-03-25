import React from 'react';
import { Moon, Sun, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { DateFilterPicker } from '@/components/ui/date-filter-picker/date-filter-picker';
import { PRAYERS } from '@/lib/constants';
import styles from './history-page.module.css';

interface HistoryFiltersProps {
  showFilters: boolean;
  startDate: string;
  endDate: string;
  today: string;
  typeFilter: 'all' | 'prayers' | 'fasting';
  logTypeFilter: 'all' | 'qadaa' | 'obligatory';
  prayerFilter: string;
  onToggleFilters: () => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onTypeFilterChange: (v: 'all' | 'prayers' | 'fasting') => void;
  onLogTypeFilterChange: (v: 'all' | 'qadaa' | 'obligatory') => void;
  onPrayerFilterChange: (v: string) => void;
  t: (key: string) => string;
}

export const HistoryFilterToggle: React.FC<{
  showFilters: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}> = ({ showFilters, onToggle, t }) => (
  <button
    className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
    onClick={onToggle}
    aria-expanded={showFilters}
    aria-controls="history-filters"
  >
    <Filter size={16} />
    {t('history.filters')}
  </button>
);

export const HistoryFilterPanel: React.FC<HistoryFiltersProps> = ({
  showFilters,
  startDate,
  endDate,
  today,
  typeFilter,
  logTypeFilter,
  prayerFilter,
  onStartDateChange,
  onEndDateChange,
  onTypeFilterChange,
  onLogTypeFilterChange,
  onPrayerFilterChange,
  t,
}) => {
  if (!showFilters) return null;

  return (
    <Card className={styles.filterCard} id="history-filters">
      <div className={styles.filterGrid}>
        <DateFilterPicker
          id="history-start-date"
          label={t('history.date_from')}
          value={startDate}
          max={endDate}
          onChange={onStartDateChange}
        />
        <DateFilterPicker
          id="history-end-date"
          label={t('history.date_to')}
          value={endDate}
          min={startDate}
          max={today}
          onChange={onEndDateChange}
        />

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>{t('history.filter_type')}</label>
          <div className={styles.segmented}>
            {(['all', 'prayers', 'fasting'] as const).map((opt) => (
              <button
                key={opt}
                className={`${styles.segBtn} ${typeFilter === opt ? styles.segBtnActive : ''}`}
                aria-pressed={typeFilter === opt}
                onClick={() => {
                  onTypeFilterChange(opt);
                  if (opt === 'fasting') onPrayerFilterChange('all');
                }}
              >
                {t(`history.filter_${opt}`)}
              </button>
            ))}
          </div>
        </div>

        {typeFilter !== 'fasting' && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{t('history.filter_prayer')}</label>
            <div className={styles.segmented}>
              <button
                className={`${styles.segBtn} ${prayerFilter === 'all' ? styles.segBtnActive : ''}`}
                aria-pressed={prayerFilter === 'all'}
                onClick={() => onPrayerFilterChange('all')}
              >
                {t('history.filter_all')}
              </button>
              {PRAYERS.map((p) => (
                <button
                  key={p}
                  className={`${styles.segBtn} ${prayerFilter === p ? styles.segBtnActive : ''}`}
                  aria-pressed={prayerFilter === p}
                  onClick={() => onPrayerFilterChange(p)}
                >
                  {t(`prayers.${p}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>{t('history.filter_log_type')}</label>
          <div className={styles.segmented}>
            {(['all', 'qadaa', 'obligatory'] as const).map((opt) => (
              <button
                key={opt}
                className={`${styles.segBtn} ${logTypeFilter === opt ? styles.segBtnActive : ''}`}
                aria-pressed={logTypeFilter === opt}
                onClick={() => onLogTypeFilterChange(opt)}
              >
                {t(`history.filter_log_type_${opt}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface HistorySummaryStripProps {
  totalCount: number;
  prayerCount: number;
  fastCount: number;
  typeFilter: 'all' | 'prayers' | 'fasting';
  fmtNumber: (n: number) => string;
  t: (key: string) => string;
}

export const HistorySummaryStrip: React.FC<HistorySummaryStripProps> = ({
  totalCount,
  prayerCount,
  fastCount,
  typeFilter,
  fmtNumber,
  t,
}) => (
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
);
