import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { HijriDate } from '@awdah/shared';
import { useLanguage } from '@/hooks/use-language';
import { gregorianIsoToHijri, hijriToGregorianDate } from '@/utils/date-utils';
import { HIJRI_MONTH_KEYS } from '@/lib/constants';
import {
  hijriDaysInMonth,
  hijriFirstWeekday,
  gregorianDaysInMonth,
  gregorianFirstWeekday,
} from './date-filter-picker-helpers';
import styles from './date-filter-picker.module.css';

interface DateFilterPickerProps {
  value: string; // Hijri date string YYYY-MM-DD
  onChange: (hijriDate: string) => void;
  min?: string; // Hijri date string
  max?: string; // Hijri date string
  label: string;
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DateFilterPicker: React.FC<DateFilterPickerProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  id,
}) => {
  const { t, language, fmtNumber, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const [open, setOpen] = useState(false);

  // ── Calendar navigation state ──────────────────────────────────────────────
  const [navYear, setNavYear] = useState<number>(() => {
    try {
      if (isArabic) {
        return HijriDate.fromString(value).year;
      }
      return hijriToGregorianDate(value).getUTCFullYear();
    } catch {
      return isArabic ? HijriDate.today().year : new Date().getUTCFullYear();
    }
  });
  const [navMonth, setNavMonth] = useState<number>(() => {
    try {
      if (isArabic) {
        return HijriDate.fromString(value).month;
      }
      return hijriToGregorianDate(value).getUTCMonth() + 1;
    } catch {
      return isArabic ? HijriDate.today().month : new Date().getUTCMonth() + 1;
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync nav state when value changes externally
  useEffect(() => {
    try {
      if (isArabic) {
        const h = HijriDate.fromString(value);
        setNavYear(h.year);
        setNavMonth(h.month);
      } else {
        const g = hijriToGregorianDate(value);
        setNavYear(g.getUTCFullYear());
        setNavMonth(g.getUTCMonth() + 1);
      }
    } catch {
      /* ignore */
    }
  }, [value, isArabic]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;

    const handleDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // ── Display label for trigger button ──────────────────────────────────────
  const displayLabel = (() => {
    try {
      const greg = hijriToGregorianDate(value);
      if (isArabic) {
        const h = HijriDate.fromString(value);
        // Format: "١٥ رمضان ١٤٤٥"
        return h.format('ar');
      }
      return greg.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return value;
    }
  })();

  // ── Month navigation ───────────────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    setNavMonth((m) => {
      if (m === 1) {
        setNavYear((y) => y - 1);
        return isArabic ? 12 : 12;
      }
      return m - 1;
    });
  }, [isArabic]);

  const nextMonth = useCallback(() => {
    setNavMonth((m) => {
      if (m === (isArabic ? 12 : 12)) {
        setNavYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, [isArabic]);

  // ── Select a day ──────────────────────────────────────────────────────────
  const selectDay = useCallback(
    (day: number) => {
      let hijriStr: string;
      if (isArabic) {
        hijriStr = new HijriDate(navYear, navMonth, day).toString();
      } else {
        const iso = `${navYear}-${String(navMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        hijriStr = gregorianIsoToHijri(iso);
      }
      onChange(hijriStr);
      setOpen(false);
    },
    [isArabic, navYear, navMonth, onChange],
  );

  // ── Build calendar grid ────────────────────────────────────────────────────
  const daysInMonth = isArabic
    ? hijriDaysInMonth(navYear, navMonth)
    : gregorianDaysInMonth(navYear, navMonth);

  const firstWeekday = isArabic
    ? hijriFirstWeekday(navYear, navMonth)
    : gregorianFirstWeekday(navYear, navMonth);

  // Convert current value to (year, month, day) for highlighting selected cell
  let selectedYear = 0,
    selectedMonth = 0,
    selectedDay = 0;
  try {
    if (isArabic) {
      const h = HijriDate.fromString(value);
      selectedYear = h.year;
      selectedMonth = h.month;
      selectedDay = h.day;
    } else {
      const g = hijriToGregorianDate(value);
      selectedYear = g.getUTCFullYear();
      selectedMonth = g.getUTCMonth() + 1;
      selectedDay = g.getUTCDate();
    }
  } catch {
    /* empty */
  }

  // Is a specific day disabled (outside min/max)?
  const isDayDisabled = (day: number): boolean => {
    try {
      let dayHijri: HijriDate;
      if (isArabic) {
        dayHijri = new HijriDate(navYear, navMonth, day);
      } else {
        const iso = `${navYear}-${String(navMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayHijri = HijriDate.fromGregorian(new Date(iso + 'T12:00:00Z'));
      }
      if (min && dayHijri.isBefore(HijriDate.fromString(min))) return true;
      if (max && dayHijri.isAfter(HijriDate.fromString(max))) return true;
    } catch {
      return true;
    }
    return false;
  };

  // Month header label
  const monthHeader = isArabic
    ? `${fmtNumber(navYear)} ${t(HIJRI_MONTH_KEYS[navMonth - 1])}`
    : new Date(Date.UTC(navYear, navMonth - 1, 1)).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });

  // Weekday labels
  const weekdayLabels = isArabic
    ? ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  // Adjust offset: our grid starts Monday (index 0 = Mon). JS getDay(): 0=Sun, 1=Mon…
  // For Mon-first grid: offset = (firstWeekday + 6) % 7
  const gridOffset = (firstWeekday + 6) % 7;

  const totalCells = gridOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>
        <CalendarDays size={14} />
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${label}: ${displayLabel}`}
        data-testid={id ? `${id}-trigger` : undefined}
      >
        {displayLabel}
        <span className={styles.triggerIcon} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={label}
          className={`${styles.popover} ${isRTL ? styles.popoverRtl : ''}`}
        >
          {/* Month navigation header */}
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={isRTL ? nextMonth : prevMonth}
              aria-label={t('common.prev_month')}
            >
              {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <span className={styles.monthLabel}>{monthHeader}</span>
            <button
              type="button"
              className={styles.navBtn}
              onClick={isRTL ? prevMonth : nextMonth}
              aria-label={t('common.next_month')}
            >
              {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Day-of-week header */}
          <div className={styles.weekRow}>
            {weekdayLabels.map((d) => (
              <span key={d} className={styles.weekDay}>
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div
            className={`${styles.grid} ${rows === 6 ? styles.gridSixRows : styles.gridFiveRows}`}
          >
            {/* Leading empty cells */}
            {Array.from({ length: gridOffset }, (_, i) => (
              <span key={`e-${i}`} />
            ))}
            {/* Day buttons */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isSelected =
                selectedYear === navYear && selectedMonth === navMonth && selectedDay === day;
              const disabled = isDayDisabled(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={`${styles.day} ${isSelected ? styles.daySelected : ''} ${disabled ? styles.dayDisabled : ''}`}
                  onClick={() => !disabled && selectDay(day)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`${fmtNumber(day)} ${monthHeader}`}
                >
                  {fmtNumber(day)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
