import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useWeeklyChartData } from '@/hooks/use-weekly-chart-data';
import { COMBINED_CHART_SERIES } from '@/lib/chart-series';
import { BaseWeeklyChart } from './base-weekly-chart';

export const WeeklyPrayerChart: React.FC = () => {
  const { salah, sawm } = useWeeklyChartData();
  const { t } = useLanguage();

  return (
    <BaseWeeklyChart
      salahData={salah.data}
      sawmData={sawm.data}
      isLoading={salah.isLoading || sawm.isLoading}
      isError={salah.isError || sawm.isError}
      series={COMBINED_CHART_SERIES}
      ariaLabel={t('dashboard.weekly_overview')}
      height={260}
      practicingType="salah"
    />
  );
};
