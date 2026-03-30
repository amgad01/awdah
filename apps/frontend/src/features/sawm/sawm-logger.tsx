import React, { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { useLogFast, useDailySawmLog, useDeleteFast } from '@/hooks/use-worship';
import { useProfile } from '@/hooks/use-profile';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Check, Loader2, Sun, Moon } from 'lucide-react';
import { DayNav } from '@/components/ui/day-nav/day-nav';
import { QUERY_KEYS } from '@/lib/query-keys';
import { todayHijriDate, addHijriDays } from '@/utils/date-utils';
import { HijriDate } from '@awdah/shared';
import styles from './sawm-logger.module.css';
import type { FastLogResponse } from '@/lib/api';

const SUPPRESS_KEY = 'awdah_fast_uncheck_suppress';
const SUPPRESS_MS = 10 * 60 * 1000;

function isSuppressed(): boolean {
  const stored = localStorage.getItem(SUPPRESS_KEY);
  return stored ? Date.now() < parseInt(stored, 10) : false;
}

function setSuppressed(): void {
  localStorage.setItem(SUPPRESS_KEY, String(Date.now() + SUPPRESS_MS));
}

interface SawmLoggerProps {
  initialDate?: string;
}

export const SawmLogger: React.FC<SawmLoggerProps> = ({ initialDate }) => {
  const { t } = useLanguage();
  const { format } = useDualDate();
  const queryClient = useQueryClient();
  const today = todayHijriDate();
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);
  const [pendingUncheck, setPendingUncheck] = useState<FastLogResponse | null>(null);
  const [suppressChecked, setSuppressChecked] = useState(false);

  const { data: profile } = useProfile();
  const birthDate = profile?.dateOfBirth;

  const isBeforeBirth = useMemo(() => {
    if (!birthDate) return false;
    return selectedDate < birthDate;
  }, [selectedDate, birthDate]);

  const isPrevDisabled = useMemo(() => {
    if (!birthDate) return false;
    return selectedDate <= birthDate;
  }, [selectedDate, birthDate]);

  // Derive mode from the selected date — Hijri month 9 = Ramadan
  const isSelectedRamadan = useMemo(() => {
    return HijriDate.fromString(selectedDate).month === 9;
  }, [selectedDate]);

  const fastType = isSelectedRamadan ? 'obligatory' : 'qadaa';

  const { data: logs, isLoading, error, isError } = useDailySawmLog(selectedDate);
  const logMutation = useLogFast();
  const deleteMutation = useDeleteFast();

  const fastLog = useMemo(() => {
    return (logs ?? []).find((log) => log.type === fastType) ?? null;
  }, [logs, fastType]);

  const isLogged = !!fastLog;
  const isPending = logMutation.isPending || deleteMutation.isPending;
  const isFuture = selectedDate > today;

  const navDual = useMemo(() => format(selectedDate), [format, selectedDate]);

  const fastLabel = isLogged
    ? t(isSelectedRamadan ? 'sawm.fast_ramadan_logged' : 'sawm.fast_logged')
    : t(isSelectedRamadan ? 'sawm.fast_today_ramadan' : 'sawm.log_fast_today');

  const handleToggle = useCallback(() => {
    if (isPending || isFuture) return;
    if (isLogged && fastLog) {
      if (isSuppressed()) {
        deleteMutation.mutate({ date: selectedDate, eventId: fastLog.eventId });
      } else {
        setPendingUncheck(fastLog);
        setSuppressChecked(false);
      }
    } else {
      logMutation.mutate({ date: selectedDate, type: fastType });
    }
  }, [isPending, isFuture, isLogged, fastLog, selectedDate, fastType, deleteMutation, logMutation]);

  const confirmUncheck = () => {
    if (!pendingUncheck) return;
    if (suppressChecked) setSuppressed();
    deleteMutation.mutate({ date: selectedDate, eventId: pendingUncheck.eventId });
    setPendingUncheck(null);
  };

  return (
    <div className={styles.container}>
      {/* Date navigation */}
      <DayNav
        label={navDual.primary}
        sublabel={navDual.secondary}
        onPrev={() => setSelectedDate(addHijriDays(selectedDate, -1))}
        onNext={() => setSelectedDate(addHijriDays(selectedDate, 1))}
        isNextDisabled={selectedDate >= today}
        isPrevDisabled={isPrevDisabled}
      />

      {/* Mode badge */}
      <div
        className={`${styles.modeBadge} ${isSelectedRamadan ? styles.modeBadgeRamadan : styles.modeBadgeQadaa}`}
      >
        {isSelectedRamadan ? (
          <>
            <Moon size={12} aria-hidden="true" />
            {t('sawm.mode_ramadan')}
          </>
        ) : (
          <>
            <Sun size={12} aria-hidden="true" />
            {t('sawm.mode_qadaa')}
          </>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingRow}>
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : isError ? (
        <ErrorState
          compact
          message={error instanceof Error ? error.message : t('common.error')}
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDailyLog(selectedDate) })
          }
        />
      ) : isBeforeBirth ? (
        <div className={styles.beforeBirthPlaceholder}>
          <p>{t('sawm.before_birth_error')}</p>
        </div>
      ) : (
        <>
          <button
            className={`${styles.logBtn} ${isLogged ? styles.logged : ''} ${isFuture || isBeforeBirth ? styles.disabled : ''}`}
            onClick={handleToggle}
            disabled={isPending || isFuture || isBeforeBirth}
            aria-pressed={isLogged}
          >
            <div className={styles.info}>
              {isSelectedRamadan ? (
                <Moon size={22} className={`${styles.icon} ${isLogged ? styles.iconLogged : ''}`} />
              ) : (
                <Sun size={22} className={`${styles.icon} ${isLogged ? styles.iconLogged : ''}`} />
              )}
              <span className={styles.text}>{fastLabel}</span>
            </div>
            <span className={`${styles.checkCircle} ${isLogged ? styles.checkCircleLogged : ''}`}>
              {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            </span>
          </button>

          {pendingUncheck && (
            <div className={styles.uncheckConfirm} role="alert">
              <p className={styles.uncheckMsg}>{t('common.uncheck_confirm')}</p>
              <label className={styles.suppressLabel}>
                <input
                  type="checkbox"
                  checked={suppressChecked}
                  onChange={(e) => setSuppressChecked(e.target.checked)}
                />
                <span>{t('common.suppress_10min')}</span>
              </label>
              <div className={styles.uncheckActions}>
                <button className={styles.cancelBtn} onClick={() => setPendingUncheck(null)}>
                  {t('common.cancel')}
                </button>
                <button className={styles.confirmBtn} onClick={confirmUncheck}>
                  {t('common.confirm_uncheck')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
