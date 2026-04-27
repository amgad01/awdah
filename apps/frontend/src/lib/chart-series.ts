import {
  CHART_LINE_SALAH_OBLIGATORY,
  CHART_LINE_SALAH_QADAA,
  CHART_LINE_SAWM_OBLIGATORY,
  CHART_LINE_SAWM_QADAA,
} from '@/lib/chart-theme';
import type { SeriesDef } from '@/domains/charts';

export const SALAH_CHART_SERIES: SeriesDef[] = [
  { dataKey: 'obligatory', labelKey: 'salah.tab_daily', style: CHART_LINE_SALAH_OBLIGATORY },
  { dataKey: 'qadaa', labelKey: 'salah.tab_qadaa', style: CHART_LINE_SALAH_QADAA },
];

export const SAWM_CHART_SERIES: SeriesDef[] = [
  { dataKey: 'obligatory', labelKey: 'sawm.tab_daily', style: CHART_LINE_SAWM_OBLIGATORY },
  { dataKey: 'qadaa', labelKey: 'sawm.tab_qadaa', style: CHART_LINE_SAWM_QADAA },
];

export const COMBINED_CHART_SERIES: SeriesDef[] = [
  ...SALAH_CHART_SERIES,
  { dataKey: 'fastObligatory', labelKey: 'sawm.tab_daily', style: CHART_LINE_SAWM_OBLIGATORY },
  { dataKey: 'fastQadaa', labelKey: 'sawm.tab_qadaa', style: CHART_LINE_SAWM_QADAA },
];
