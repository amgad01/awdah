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
import styles from './hijri-date-picker.module.css';

type CalendarMode = 'gregorian' | 'hijri';

interface HijriDatePickerProps {
  value: string;
  onChange: (hijriDateStr: string) => void;
  onError: (error: string) => void;
  label: string;
  validate?: (date: HijriDate) => string | null;
  initialHijriParts?: { year: string; month: string; day: string };
}

export const HijriDatePicker: React.FC<HijriDatePickerProps> = ({
  value,
  onChange,
  onError,
  label,
  validate,
  initialHijriParts,
}) => {
  const { t, language, fmtNumber } = useLanguage();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('gregorian');

  // Gregorian fields — stored as separate day/month/year for full i18n control
  const [gregDay, setGregDay] = useState('');
  const [gregMonth, setGregMonth] = useState(''); // "1"–"12"
  const [gregYear, setGregYear] = useState('');

  // Hijri fields
  const [hijriYear, setHijriYear] = useState(initialHijriParts?.year ?? '');
  const [hijriMonth, setHijriMonth] = useState(initialHijriParts?.month ?? '');
  const [hijriDay, setHijriDay] = useState(initialHijriParts?.day ?? '');

  // Localised Gregorian month names using Intl — updates automatically on language change
  const gregorianMonthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB', {
          month: 'long',
        }),
      ),
    [language],
  );

  // Initialise both Hijri and Gregorian fields from the stored value when editing
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

  return (
    <div className={styles.picker}>
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
        <div className={styles.hijriRow}>
          {/* Month */}
          <select
            className={styles.select}
            value={gregMonth}
            onChange={(e) => {
              const v = e.target.value;
              setGregMonth(v);
              handleGregorianParts(gregDay, v, gregYear);
            }}
            aria-label={t('onboarding.select_month')}
          >
            <option value="">{t('onboarding.select_month')}</option>
            {gregorianMonthNames.map((name, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
          {/* Day */}
          <select
            className={styles.select}
            value={gregDay}
            onChange={(e) => {
              const v = e.target.value;
              setGregDay(v);
              handleGregorianParts(v, gregMonth, gregYear);
            }}
            aria-label={t('onboarding.select_day')}
          >
            <option value="">{t('onboarding.select_day')}</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {fmtNumber(i + 1)}
              </option>
            ))}
          </select>
          {/* Year */}
          <select
            className={styles.select}
            value={gregYear}
            onChange={(e) => {
              const v = e.target.value;
              setGregYear(v);
              handleGregorianParts(gregDay, gregMonth, v);
            }}
            aria-label={label}
          >
            <option value="">{t('onboarding.greg_year_placeholder')}</option>
            {Array.from({ length: currentYear - minYear + 1 }, (_, i) => {
              const y = currentYear - i;
              return (
                <option key={y} value={String(y)}>
                  {fmtNumber(y)}
                </option>
              );
            })}
          </select>
        </div>
      ) : (
        <div className={styles.hijriRow}>
          <select
            className={styles.select}
            value={hijriMonth}
            onChange={(e) => {
              const v = e.target.value;
              setHijriMonth(v);
              handleHijriChange(hijriYear, v, hijriDay);
            }}
            aria-label={t('onboarding.select_month')}
          >
            <option value="">{t('onboarding.select_month')}</option>
            {Array.from({ length: HIJRI_MONTHS_COUNT }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {fmtNumber(i + 1)}. {t(HIJRI_MONTH_KEYS[i])}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={hijriDay}
            onChange={(e) => {
              const v = e.target.value;
              setHijriDay(v);
              handleHijriChange(hijriYear, hijriMonth, v);
            }}
            aria-label={t('onboarding.select_day')}
          >
            <option value="">{t('onboarding.select_day')}</option>
            {Array.from({ length: MAX_HIJRI_DAYS_PER_MONTH }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {fmtNumber(i + 1)}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={hijriYear}
            onChange={(e) => {
              const v = e.target.value;
              setHijriYear(v);
              handleHijriChange(v, hijriMonth, hijriDay);
            }}
            aria-label={t('onboarding.hijri_year_placeholder')}
          >
            <option value="">{t('onboarding.hijri_year_placeholder')}</option>
            {Array.from({ length: HIJRI_YEAR_MAX - HIJRI_YEAR_MIN + 1 }, (_, i) => {
              const y = HIJRI_YEAR_MAX - i;
              return (
                <option key={y} value={String(y)}>
                  {fmtNumber(y)}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {value &&
        (() => {
          try {
            const sep = value.includes('/') ? '/' : '-';
            const parts = value.split(sep);
            const hijri = new HijriDate(
              parseInt(parts[0] ?? '0', 10),
              parseInt(parts[1] ?? '0', 10),
              parseInt(parts[2] ?? '0', 10),
            );
            const greg = hijri.toGregorian();
            const hijriStr = `${fmtNumber(hijri.day)} ${t(HIJRI_MONTH_KEYS[hijri.month - 1])} ${fmtNumber(hijri.year)}`;
            const gregStr = greg.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            return (
              <div className={styles.dualPreview}>
                <span>{hijriStr}</span>
                <span aria-hidden="true">·</span>
                <span>{gregStr}</span>
              </div>
            );
          } catch {
            return null;
          }
        })()}
    </div>
  );
};
