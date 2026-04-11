import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_CURSOR_STYLE,
  CHART_GRID_STROKE,
  CHART_MARGIN_COMPACT,
  CHART_SERIES_PRIMARY,
  CHART_TICK_MEDIUM,
  CHART_TICK_SMALL,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';

interface DemoWeeklyChartProps {
  data: Array<{
    day: string;
    value: number;
  }>;
  fmtNumber: (value: number) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const DemoWeeklyChart: React.FC<DemoWeeklyChartProps> = ({ data, fmtNumber, t }) => {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={CHART_MARGIN_COMPACT}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="day" tick={CHART_TICK_MEDIUM} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 'dataMax']}
          allowDecimals={false}
          tick={CHART_TICK_SMALL}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => fmtNumber(value)}
        />
        <Tooltip
          cursor={CHART_CURSOR_STYLE}
          formatter={(value) => [fmtNumber(value as number)]}
          contentStyle={CHART_TOOLTIP_STYLE}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={t('salah.tab_daily')}
          stroke={CHART_SERIES_PRIMARY}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_SERIES_PRIMARY }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
