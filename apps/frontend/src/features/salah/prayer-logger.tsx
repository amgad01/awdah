import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useLogPrayer, useDailyPrayerLogs, useDeletePrayer } from '@/hooks/use-worship';
import { Check, Loader2 } from 'lucide-react';
import { DayNav } from '@/components/ui/day-nav/day-nav';
import { isoDate, addDays } from '@/utils/date-utils';
import styles from './prayer-logger.module.css';
import type { PrayerLogResponse } from '@/lib/api';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

interface PrayerLoggerProps {
  initialDate?: string;
}

export const PrayerLogger: React.FC<PrayerLoggerProps> = ({ initialDate }) => {
  const { t, language, fmtNumber } = useLanguage();
  const today = isoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);

  const { data: logs, isLoading: logsLoading } = useDailyPrayerLogs(selectedDate);
  const logMutation = useLogPrayer();
  const deleteMutation = useDeletePrayer();

  const loggedMap = useMemo(() => {
    return (logs ?? []).reduce((acc: Record<string, PrayerLogResponse>, log) => {
      acc[log.prayerName] = log;
      return acc;
    }, {});
  }, [logs]);

  const isPending = logMutation.isPending || deleteMutation.isPending;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  const displayDate = isToday
    ? t('common.today')
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString(
        language === 'ar' ? 'ar-SA' : 'en-GB',
        { weekday: 'short', month: 'short', day: 'numeric' },
      );

  const handleToggle = (prayerName: string) => {
    if (isPending || isFuture) return;
    const existing = loggedMap[prayerName];
    if (existing) {
      deleteMutation.mutate({ date: selectedDate, prayerName, eventId: existing.eventId });
    } else {
      logMutation.mutate({ date: selectedDate, prayerName, type: 'qadaa' });
    }
  };

  const markedCount = Object.keys(loggedMap).length;

  return (
    <div className={styles.container}>
      <DayNav
        label={displayDate}
        sublabel={isFuture ? undefined : `${fmtNumber(markedCount)}/5 ${t('common.prayed')}`}
        onPrev={() => setSelectedDate(addDays(selectedDate, -1))}
        onNext={() => setSelectedDate(addDays(selectedDate, 1))}
        isNextDisabled={isToday}
      />

      {logsLoading ? (
        <div className={styles.loadingRow}>
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className={styles.prayers}>
          {PRAYERS.map((prayer) => {
            const isLogged = !!loggedMap[prayer];
            return (
              <button
                key={prayer}
                className={`${styles.prayerBtn} ${isLogged ? styles.logged : ''} ${isFuture ? styles.disabled : ''}`}
                onClick={() => handleToggle(prayer)}
                disabled={isPending || isFuture}
                aria-pressed={isLogged}
              >
                <span className={styles.prayerName}>{t(`prayers.${prayer}`)}</span>
                <span
                  className={`${styles.checkCircle} ${isLogged ? styles.checkCircleLogged : ''}`}
                  aria-hidden="true"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
