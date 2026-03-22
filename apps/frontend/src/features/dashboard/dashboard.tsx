import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useWorship } from '@/hooks/use-worship';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { Sparkles, TrendingUp } from 'lucide-react';
import { PrayerLogger } from '@/features/salah/prayer-logger';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import styles from './dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { user } = useAuth();
  const { salahDebt, sawmDebt, loading } = useWorship();

  if (loading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.welcome}>
          <h1 className={styles.title}>
            {t('common.welcome_back')},{' '}
            <span className={styles.name}>{user?.username || 'User'}</span>!
          </h1>
          <p className={styles.subtitle}>{t('dashboard.slogan')}</p>
        </div>
        <div className={styles.dateInfo}>
          <Sparkles className={styles.sparkle} size={24} />
        </div>
      </header>

      <section className={styles.grid}>
        {/* Salah Debt Card */}
        <Card
          title={t('dashboard.salah_debt')}
          subtitle={t('dashboard.salah_debt_subtitle')}
          className={styles.debtCard}
        >
          <div className={styles.debtContent}>
            <div className={styles.gaugePlaceholder}>
              <div className={styles.mainStat}>
                <span className={styles.count}>{fmtNumber(salahDebt?.remainingPrayers || 0)}</span>
                <span className={styles.label}>{t('dashboard.prayers_remaining')}</span>
              </div>
            </div>
            <div className={styles.progressSection}>
              <ProgressBar
                value={salahDebt?.completedPrayers || 0}
                max={salahDebt?.totalPrayersOwed || 1}
                label={t('dashboard.overall_progress')}
              />
              <p className={styles.encouragement}>{t('dashboard.encouragement_message')}</p>
            </div>
          </div>
        </Card>

        {/* Today's Prayers Card */}
        <Card title={t('dashboard.todays_prayers')} className={styles.todayCard}>
          <PrayerLogger />
        </Card>

        {/* Sawm Card */}
        <Card title={t('dashboard.sawm_summary')} className={styles.sawmCard}>
          <div className={styles.sawmContent}>
            <SawmLogger />
            <div className={styles.sawmStatInfo}>
              <div className={styles.statMini}>
                <span className={styles.statVal}>{fmtNumber(sawmDebt?.remainingDays || 0)}</span>
                <span className={styles.statLab}>{t('dashboard.fasts_remaining')}</span>
              </div>
            </div>
            <ProgressBar
              variant="accent"
              value={sawmDebt?.completedDays || 0}
              max={sawmDebt?.totalDaysOwed || 1}
              label={t('dashboard.ramadan_progress')}
            />
          </div>
        </Card>

        {/* Streak / Weekly Overview */}
        <Card title={t('dashboard.weekly_overview')} className={styles.statCard}>
          <div className={styles.chartPlaceholder}>
            <TrendingUp size={48} className={styles.chartIcon} />
            <p>{t('dashboard.weekly_overview_hint')}</p>
          </div>
        </Card>
      </section>
    </div>
  );
};
