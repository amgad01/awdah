import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { PRAYERS } from '@/lib/constants';
import styles from './practice-check-in.module.css';

type PrayerName = (typeof PRAYERS)[number];
type PrayerCounts = Record<PrayerName, number>;

interface PracticeCheckInModalProps {
  counts: PrayerCounts;
  submitting: boolean;
  done: boolean;
  submitError: boolean;
  totalToLog: number;
  lastEntryLabel: string | null;
  onClose: () => void;
  onIncrement: (prayer: PrayerName) => void;
  onDecrement: (prayer: PrayerName) => void;
  onSubmit: () => void;
  fmtNumber: (n: number) => string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export const PracticeCheckInModal: React.FC<PracticeCheckInModalProps> = ({
  counts,
  submitting,
  done,
  submitError,
  totalToLog,
  lastEntryLabel,
  onClose,
  onIncrement,
  onDecrement,
  onSubmit,
  fmtNumber,
  t,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={onClose} aria-hidden="true">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-dialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.dialogHeader}>
          <h2 id="checkin-dialog-title" className={styles.dialogTitle}>
            {t('dashboard.check_in_modal_title')}
          </h2>
          <p className={styles.dialogSub}>
            {lastEntryLabel
              ? t('dashboard.check_in_since', { date: lastEntryLabel })
              : t('dashboard.check_in_no_prior')}
          </p>
        </header>

        <div
          className={styles.prayerGrid}
          role="group"
          aria-label={t('dashboard.check_in_modal_title')}
        >
          {PRAYERS.map((prayer) => (
            <div key={prayer} className={styles.prayerRow}>
              <span className={styles.prayerName}>{t(`prayers.${prayer}`)}</span>
              <div className={styles.counter}>
                <button
                  type="button"
                  className={styles.counterBtn}
                  onClick={() => onDecrement(prayer)}
                  disabled={counts[prayer] === 0 || submitting}
                  aria-label={`− ${t(`prayers.${prayer}`)}`}
                >
                  <Minus size={14} />
                </button>
                <span className={styles.counterVal} aria-live="polite">
                  {fmtNumber(counts[prayer])}
                </span>
                <button
                  type="button"
                  className={styles.counterBtn}
                  onClick={() => onIncrement(prayer)}
                  disabled={submitting}
                  aria-label={`+ ${t(`prayers.${prayer}`)}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {submitError && (
          <p className={styles.errorMsg} role="alert">
            {t('common.error')}
          </p>
        )}

        {done && (
          <p className={styles.doneMsg} role="status">
            {t('dashboard.check_in_done')}
          </p>
        )}

        <footer className={styles.dialogFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={onSubmit}
            disabled={totalToLog === 0 || submitting || done}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('dashboard.check_in_log_btn', { n: fmtNumber(totalToLog) })
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
