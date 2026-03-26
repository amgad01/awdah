import React from 'react';
import { HijriDate } from '@awdah/shared';
import styles from './hijri-date-picker.module.css';

interface GregorianDateInputsProps {
  gregDay: string;
  gregMonth: string;
  gregYear: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  gregorianMonthNames: string[];
  fmtNumber: (n: number) => string;
  currentYear: number;
  minYear: number;
  minMonth?: number;
  minDay?: number;
  ariaLabelYear: string;
  t: (key: string) => string;
}

export const GregorianDateInputs: React.FC<GregorianDateInputsProps> = ({
  gregDay,
  gregMonth,
  gregYear,
  onDayChange,
  onMonthChange,
  onYearChange,
  gregorianMonthNames,
  fmtNumber,
  currentYear,
  minYear,
  minMonth = 1,
  minDay = 1,
  ariaLabelYear,
  t,
}) => {
  const daysInMonth =
    gregYear && gregMonth ? new Date(Number(gregYear), Number(gregMonth), 0).getDate() : 31;
  const isMinYear = gregYear && Number(gregYear) === minYear;
  const effectiveMinMonth = isMinYear ? minMonth : 1;
  const isMinMonth = isMinYear && gregMonth && Number(gregMonth) === minMonth;
  const effectiveMinDay = isMinMonth ? minDay : 1;

  return (
    <div className={styles.hijriRow}>
      <select
        className={styles.select}
        value={gregYear}
        onChange={(e) => onYearChange(e.target.value)}
        aria-label={ariaLabelYear}
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
      <select
        className={styles.select}
        value={gregMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        aria-label={t('onboarding.select_month')}
      >
        <option value="">{t('onboarding.select_month')}</option>
        {gregorianMonthNames.map((name, i) => {
          const monthNum = i + 1;
          if (monthNum < effectiveMinMonth) return null;
          return (
            <option key={monthNum} value={String(monthNum)}>
              {name}
            </option>
          );
        })}
      </select>
      <select
        className={styles.select}
        value={gregDay}
        onChange={(e) => onDayChange(e.target.value)}
        aria-label={t('onboarding.select_day')}
      >
        <option value="">{t('onboarding.select_day')}</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          if (dayNum < effectiveMinDay) return null;
          return (
            <option key={dayNum} value={String(dayNum)}>
              {fmtNumber(dayNum)}
            </option>
          );
        })}
      </select>
    </div>
  );
};

interface HijriDateInputsProps {
  hijriYear: string;
  hijriMonth: string;
  hijriDay: string;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
  hijriYearMin: number;
  hijriYearMax: number;
  hijriMonthsCount: number;
  hijriMinMonth?: number;
  hijriMinDay?: number;
  maxHijriDaysPerMonth: number;
  hijriMonthKeys: readonly string[];
  fmtNumber: (n: number) => string;
  t: (key: string) => string;
}

export const HijriDateInputs: React.FC<HijriDateInputsProps> = ({
  hijriYear,
  hijriMonth,
  hijriDay,
  onYearChange,
  onMonthChange,
  onDayChange,
  hijriYearMin,
  hijriYearMax,
  hijriMonthsCount,
  hijriMinMonth = 1,
  hijriMinDay = 1,
  maxHijriDaysPerMonth,
  hijriMonthKeys,
  fmtNumber,
  t,
}) => {
  const isMinYear = hijriYear && parseInt(hijriYear, 10) === hijriYearMin;
  const effectiveMinMonth = isMinYear ? hijriMinMonth : 1;
  const isMinMonth = isMinYear && hijriMonth && parseInt(hijriMonth, 10) === hijriMinMonth;
  const effectiveMinDay = isMinMonth ? hijriMinDay : 1;

  return (
    <div className={styles.hijriRow}>
      <select
        className={styles.select}
        value={hijriYear}
        onChange={(e) => onYearChange(e.target.value)}
        aria-label={t('onboarding.hijri_year_placeholder')}
      >
        <option value="">{t('onboarding.hijri_year_placeholder')}</option>
        {Array.from({ length: hijriYearMax - hijriYearMin + 1 }, (_, i) => {
          const y = hijriYearMax - i;
          return (
            <option key={y} value={String(y)}>
              {fmtNumber(y)}
            </option>
          );
        })}
      </select>
      <select
        className={styles.select}
        value={hijriMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        aria-label={t('onboarding.select_month')}
      >
        <option value="">{t('onboarding.select_month')}</option>
        {Array.from({ length: hijriMonthsCount }, (_, i) => {
          const monthNum = i + 1;
          if (monthNum < effectiveMinMonth) return null;
          return (
            <option key={monthNum} value={String(monthNum)}>
              {fmtNumber(monthNum)}. {t(hijriMonthKeys[i])}
            </option>
          );
        })}
      </select>
      <select
        className={styles.select}
        value={hijriDay}
        onChange={(e) => onDayChange(e.target.value)}
        aria-label={t('onboarding.select_day')}
      >
        <option value="">{t('onboarding.select_day')}</option>
        {Array.from({ length: maxHijriDaysPerMonth }, (_, i) => {
          const dayNum = i + 1;
          if (dayNum < effectiveMinDay) return null;
          return (
            <option key={dayNum} value={String(dayNum)}>
              {fmtNumber(dayNum)}
            </option>
          );
        })}
      </select>
    </div>
  );
};

interface DualDatePreviewProps {
  value: string;
  hijriMonthKeys: readonly string[];
  language: string;
  fmtNumber: (n: number) => string;
  t: (key: string) => string;
}

export const DualDatePreview: React.FC<DualDatePreviewProps> = ({
  value,
  hijriMonthKeys,
  language,
  fmtNumber,
  t,
}) => {
  const hijriOutput = React.useMemo(() => {
    if (!value) return null;
    const sep = value.includes('/') ? '/' : '-';
    const parts = value.split(sep);
    if (parts.length < 3) return null;
    try {
      return new HijriDate(
        parseInt(parts[0] ?? '0', 10),
        parseInt(parts[1] ?? '0', 10),
        parseInt(parts[2] ?? '0', 10),
      );
    } catch {
      return null;
    }
  }, [value]);

  const dateInfo = React.useMemo(() => {
    if (!hijriOutput) return null;
    try {
      const greg = hijriOutput.toGregorian();
      const hijriStr = `${fmtNumber(hijriOutput.day)} ${t(hijriMonthKeys[hijriOutput.month - 1])} ${fmtNumber(hijriOutput.year)}`;
      const gregStr = greg.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return { hijriStr, gregStr };
    } catch {
      return null;
    }
  }, [hijriOutput, fmtNumber, t, language, hijriMonthKeys]);

  if (!value || !dateInfo) return null;

  return (
    <div className={styles.dualPreview}>
      <span>{dateInfo.hijriStr}</span>
      <span aria-hidden="true">·</span>
      <span>{dateInfo.gregStr}</span>
    </div>
  );
};
