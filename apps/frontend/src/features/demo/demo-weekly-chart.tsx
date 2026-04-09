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
      <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-divider, rgba(0,0,0,0.08))"
        />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 'dataMax']}
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => fmtNumber(value)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--color-text-muted)', strokeDasharray: '3 3' }}
          formatter={(value) => [fmtNumber(value as number)]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={t('salah.tab_daily')}
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-primary)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
