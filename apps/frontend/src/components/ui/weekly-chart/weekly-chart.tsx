import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { useSalahHistory, useSawmHistory } from '@/hooks/use-worship';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { useLanguage } from '@/hooks/use-language';
import { todayHijriDate, addHijriDays, hijriToGregorianDate } from '@/utils/date-utils';
import { getCoveredPracticingDays } from '@/lib/practicing-periods';
import {
  CHART_CURSOR_STYLE,
  CHART_GRID_STROKE,
  CHART_MARGIN_DEFAULT,
  CHART_RANGE_FILL,
  CHART_SERIES_ACCENT,
  CHART_SERIES_PRIMARY,
  CHART_SERIES_SECONDARY,
  CHART_TICK_FILL,
  CHART_TICK_SMALL,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';
import { Loader2 } from 'lucide-react';
import styles from './weekly-chart.module.css';

// ---------------------------------------------------------------------------
// Custom X-axis tick — shows weekday, Gregorian date, and Hijri day number
// ---------------------------------------------------------------------------
interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string }; // Hijri date string
  locale: string;
  fmtNumber: (n: number) => string;
}

const DateTick: React.FC<TickProps> = ({ x = 0, y = 0, payload, locale, fmtNumber }) => {
  if (!payload?.value) return null;

  let d: Date;
  let dayName: string;
  let gregShort: string;
  let hijriDay: number;

  try {
    const dateStr = payload.value;
    d = hijriToGregorianDate(dateStr);
    dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
    gregShort = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
    hijriDay = parseInt(parts[2] ?? '0', 10);
  } catch {
    return null;
  }

  return (
    <g transform={`translate(${x},${y + 4})`}>
      <text textAnchor="middle" fill={CHART_TICK_FILL} fontSize={11}>
        <tspan x={0} dy={0}>
          {dayName}
        </tspan>
        <tspan x={0} dy={13} fontSize={10}>
          {gregShort}
        </tspan>
        <tspan x={0} dy={11} fontSize={9} opacity={0.65}>
          {fmtNumber(hijriDay)}
        </tspan>
      </text>
    </g>
  );
};

export const WeeklyPrayerChart: React.FC = () => {
  const { t, language, fmtNumber } = useLanguage();
  const today = todayHijriDate();
  const sevenDaysAgo = addHijriDays(today, -6);

  const { data: logs, isLoading, isError } = useSalahHistory(sevenDaysAgo, today);
  const {
    data: fastLogs,
    isLoading: fastLoading,
    isError: fastError,
  } = useSawmHistory(sevenDaysAgo, today);
  const { data: periods } = usePracticingPeriods();

  const locale = language === 'ar' ? 'ar-SA' : 'en-GB';

  const coveredDates = useMemo(() => {
    if (!periods?.length) return new Set<string>();
    const covered = getCoveredPracticingDays(periods, 'salah', sevenDaysAgo, today);
    return new Set(covered.map((d) => d.date));
  }, [periods, sevenDaysAgo, today]);

  const chartData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = addHijriDays(today, -i);
      const d = hijriToGregorianDate(dateStr);
      const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
      const obligatory = (logs ?? []).filter(
        (l) => l.date === dateStr && l.type === 'obligatory',
      ).length;
      const qadaa = (logs ?? []).filter((l) => l.date === dateStr && l.type === 'qadaa').length;
      const fasts = (fastLogs ?? []).filter((l) => l.date === dateStr).length;
      result.push({ date: dateStr, day: dayName, obligatory, qadaa, fasts });
    }
    return result;
  }, [logs, fastLogs, today, locale]);

  // Build contiguous ranges of covered dates for ReferenceArea shading
  const coveredRanges = useMemo(() => {
    const ranges: { start: string; end: string }[] = [];
    let rangeStart: string | null = null;
    let rangeEnd: string | null = null;

    for (const point of chartData) {
      if (coveredDates.has(point.date)) {
        if (!rangeStart) {
          rangeStart = point.date;
        }
        rangeEnd = point.date;
      } else {
        if (rangeStart && rangeEnd) {
          ranges.push({ start: rangeStart, end: rangeEnd });
        }
        rangeStart = null;
        rangeEnd = null;
      }
    }
    if (rangeStart && rangeEnd) {
      ranges.push({ start: rangeStart, end: rangeEnd });
    }
    return ranges;
  }, [chartData, coveredDates]);

  if (isLoading || fastLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (isError || fastError) {
    return (
      <div className={styles.loading}>
        <p className={styles.errorText}>{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={CHART_MARGIN_DEFAULT}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
          {coveredRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              x1={range.start}
              x2={range.end}
              fill={CHART_RANGE_FILL}
              fillOpacity={1}
              strokeOpacity={0}
            />
          ))}
          <XAxis
            dataKey="date"
            tick={(props) => <DateTick {...props} locale={locale} fmtNumber={fmtNumber} />}
            tickLine={false}
            axisLine={false}
            height={52}
          />
          <YAxis
            domain={[0, 'dataMax']}
            allowDecimals={false}
            tick={CHART_TICK_SMALL}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumber(v as number)}
          />
          <Tooltip
            cursor={CHART_CURSOR_STYLE}
            formatter={(value) => [fmtNumber(value as number)]}
            contentStyle={CHART_TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="obligatory"
            name={t('salah.tab_daily')}
            stroke={CHART_SERIES_PRIMARY}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_SERIES_PRIMARY }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="qadaa"
            name={t('salah.tab_qadaa')}
            stroke={CHART_SERIES_ACCENT}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_SERIES_ACCENT }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="fasts"
            name={t('sawm.tab_qadaa')}
            stroke={CHART_SERIES_SECONDARY}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_SERIES_SECONDARY }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className={styles.legend} role="list" aria-label={t('dashboard.weekly_overview')}>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.legendDotPrimary}`} aria-hidden="true" />
          {t('salah.tab_daily')}
        </span>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.legendDotAccent}`} aria-hidden="true" />
          {t('salah.tab_qadaa')}
        </span>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.legendDotSecondary}`} aria-hidden="true" />
          {t('sawm.tab_qadaa')}
        </span>
        {coveredRanges.length > 0 && (
          <span className={styles.legendItem} role="listitem">
            <span className={`${styles.legendDot} ${styles.legendDotCovered}`} aria-hidden="true" />
            {t('dashboard.practicing_period_label')}
          </span>
        )}
      </div>
    </div>
  );
};
