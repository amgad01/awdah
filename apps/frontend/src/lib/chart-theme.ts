export const CHART_MARGIN_COMPACT = { top: 4, right: 4, left: -24, bottom: 0 } as const;

export const CHART_MARGIN_DEFAULT = { top: 4, right: 16, left: 16, bottom: 4 } as const;

export const CHART_GRID_STROKE = 'var(--chart-grid-stroke)';
export const CHART_CURSOR_STROKE = 'var(--chart-cursor-stroke)';
export const CHART_TOOLTIP_BACKGROUND = 'var(--chart-tooltip-bg)';
export const CHART_TOOLTIP_BORDER = '1px solid var(--chart-tooltip-border)';
export const CHART_TOOLTIP_TEXT = 'var(--chart-tooltip-text)';
export const CHART_TICK_FILL = 'var(--chart-tick-fill)';
export const CHART_RANGE_FILL = 'var(--chart-range-fill)';
export const CHART_SERIES_PRIMARY = 'var(--chart-series-primary)';
export const CHART_SERIES_ACCENT = 'var(--chart-series-accent)';
export const CHART_SERIES_SECONDARY = 'var(--chart-series-secondary)';

export const CHART_TICK_MEDIUM = { fontSize: 11, fill: CHART_TICK_FILL } as const;
export const CHART_TICK_SMALL = { fontSize: 10, fill: CHART_TICK_FILL } as const;
export const CHART_TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: CHART_TOOLTIP_BORDER,
  background: CHART_TOOLTIP_BACKGROUND,
  color: CHART_TOOLTIP_TEXT,
} as const;

export const CHART_CURSOR_STYLE = {
  stroke: CHART_CURSOR_STROKE,
  strokeDasharray: '3 3',
} as const;
