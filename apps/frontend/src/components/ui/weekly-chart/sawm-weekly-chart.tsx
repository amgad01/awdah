import React from 'react';
import { useSawmWeeklyChartData } from '@/hooks/use-weekly-chart-data';
import { useLanguage } from '@/hooks/use-language';
import { SAWM_CHART_SERIES } from '@/lib/chart-series';
import { BaseWeeklyChart } from './base-weekly-chart';

export const SawmWeeklyChart: React.FC = () => {
  const { sawm } = useSawmWeeklyChartData();
  const { t } = useLanguage();

  return (
    <BaseWeeklyChart
      sawmData={sawm.data}
      isLoading={sawm.isLoading}
      isError={sawm.isError}
      series={SAWM_CHART_SERIES}
      ariaLabel={t('dashboard.sawm_chart_aria')}
      practicingType="sawm"
    />
  );
};
