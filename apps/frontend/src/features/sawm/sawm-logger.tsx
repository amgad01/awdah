import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useLogFast, useDailySawmLog, useDeleteFast } from '@/hooks/use-worship';
import { Check, Loader2, Sun } from 'lucide-react';
import { DayNav } from '@/components/ui/day-nav/day-nav';
import { isoDate, addDays } from '@/utils/date-utils';
import styles from './sawm-logger.module.css';

interface SawmLoggerProps {
  initialDate?: string;
}

export const SawmLogger: React.FC<SawmLoggerProps> = ({ initialDate }) => {
  const { t, language } = useLanguage();
  const today = isoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);

  const { data: logs, isLoading: logsLoading } = useDailySawmLog(selectedDate);
  const logMutation = useLogFast();
  const deleteMutation = useDeleteFast();

  const fastLog = useMemo(() => (logs ?? [])[0] ?? null, [logs]);
  const isLogged = !!fastLog;
  const isPending = logMutation.isPending || deleteMutation.isPending;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  const displayDate = isToday
    ? t('common.today')
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString(
        language === 'ar' ? 'ar-SA' : 'en-GB',
        { weekday: 'short', month: 'short', day: 'numeric' },
      );

  const handleToggle = () => {
    if (isPending || isFuture) return;
    if (isLogged && fastLog) {
      deleteMutation.mutate({ date: selectedDate, eventId: fastLog.eventId });
    } else {
      logMutation.mutate({ date: selectedDate, type: 'qadaa' });
    }
  };

  return (
    <div className={styles.container}>
      <DayNav
        label={displayDate}
        onPrev={() => setSelectedDate(addDays(selectedDate, -1))}
        onNext={() => setSelectedDate(addDays(selectedDate, 1))}
        isNextDisabled={isToday}
      />

      {logsLoading ? (
        <div className={styles.loadingRow}>
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <button
          className={`${styles.logBtn} ${isLogged ? styles.logged : ''} ${isFuture ? styles.disabled : ''}`}
          onClick={handleToggle}
          disabled={isPending || isFuture}
          aria-pressed={isLogged}
        >
          <div className={styles.info}>
            <Sun size={22} className={`${styles.icon} ${isLogged ? styles.iconLogged : ''}`} />
            <span className={styles.text}>
              {isLogged ? t('sawm.fast_logged') : t('sawm.log_fast_today')}
            </span>
          </div>
          <span className={`${styles.checkCircle} ${isLogged ? styles.checkCircleLogged : ''}`}>
            {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          </span>
        </button>
      )}
    </div>
  );
};
