import React from 'react';
import type { ChartSeriesStyle } from '@/lib/chart-theme';

interface ChartLegendSwatchProps {
  series: ChartSeriesStyle;
}

export const ChartLegendSwatch: React.FC<ChartLegendSwatchProps> = ({ series }) => (
  <svg width="20" height="10" aria-hidden="true">
    <line
      x1="0"
      y1="5"
      x2="20"
      y2="5"
      stroke={series.stroke}
      strokeWidth={series.strokeWidth}
      strokeDasharray={series.strokeDasharray}
    />
    <circle cx="10" cy="5" r="3" fill={series.stroke} />
  </svg>
);
