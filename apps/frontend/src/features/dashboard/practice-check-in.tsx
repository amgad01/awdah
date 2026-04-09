import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { useLogPrayer, useSalahHistory } from '@/hooks/use-worship';
import { isLocalStorageExpiryActive, writeLocalStorageExpiry } from '@/utils/local-storage';
import { todayHijriDate, addHijriDays } from '@/utils/date-utils';
import { PRAYERS } from '@/lib/constants';
import { PracticeCheckInModal } from './practice-check-in-modal';
import styles from './practice-check-in.module.css';

const DISMISS_KEY = 'awdah_practice_checkin_dismissed_until';
const DISMISS_DAYS = 30;
const MIN_PERIOD_AGE_DAYS = 14;
const QADAA_LOG_BATCH_SIZE = 5;

function isDismissed(): boolean {
  return isLocalStorageExpiryActive(DISMISS_KEY);
}

function setDismissedUntil(): void {
  writeLocalStorageExpiry(DISMISS_KEY, DISMISS_DAYS * 86_400_000);
}

type PrayerName = (typeof PRAYERS)[number];
type PrayerCounts = Record<PrayerName, number>;

function zeroCounts(): PrayerCounts {
  return Object.fromEntries(PRAYERS.map((p) => [p, 0])) as PrayerCounts;
}

async function runInBatches<T>(tasks: Array<() => Promise<T>>, batchSize: number): Promise<void> {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const results = await Promise.allSettled(tasks.slice(i, i + batchSize).map((task) => task()));
    const failedResult = results.find((result) => result.status === 'rejected');

    if (failedResult?.status === 'rejected') {
      throw failedResult.reason;
    }
  }
}

/**
 * Gentle amber banner shown when the user has an open-ended practicing period
 * that started 14+ days ago. Shown once every 30 days.
 *
 * Three actions:
 *   "Quick-add prayers" opens a modal to log any missed qadaa prayers on the spot.
 *   "Update my periods" navigates to Settings to adjust the practicing period.
 *   "Still going" dismisses for 30 days with no changes.
 *
 * The quick-add modal shows the 5 prayers with +/- counters. On submit it logs
 * each prayer as qadaa for today, then dismisses the banner.
 */
export const PracticeCheckIn: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const navigate = useNavigate();
  const { data: periods } = usePracticingPeriods();
  const [dismissed, setLocalDismissed] = useState(() => isDismissed());
  const [showModal, setShowModal] = useState(false);
  const [counts, setCounts] = useState<PrayerCounts>(zeroCounts);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const today = useMemo(() => todayHijriDate(), []);
  const lookbackStart = useMemo(() => addHijriDays(today, -30), [today]);
  const oldEnoughCutoff = useMemo(() => addHijriDays(today, -MIN_PERIOD_AGE_DAYS), [today]);

  // Fetch 30 days of history to find the most recent qadaa entry date to show in the modal.
  const { data: recentHistory } = useSalahHistory(lookbackStart, today);
  const logMutation = useLogPrayer();

  const lastQadaaDate = useMemo(() => {
    return (
      (recentHistory ?? [])
        .filter((l) => l.type === 'qadaa')
        .map((l) => l.date)
        .sort()
        .at(-1) ?? null
    );
  }, [recentHistory]);

  const totalToLog = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts]);

  const hasOldOngoingPeriod = useMemo(
    () => (periods ?? []).some((p) => !p.endDate && p.startDate <= oldEnoughCutoff),
    [periods, oldEnoughCutoff],
  );

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setShowModal(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal, submitting]);

  if (dismissed || !hasOldOngoingPeriod) return null;

  const handleStillGoing = () => {
    setDismissedUntil();
    setLocalDismissed(true);
  };

  const handleUpdate = () => {
    setDismissedUntil();
    setLocalDismissed(true);
    navigate('/settings');
  };

  const handleOpenModal = () => {
    setCounts(zeroCounts());
    setDone(false);
    setSubmitError(false);
    setShowModal(true);
  };

  const handleClose = () => {
    if (!submitting) setShowModal(false);
  };

  const increment = (p: PrayerName) => setCounts((c) => ({ ...c, [p]: c[p] + 1 }));
  const decrement = (p: PrayerName) => setCounts((c) => ({ ...c, [p]: Math.max(0, c[p] - 1) }));

  const handleSubmit = async () => {
    if (totalToLog === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const tasks = PRAYERS.flatMap((prayer) =>
        Array.from(
          { length: counts[prayer] },
          () => () => logMutation.mutateAsync({ date: today, prayerName: prayer, type: 'qadaa' }),
        ),
      );

      await runInBatches(tasks, QADAA_LOG_BATCH_SIZE);

      setDone(true);
      setTimeout(() => {
        setDismissedUntil();
        setLocalDismissed(true);
        setShowModal(false);
      }, 1500);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.banner} role="status" aria-label={t('dashboard.check_in_title')}>
        <div className={styles.content}>
          <p className={styles.title}>{t('dashboard.check_in_title')}</p>
          <p className={styles.body}>{t('dashboard.check_in_body')}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.quickAddBtn} onClick={handleOpenModal} type="button">
            {t('dashboard.check_in_quick_add')}
          </button>
          <button className={styles.updateBtn} onClick={handleUpdate} type="button">
            {t('dashboard.check_in_update')}
          </button>
          <button className={styles.stillGoingBtn} onClick={handleStillGoing} type="button">
            {t('dashboard.check_in_still_going')}
          </button>
        </div>
      </div>

      {showModal && (
        <PracticeCheckInModal
          counts={counts}
          submitting={submitting}
          done={done}
          submitError={submitError}
          totalToLog={totalToLog}
          lastEntryDate={lastQadaaDate}
          onClose={handleClose}
          onIncrement={increment}
          onDecrement={decrement}
          onSubmit={handleSubmit}
          fmtNumber={fmtNumber}
          t={t}
        />
      )}
    </>
  );
};
