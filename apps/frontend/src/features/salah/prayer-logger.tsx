import React, { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { useLogPrayer, useDailyPrayerLogs, useDeletePrayer } from '@/hooks/use-worship';
import { useProfile } from '@/hooks/use-profile';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import { DayNav } from '@/components/ui/day-nav/day-nav';
import { QUERY_KEYS } from '@/lib/query-keys';
import { todayHijriDate, addHijriDays } from '@/utils/date-utils';
import { PRAYERS } from '@/lib/constants';
import styles from './prayer-logger.module.css';
import type { PrayerLogResponse } from '@/lib/api';
const SUPPRESS_KEY = 'awdah_prayer_uncheck_suppress';
const SUPPRESS_MS = 10 * 60 * 1000;

function isSuppressed(): boolean {
  const stored = localStorage.getItem(SUPPRESS_KEY);
  return stored ? Date.now() < parseInt(stored, 10) : false;
}

function setSuppressed(): void {
  localStorage.setItem(SUPPRESS_KEY, String(Date.now() + SUPPRESS_MS));
}

type Tab = 'daily' | 'qadaa';

interface PendingUncheck {
  prayerName: string;
  log: PrayerLogResponse;
}

interface PrayerLoggerProps {
  initialDate?: string;
  defaultTab?: Tab;
}

export const PrayerLogger: React.FC<PrayerLoggerProps> = ({
  initialDate,
  defaultTab = 'daily',
}) => {
  const { t, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const queryClient = useQueryClient();
  const today = todayHijriDate();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [dailyDate, setDailyDate] = useState(initialDate ?? today);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);
  const [pendingUncheck, setPendingUncheck] = useState<PendingUncheck | null>(null);
  const [suppressChecked, setSuppressChecked] = useState(false);

  const activeDate = tab === 'daily' ? dailyDate : selectedDate;

  const { data: profile } = useProfile();
  const birthDate = profile?.dateOfBirth;

  const { data: logs, isLoading, error, isError } = useDailyPrayerLogs(activeDate);
  const logMutation = useLogPrayer();
  const deleteMutation = useDeletePrayer();
  const actionError = logMutation.error || deleteMutation.error;

  // Daily mode — single obligatory entry per prayer
  const loggedMap = useMemo(() => {
    if (tab !== 'daily') return {} as Record<string, PrayerLogResponse>;
    return (logs ?? [])
      .filter((l) => l.type === 'obligatory')
      .reduce((acc: Record<string, PrayerLogResponse>, log) => {
        acc[log.prayerName] = log;
        return acc;
      }, {});
  }, [logs, tab]);

  // Qadaa mode — all entries grouped by prayer name (supports multiple per prayer per day)
  const qadaaLogsMap = useMemo(() => {
    if (tab !== 'qadaa') return {} as Record<string, PrayerLogResponse[]>;
    return (logs ?? [])
      .filter((l) => l.type === 'qadaa')
      .reduce((acc: Record<string, PrayerLogResponse[]>, log) => {
        if (!acc[log.prayerName]) acc[log.prayerName] = [];
        acc[log.prayerName].push(log);
        return acc;
      }, {});
  }, [logs, tab]);

  const isPending = logMutation.isPending || deleteMutation.isPending;
  const isFuture = selectedDate > today;
  const isDailyFuture = dailyDate > today;

  const isBeforeBirth = useMemo(() => {
    if (!birthDate) return false;
    return activeDate < birthDate;
  }, [activeDate, birthDate]);

  const isPrevDisabled = useMemo(() => {
    if (!birthDate) return false;
    return activeDate <= birthDate;
  }, [activeDate, birthDate]);

  const navDual = useMemo(() => format(selectedDate), [format, selectedDate]);
  const dailyNavDual = useMemo(() => format(dailyDate), [format, dailyDate]);

  // ── Daily toggle ──
  const handleDailyToggle = useCallback(
    (prayerName: string) => {
      if (isPending || isDailyFuture) return;
      const existing = loggedMap[prayerName];
      if (existing) {
        if (isSuppressed()) {
          deleteMutation.mutate({ date: dailyDate, prayerName, eventId: existing.eventId });
        } else {
          setPendingUncheck({ prayerName, log: existing });
          setSuppressChecked(false);
        }
      } else {
        logMutation.mutate({ date: dailyDate, prayerName, type: 'obligatory' });
      }
    },
    [isPending, isDailyFuture, loggedMap, dailyDate, deleteMutation, logMutation],
  );

  // ── Qadaa increment / decrement ──
  const handleQadaaIncrement = useCallback(
    (prayerName: string) => {
      if (isPending || isFuture) return;
      logMutation.mutate({ date: selectedDate, prayerName, type: 'qadaa' });
    },
    [isPending, isFuture, selectedDate, logMutation],
  );

  const handleQadaaDecrement = useCallback(
    (prayerName: string) => {
      if (isPending || isFuture) return;
      const entries = qadaaLogsMap[prayerName];
      if (!entries || entries.length === 0) return;
      const lastEntry = entries[entries.length - 1];
      deleteMutation.mutate({ date: selectedDate, prayerName, eventId: lastEntry.eventId });
    },
    [isPending, isFuture, selectedDate, qadaaLogsMap, deleteMutation],
  );

  const confirmUncheck = () => {
    if (!pendingUncheck) return;
    if (suppressChecked) setSuppressed();
    deleteMutation.mutate({
      date: dailyDate,
      prayerName: pendingUncheck.prayerName,
      eventId: pendingUncheck.log.eventId,
    });
    setPendingUncheck(null);
  };

  const markedCount = Object.keys(loggedMap).length;
  const totalQadaaCount = Object.values(qadaaLogsMap).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label={t('salah.tab_daily')}>
        <button
          role="tab"
          id="salah-tab-daily"
          aria-selected={tab === 'daily'}
          aria-controls="salah-panel-daily"
          className={`${styles.tab} ${tab === 'daily' ? styles.tabActive : ''}`}
          onClick={() => {
            setTab('daily');
            setPendingUncheck(null);
          }}
        >
          {t('salah.tab_daily')}
        </button>
        <button
          role="tab"
          id="salah-tab-qadaa"
          aria-selected={tab === 'qadaa'}
          aria-controls="salah-panel-qadaa"
          className={`${styles.tab} ${tab === 'qadaa' ? styles.tabActive : ''}`}
          onClick={() => {
            setTab('qadaa');
            setPendingUncheck(null);
          }}
        >
          {t('salah.tab_qadaa')}
        </button>
      </div>

      {/* Date header */}
      {tab === 'qadaa' ? (
        <DayNav
          label={navDual.primary}
          sublabel={navDual.secondary}
          onPrev={() => setSelectedDate(addHijriDays(selectedDate, -1))}
          onNext={() => setSelectedDate(addHijriDays(selectedDate, 1))}
          isNextDisabled={selectedDate >= today}
          isPrevDisabled={isPrevDisabled}
        />
      ) : (
        <DayNav
          label={dailyNavDual.primary}
          sublabel={dailyNavDual.secondary}
          onPrev={() => setDailyDate(addHijriDays(dailyDate, -1))}
          onNext={() => setDailyDate(addHijriDays(dailyDate, 1))}
          isNextDisabled={dailyDate >= today}
          isPrevDisabled={isPrevDisabled}
          trailing={
            <span className={styles.dailyCount}>
              {fmtNumber(markedCount)}/{fmtNumber(5)} {t('common.prayed')}
            </span>
          }
        />
      )}

      {isLoading ? (
        <div className={styles.loadingRow}>
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : isError ? (
        <ErrorState
          compact
          message={error instanceof Error ? error.message : t('common.error')}
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDailyLogs(activeDate) })
          }
        />
      ) : isBeforeBirth ? (
        <div className={styles.beforeBirthPlaceholder}>
          <p>{t('salah.before_birth_error')}</p>
        </div>
      ) : tab === 'daily' ? (
        /* ── Daily mode — toggle per prayer ── */
        <div
          id="salah-panel-daily"
          role="tabpanel"
          aria-labelledby="salah-tab-daily"
          className={styles.prayers}
        >
          {isDailyFuture && <p className={styles.futureNote}>{t('salah.future_date_note')}</p>}
          {PRAYERS.map((prayer) => {
            const isLogged = !!loggedMap[prayer];
            const isPendingThis = pendingUncheck?.prayerName === prayer;
            return (
              <React.Fragment key={prayer}>
                <div
                  className={`${styles.prayerBtn} ${isLogged ? styles.logged : ''} ${isDailyFuture ? styles.disabled : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isLogged}
                  onClick={() => {
                    if (isPending || isDailyFuture || isBeforeBirth || isLogged) return;
                    handleDailyToggle(prayer);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!isPending && !isDailyFuture && !isBeforeBirth && !isLogged) {
                        handleDailyToggle(prayer);
                      }
                    }
                  }}
                >
                  <span className={styles.prayerName}>{t(`prayers.${prayer}`)}</span>
                  <button
                    type="button"
                    className={`${styles.checkCircle} ${isLogged ? styles.checkCircleLogged : ''}`}
                    aria-label={
                      isLogged
                        ? `${t('common.confirm_uncheck')} ${t(`prayers.${prayer}`)}`
                        : `${t(`prayers.${prayer}`)}`
                    }
                    disabled={isPending || isDailyFuture || isBeforeBirth}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDailyToggle(prayer);
                    }}
                  >
                    {isPending && isPendingThis ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                </div>

                {isPendingThis && (
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
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        /* ── Qadaa mode — counter per prayer ── */
        <div
          id="salah-panel-qadaa"
          role="tabpanel"
          aria-labelledby="salah-tab-qadaa"
          className={styles.prayers}
        >
          {isFuture && <p className={styles.futureNote}>{t('salah.future_date_note')}</p>}
          {PRAYERS.map((prayer) => {
            const entries = qadaaLogsMap[prayer] ?? [];
            const count = entries.length;
            return (
              <div
                key={prayer}
                className={`${styles.qadaaRow} ${count > 0 ? styles.qadaaRowActive : ''} ${isFuture ? styles.disabled : ''}`}
              >
                <span className={styles.prayerName}>{t(`prayers.${prayer}`)}</span>
                <div
                  className={styles.qadaaCounter}
                  aria-label={`${t(`prayers.${prayer}`)}: ${fmtNumber(count)}`}
                >
                  <button
                    className={styles.qadaaBtn}
                    onClick={() => handleQadaaDecrement(prayer)}
                    disabled={isPending || count === 0 || isFuture}
                    aria-label={`${t('salah.qadaa_decrement')} ${t(`prayers.${prayer}`)}`}
                    type="button"
                  >
                    <Minus size={14} />
                  </button>
                  <span className={styles.qadaaCount}>{fmtNumber(count)}</span>
                  <button
                    className={styles.qadaaBtn}
                    onClick={() => handleQadaaIncrement(prayer)}
                    disabled={isPending || isFuture || isBeforeBirth}
                    aria-label={`${t('salah.qadaa_increment')} ${t(`prayers.${prayer}`)}`}
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {totalQadaaCount > 0 && (
            <p className={styles.qadaaTotalNote}>
              {fmtNumber(totalQadaaCount)} {t('salah.qadaa_total_logged')}
            </p>
          )}
        </div>
      )}

      {actionError ? (
        <p className={styles.actionError} role="alert">
          {actionError instanceof Error ? actionError.message : t('common.error')}
        </p>
      ) : null}
    </div>
  );
};
