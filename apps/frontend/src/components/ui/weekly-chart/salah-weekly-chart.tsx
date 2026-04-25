import React from 'react';
import { useSalahWeeklyChartData } from '@/hooks/use-weekly-chart-data';
import { useLanguage } from '@/hooks/use-language';
import { SALAH_CHART_SERIES } from '@/lib/chart-series';
import { BaseWeeklyChart } from './base-weekly-chart';

export const SalahWeeklyChart: React.FC = () => {
  const { salah } = useSalahWeeklyChartData();
  const { t } = useLanguage();

  return (
    <BaseWeeklyChart
      salahData={salah.data}
      isLoading={salah.isLoading}
      isError={salah.isError}
      series={SALAH_CHART_SERIES}
      ariaLabel={t('dashboard.salah_chart_aria')}
      practicingType="salah"
    />
  );
};
