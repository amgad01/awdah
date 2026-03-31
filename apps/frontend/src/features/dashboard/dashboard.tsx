import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useWorship, useStreak, useStreakDetails } from '@/hooks/use-worship';
import { useDualDate } from '@/hooks/use-dual-date';
import { useProfile } from '@/hooks/use-profile';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Card } from '@/components/ui/card/card';
import { CelebrationToast } from '@/components/ui/celebration-toast/celebration-toast';
import { PrayerLogger } from '@/features/salah/prayer-logger';
import { QUERY_KEYS } from '@/lib/query-keys';
import { getUserDisplayName } from '@/lib/user-display';
import { todayHijriDate } from '@/utils/date-utils';
import { useCelebration } from './use-celebration';
import { DashboardHero } from './dashboard-hero';
import { SnapshotGrid } from './snapshot-grid';
import { SalahDebtCard } from './salah-debt-card';
import { SawmSummaryCard } from './sawm-summary-card';
import { StreakCard } from './streak-card';
import { PracticeCheckIn } from './practice-check-in';
import styles from './dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { salahDebt, sawmDebt, loading, error } = useWorship();
  const { streak, milestone } = useStreak();
  const { activePrayerStreaks, monThuStreak, obligatoryStreak, fastStreak } = useStreakDetails();

  const { celebration, dismiss: dismissCelebration } = useCelebration({
    streak,
    milestone,
    bestPrayerStreak: activePrayerStreaks[0] || null,
    monThuStreak,
    obligatoryStreak,
    fastStreak,
    t,
    fmtNumber,
  });

  const salahRemaining = salahDebt?.remainingPrayers ?? 0;
  const salahCompleted = salahDebt?.completedPrayers ?? 0;
  const salahTotal = salahDebt?.totalPrayersOwed ?? 0;
  const sawmRemaining = sawmDebt?.remainingDays ?? 0;
  const sawmCompleted = sawmDebt?.completedDays ?? 0;
  const sawmTotal = sawmDebt?.totalDaysOwed ?? 0;
  const allDebtCleared =
    salahTotal > 0 && salahRemaining === 0 && sawmTotal > 0 && sawmRemaining === 0;
  const salahCompletionRate = salahTotal > 0 ? Math.round((salahCompleted / salahTotal) * 100) : 0;
  const sawmCompletionRate = sawmTotal > 0 ? Math.round((sawmCompleted / sawmTotal) * 100) : 0;

  const todayDual = format(todayHijriDate(), {
    includeGregorianYear: true,
    weekday: 'long',
  });
  const displayName = getUserDisplayName({
    profileUsername: profile?.username,
    email: user?.email,
    sessionUsername: user?.username,
    fallback: t('common.user'),
  });

  if (loading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : t('common.error')}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });
        }}
      />
    );
  }

  return (
    <div className={styles.dashboard}>
      {celebration && <CelebrationToast message={celebration} onDismiss={dismissCelebration} />}

      <DashboardHero
        username={displayName}
        todayPrimary={todayDual.primary}
        todaySecondary={todayDual.secondary}
        salahCompleted={fmtNumber(salahCompleted)}
        sawmCompleted={fmtNumber(sawmCompleted)}
        salahRemaining={fmtNumber(salahRemaining)}
        sawmRemaining={fmtNumber(sawmRemaining)}
        streak={streak}
        streakFormatted={fmtNumber(streak)}
        allDebtCleared={allDebtCleared}
        t={t}
      />

      <SnapshotGrid
        todayPrimary={todayDual.primary}
        todaySecondary={todayDual.secondary}
        salahCompleted={fmtNumber(salahCompleted)}
        sawmCompleted={fmtNumber(sawmCompleted)}
        streak={fmtNumber(streak)}
        t={t}
      />

      {allDebtCleared && (
        <div className={styles.clearedBanner} role="status">
          <p className={styles.clearedTitle}>{t('dashboard.debt_cleared_title')}</p>
          <p className={styles.clearedBody}>{t('dashboard.debt_cleared_body')}</p>
          <p className={styles.clearedHint}>{t('dashboard.debt_cleared_continue')}</p>
        </div>
      )}

      <PracticeCheckIn />

      <section className={styles.grid}>
        <SalahDebtCard
          salahCompleted={salahCompleted}
          salahRemaining={salahRemaining}
          salahTotal={salahTotal}
          salahCompletionRate={salahCompletionRate}
          perPrayerRemaining={salahDebt?.perPrayerRemaining}
          t={t}
          fmtNumber={fmtNumber}
        />

        <Card
          title={t('dashboard.todays_prayers')}
          subtitle={t('dashboard.card_todays_prayers_subtitle')}
          className={`${styles.surfaceCard} ${styles.todayCard}`}
        >
          <PrayerLogger />
        </Card>

        <SawmSummaryCard
          sawmCompleted={sawmCompleted}
          sawmRemaining={sawmRemaining}
          sawmTotal={sawmTotal}
          sawmCompletionRate={sawmCompletionRate}
          t={t}
          fmtNumber={fmtNumber}
        />

        <StreakCard
          streak={streak}
          milestone={milestone}
          activePrayerStreaks={activePrayerStreaks}
          monThuStreak={monThuStreak}
          obligatoryStreak={obligatoryStreak}
          fastStreak={fastStreak}
          t={t}
          fmtNumber={fmtNumber}
        />
      </section>
    </div>
  );
};
