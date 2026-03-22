import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDate } from '@awdah/shared';
import {
  HIJRI_YEAR_MIN,
  HIJRI_YEAR_MAX,
  HIJRI_MONTHS_COUNT,
  MAX_HIJRI_DAYS_PER_MONTH,
  DOB_MAX_YEARS_AGO,
} from '@/lib/constants';
import styles from './hijri-date-picker.module.css';

type CalendarMode = 'gregorian' | 'hijri';

const HIJRI_MONTH_KEYS = [
  'hijri_months.muharram',
  'hijri_months.safar',
  'hijri_months.rabi_al_awwal',
  'hijri_months.rabi_al_thani',
  'hijri_months.jumada_al_awwal',
  'hijri_months.jumada_al_thani',
  'hijri_months.rajab',
  'hijri_months.shaban',
  'hijri_months.ramadan',
  'hijri_months.shawwal',
  'hijri_months.dhu_al_qidah',
  'hijri_months.dhu_al_hijjah',
] as const;

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
  const { t } = useLanguage();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('gregorian');
  const [gregValue, setGregValue] = useState('');
  const [hijriYear, setHijriYear] = useState(initialHijriParts?.year ?? '');
  const [hijriMonth, setHijriMonth] = useState(initialHijriParts?.month ?? '');
  const [hijriDay, setHijriDay] = useState(initialHijriParts?.day ?? '');

  // Initialise Hijri fields from the stored value
  React.useEffect(() => {
    if (value && !hijriYear) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setHijriYear(parts[0] ?? '');
        setHijriMonth(String(parseInt(parts[1] ?? '0', 10)));
        setHijriDay(String(parseInt(parts[2] ?? '0', 10)));
      }
    }
  }, [value, hijriYear]);

  const handleGregorianChange = (v: string) => {
    setGregValue(v);
    onError('');
    if (!v) {
      onChange('');
      return;
    }
    try {
      const gregDate = new Date(v + 'T12:00:00');
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
        <input
          type="date"
          className={styles.input}
          value={gregValue}
          max={`${currentYear}-12-31`}
          min={`${minYear}-01-01`}
          onChange={(e) => handleGregorianChange(e.target.value)}
          aria-label={label}
        />
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
                {i + 1}. {t(HIJRI_MONTH_KEYS[i])}
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
                {i + 1}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={styles.input}
            value={hijriYear}
            onChange={(e) => {
              const v = e.target.value;
              setHijriYear(v);
              handleHijriChange(v, hijriMonth, hijriDay);
            }}
            placeholder={t('onboarding.hijri_year_placeholder')}
            min={HIJRI_YEAR_MIN}
            max={HIJRI_YEAR_MAX}
            aria-label={t('onboarding.hijri_year_placeholder')}
          />
        </div>
      )}

      {value && (
        <p className={styles.hint}>
          {t('onboarding.hijri_input')}: {value}
        </p>
      )}
    </div>
  );
};
