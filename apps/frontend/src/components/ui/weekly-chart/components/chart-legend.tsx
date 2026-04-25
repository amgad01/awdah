import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { ChartLegendSwatch } from './chart-legend-swatch';
import type { SeriesDef } from '../base-weekly-chart';
import styles from '../weekly-chart.module.css';

interface ChartLegendProps {
  series: SeriesDef[];
  ariaLabel: string;
  showPracticingPeriods?: boolean;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  series,
  ariaLabel,
  showPracticingPeriods = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.legend} role="list" aria-label={ariaLabel}>
      {series.map(({ dataKey, labelKey, style }) => (
        <span key={dataKey} className={styles.legendItem} role="listitem">
          <ChartLegendSwatch series={style} />
          {t(labelKey)}
        </span>
      ))}
      {showPracticingPeriods && (
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.legendDotCovered}`} aria-hidden="true" />
          {t('dashboard.practicing_period_label')}
        </span>
      )}
    </div>
  );
};
