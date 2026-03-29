import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import {
  HIJRI_YEAR_MIN,
  HIJRI_YEAR_MAX,
  HIJRI_MONTHS_COUNT,
  MAX_HIJRI_DAYS_PER_MONTH,
  DOB_MAX_YEARS_AGO,
  HIJRI_MONTH_KEYS,
} from '@/lib/constants';
import { GregorianDateInputs, HijriDateInputs, DualDatePreview } from './hijri-date-picker-parts';
import styles from './hijri-date-picker.module.css';

type CalendarMode = 'gregorian' | 'hijri';

interface HijriDatePickerProps {
  value: string;
  onChange: (hijriDateStr: string) => void;
  onError: (error: string) => void;
  label: string;
  validate?: (date: HijriDate) => string | null;
  initialHijriParts?: { year: string; month: string; day: string };
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export const HijriDatePicker: React.FC<HijriDatePickerProps> = ({
  value,
  onChange,
  onError,
  label,
  validate,
  initialHijriParts,
  minDate,
  maxDate,
  disabled = false,
}) => {
  const { t, language, fmtNumber } = useLanguage();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('gregorian');

  const [gregDay, setGregDay] = useState('');
  const [gregMonth, setGregMonth] = useState('');
  const [gregYear, setGregYear] = useState('');

  const [hijriYear, setHijriYear] = useState(initialHijriParts?.year ?? '');
  const [hijriMonth, setHijriMonth] = useState(initialHijriParts?.month ?? '');
  const [hijriDay, setHijriDay] = useState(initialHijriParts?.day ?? '');

  const gregorianMonthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB', {
          month: 'long',
        }),
      ),
    [language],
  );

  React.useEffect(() => {
    if (!value) return;
    const sep = value.includes('/') ? '/' : '-';
    const parts = value.split(sep);
    if (parts.length !== 3) return;
    const y = parseInt(parts[0] ?? '0', 10);
    const m = parseInt(parts[1] ?? '0', 10);
    const d = parseInt(parts[2] ?? '0', 10);
    if (!hijriYear) {
      setHijriYear(String(y));
      setHijriMonth(String(m));
      setHijriDay(String(d));
    }
    if (!gregYear) {
      try {
        const hijri = new HijriDate(y, m, d);
        const greg = hijri.toGregorian();
        setGregDay(String(greg.getDate()));
        setGregMonth(String(greg.getMonth() + 1));
        setGregYear(String(greg.getFullYear()));
      } catch {
        // ignore invalid dates
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleGregorianParts = (day: string, month: string, year: string) => {
    onError('');
    if (!day || !month || !year || year.length < 4) {
      onChange('');
      return;
    }
    const dateStr = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    try {
      const gregDate = new Date(dateStr + 'T12:00:00');
      if (isNaN(gregDate.getTime())) {
        onError(t('onboarding.error_invalid_date'));
        return;
      }
      const hijri = HijriDate.fromGregorian(gregDate);
      if (minDate) {
        const min = HijriDate.fromString(minDate);
        if (hijri.isBefore(min)) {
          onError(t('onboarding.error_date_before_min'));
          return;
        }
      }
      if (maxDate) {
        const max = HijriDate.fromString(maxDate);
        if (hijri.isAfter(max)) {
          onError(t('onboarding.error_date_after_max'));
          return;
        }
      }
      if (validate) {
        const err = validate(hijri);
        if (err) {
          onError(err);
          return;
        }
      }
      onChange(hijri.toString());
    } catch {
      onError(t('onboarding.error_invalid_date'));
    }
  };

  const handleHijriChange = (y: string, m: string, d: string) => {
    onError('');
    if (!y || !m || !d) {
      onChange('');
      return;
    }
    try {
      const hijri = new HijriDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
      if (minDate) {
        const min = HijriDate.fromString(minDate);
        if (hijri.isBefore(min)) {
          onError(t('onboarding.error_date_before_min'));
          return;
        }
      }
      if (maxDate) {
        const max = HijriDate.fromString(maxDate);
        if (hijri.isAfter(max)) {
          onError(t('onboarding.error_date_after_max'));
          return;
        }
      }
      if (validate) {
        const err = validate(hijri);
        if (err) {
          onError(err);
          return;
        }
      }
      onChange(hijri.toString());
    } catch {
      onError(t('onboarding.error_invalid_date'));
    }
  };

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - DOB_MAX_YEARS_AGO;

  const minGregYear = useMemo(() => {
    if (!minDate) return minYear;
    try {
      return HijriDate.fromString(minDate).toGregorian().getFullYear();
    } catch {
      return minYear;
    }
  }, [minDate, minYear]);

  const minHijriYear = useMemo(() => {
    if (!minDate) return HIJRI_YEAR_MIN;
    try {
      return HijriDate.fromString(minDate).year;
    } catch {
      return HIJRI_YEAR_MIN;
    }
  }, [minDate]);

  const parsedMinDate = useMemo(() => {
    if (!minDate) return null;
    try {
      return HijriDate.fromString(minDate);
    } catch {
      return null;
    }
  }, [minDate]);

  const minHijriMonth = useMemo(() => {
    if (!parsedMinDate || !hijriYear || parseInt(hijriYear, 10) !== parsedMinDate.year) return 1;
    return parsedMinDate.month;
  }, [parsedMinDate, hijriYear]);

  const minHijriDay = useMemo(() => {
    if (!parsedMinDate || !hijriYear || !hijriMonth) return 1;
    const y = parseInt(hijriYear, 10);
    const m = parseInt(hijriMonth, 10);
    if (y === parsedMinDate.year && m === parsedMinDate.month) return parsedMinDate.day;
    return 1;
  }, [parsedMinDate, hijriYear, hijriMonth]);

  const minGregMonth = useMemo(() => {
    if (!parsedMinDate || !gregYear) return 1;
    const gregMin = parsedMinDate.toGregorian();
    if (parseInt(gregYear, 10) !== gregMin.getFullYear()) return 1;
    return gregMin.getMonth() + 1;
  }, [parsedMinDate, gregYear]);

  const minGregDay = useMemo(() => {
    if (!parsedMinDate || !gregYear || !gregMonth) return 1;
    const gregMin = parsedMinDate.toGregorian();
    if (
      parseInt(gregYear, 10) === gregMin.getFullYear() &&
      parseInt(gregMonth, 10) === gregMin.getMonth() + 1
    )
      return gregMin.getDate();
    return 1;
  }, [parsedMinDate, gregYear, gregMonth]);

  const parsedMaxDate = useMemo(() => {
    if (!maxDate) return null;
    try {
      return HijriDate.fromString(maxDate);
    } catch {
      return null;
    }
  }, [maxDate]);

  const maxGregYear = useMemo(() => {
    if (!parsedMaxDate) return currentYear;
    return parsedMaxDate.toGregorian().getFullYear();
  }, [parsedMaxDate, currentYear]);

  const maxHijriYear = useMemo(() => {
    if (!parsedMaxDate) return HIJRI_YEAR_MAX;
    return parsedMaxDate.year;
  }, [parsedMaxDate]);

  const maxHijriMonth = useMemo(() => {
    if (!parsedMaxDate || !hijriYear || parseInt(hijriYear, 10) !== parsedMaxDate.year)
      return undefined;
    return parsedMaxDate.month;
  }, [parsedMaxDate, hijriYear]);

  const maxHijriDay = useMemo(() => {
    if (!parsedMaxDate || !hijriYear || !hijriMonth) return undefined;
    const y = parseInt(hijriYear, 10);
    const m = parseInt(hijriMonth, 10);
    if (y === parsedMaxDate.year && m === parsedMaxDate.month) return parsedMaxDate.day;
    return undefined;
  }, [parsedMaxDate, hijriYear, hijriMonth]);

  const maxGregMonth = useMemo(() => {
    if (!parsedMaxDate || !gregYear) return undefined;
    const gregMax = parsedMaxDate.toGregorian();
    if (parseInt(gregYear, 10) !== gregMax.getFullYear()) return undefined;
    return gregMax.getMonth() + 1;
  }, [parsedMaxDate, gregYear]);

  const maxGregDay = useMemo(() => {
    if (!parsedMaxDate || !gregYear || !gregMonth) return undefined;
    const gregMax = parsedMaxDate.toGregorian();
    if (
      parseInt(gregYear, 10) === gregMax.getFullYear() &&
      parseInt(gregMonth, 10) === gregMax.getMonth() + 1
    )
      return gregMax.getDate();
    return undefined;
  }, [parsedMaxDate, gregYear, gregMonth]);

  return (
    <div className={`${styles.picker} ${disabled ? styles.disabled : ''}`}>
      {disabled ? null : (
        <>
          <div className={styles.calendarToggle}>
            <button
              type="button"
              className={`${styles.calendarToggleBtn} ${calendarMode === 'gregorian' ? styles.selected : ''}`}
              onClick={() => setCalendarMode('gregorian')}
            >
              {t('onboarding.gregorian_input')}
            </button>
            <button
              type="button"
              className={`${styles.calendarToggleBtn} ${calendarMode === 'hijri' ? styles.selected : ''}`}
              onClick={() => setCalendarMode('hijri')}
            >
              {t('onboarding.hijri_input')}
            </button>
          </div>

          {calendarMode === 'gregorian' ? (
            <GregorianDateInputs
              gregDay={gregDay}
              gregMonth={gregMonth}
              gregYear={gregYear}
              onDayChange={(v) => {
                setGregDay(v);
                handleGregorianParts(v, gregMonth, gregYear);
              }}
              onMonthChange={(v) => {
                setGregMonth(v);
                const days =
                  gregYear && v ? new Date(Number(gregYear), Number(v), 0).getDate() : 31;
                const day = gregDay && Number(gregDay) > days ? '' : gregDay;
                if (day !== gregDay) setGregDay('');
                handleGregorianParts(day, v, gregYear);
              }}
              onYearChange={(v) => {
                setGregYear(v);
                const days =
                  v && gregMonth ? new Date(Number(v), Number(gregMonth), 0).getDate() : 31;
                const day = gregDay && Number(gregDay) > days ? '' : gregDay;
                if (day !== gregDay) setGregDay('');
                handleGregorianParts(day, gregMonth, v);
              }}
              gregorianMonthNames={gregorianMonthNames}
              fmtNumber={fmtNumber}
              currentYear={currentYear}
              minYear={minGregYear}
              minMonth={minGregMonth}
              minDay={minGregDay}
              maxYear={maxGregYear}
              maxMonth={maxGregMonth}
              maxDay={maxGregDay}
              ariaLabelYear={label}
              t={t}
            />
          ) : (
            <HijriDateInputs
              hijriYear={hijriYear}
              hijriMonth={hijriMonth}
              hijriDay={hijriDay}
              onYearChange={(v) => {
                setHijriYear(v);
                handleHijriChange(v, hijriMonth, hijriDay);
              }}
              onMonthChange={(v) => {
                setHijriMonth(v);
                handleHijriChange(hijriYear, v, hijriDay);
              }}
              onDayChange={(v) => {
                setHijriDay(v);
                handleHijriChange(hijriYear, hijriMonth, v);
              }}
              hijriYearMin={minHijriYear}
              hijriYearMax={maxHijriYear}
              hijriMonthsCount={HIJRI_MONTHS_COUNT}
              hijriMinMonth={minHijriMonth}
              hijriMinDay={minHijriDay}
              hijriMaxMonth={maxHijriMonth}
              hijriMaxDay={maxHijriDay}
              maxHijriDaysPerMonth={MAX_HIJRI_DAYS_PER_MONTH}
              hijriMonthKeys={HIJRI_MONTH_KEYS}
              fmtNumber={fmtNumber}
              t={t}
            />
          )}
        </>
      )}

      <DualDatePreview
        value={value}
        hijriMonthKeys={HIJRI_MONTH_KEYS}
        language={language}
        fmtNumber={fmtNumber}
        t={t}
      />
    </div>
  );
};
