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
import { useLanguage } from '@/hooks/use-language';
import {
  CHART_CURSOR_STYLE,
  CHART_GRID_STROKE,
  CHART_MARGIN_DEFAULT,
  CHART_RANGE_FILL,
  CHART_TICK_SMALL,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';
import { usePracticingPeriods } from '@/hooks/use-profile';
import { transformWorshipData, computePracticingPeriodsRanges } from '@/domains/charts';
import { Loader2 } from 'lucide-react';
import { ChartDateTick } from './components/chart-date-tick';
import { ChartLegend } from './components/chart-legend';
import styles from './weekly-chart.module.css';

import type { ChartDataPoint, WorshipLog, SeriesDef } from '@/domains/charts';

export type { SeriesDef, ChartDataPoint };

interface BaseWeeklyChartProps {
  salahData?: WorshipLog[] | null | undefined;
  sawmData?: WorshipLog[] | null | undefined;
  isLoading: boolean;
  isError: boolean;
  series: SeriesDef[];
  ariaLabel: string;
  height?: number;
  practicingType?: 'salah' | 'sawm';
}

export const BaseWeeklyChart: React.FC<BaseWeeklyChartProps> = ({
  salahData,
  sawmData,
  isLoading,
  isError,
  series,
  ariaLabel,
  height = 220,
  practicingType,
}) => {
  const { t, language, fmtNumber } = useLanguage();
  const { data: practicingPeriods } = usePracticingPeriods();

  // Memoize locale separately so language switches don't cause unnecessary
  // re-renders in components that only depend on locale.
  const locale = useMemo(() => (language === 'ar' ? 'ar-SA' : 'en-GB'), [language]);

  const chartData = useMemo(
    () => transformWorshipData(salahData, sawmData, locale),
    [salahData, sawmData, locale],
  );

  const coveredRanges = useMemo(
    () => computePracticingPeriodsRanges(practicingPeriods, practicingType, chartData),
    [practicingPeriods, practicingType, chartData],
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.loading}>
        <p className={styles.errorText}>{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={height}>
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
            tick={(props) => (
              <ChartDateTick {...props} locale={locale} language={language} fmtNumber={fmtNumber} />
            )}
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
            formatter={(value, name) => [fmtNumber(value as number), name]}
            labelFormatter={() => ''}
            contentStyle={CHART_TOOLTIP_STYLE}
          />
          {series.map(({ dataKey, labelKey, style }) => (
            <Line
              key={dataKey}
              type="monotone"
              dataKey={dataKey}
              name={t(labelKey)}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              dot={{ r: 3, fill: style.stroke }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <ChartLegend
        series={series}
        ariaLabel={ariaLabel}
        showPracticingPeriods={coveredRanges.length > 0}
      />
    </div>
  );
};
