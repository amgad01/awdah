export interface ChartDataPoint {
  date: string;
  day: string;
  [key: string]: string | number;
}

export interface SeriesDef {
  dataKey: string;
  labelKey: string;
  style: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
}

export interface DateRange {
  start: string;
  end: string;
}
