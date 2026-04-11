import React, { useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { DemoDetailsGrid, DemoHeroSection, DemoOverviewGrid } from './demo-sections';
import { useDemoData } from './use-demo-data';
import type { DemoPageProps } from './demo-types';
import styles from './demo-page.module.css';

export const DemoPage: React.FC<DemoPageProps> = ({ showHeading = true }) => {
  const { t, language, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const { data, error, loading, reload } = useDemoData();

  const localizedStory = useMemo(() => {
    if (!data) return '';
    return data.user.story[language] ?? data.user.story['en'] ?? '';
  }, [data, language]);

  if (loading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (error || !data) {
    return (
      <ErrorState message={error?.message ?? t('common.error')} onRetry={() => void reload()} />
    );
  }

  const weeklyChartData = data.salah.weeklyCompletion.map((entry) => ({
    day: t(entry.dayKey),
    value: entry.value,
  }));
  const primaryCalendarLabel =
    language === 'ar' ? t('onboarding.hijri_input') : t('onboarding.gregorian_input');
  const secondaryCalendarLabel =
    language === 'ar' ? t('onboarding.gregorian_input') : t('onboarding.hijri_input');

  return (
    <div className={styles.page}>
      <DemoHeroSection
        data={data}
        fmtNumber={fmtNumber}
        localizedStory={localizedStory}
        showHeading={showHeading}
        t={t}
      />
      <DemoOverviewGrid
        data={data}
        format={format}
        fmtNumber={fmtNumber}
        primaryCalendarLabel={primaryCalendarLabel}
        secondaryCalendarLabel={secondaryCalendarLabel}
        t={t}
      />
      <DemoDetailsGrid
        data={data}
        format={format}
        fmtNumber={fmtNumber}
        primaryCalendarLabel={primaryCalendarLabel}
        secondaryCalendarLabel={secondaryCalendarLabel}
        t={t}
        weeklyChartData={weeklyChartData}
      />
    </div>
  );
};
