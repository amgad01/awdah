import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Flame, Minus, Moon, Plus, Sun, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useWorship, useStreak, useStreakDetails } from '@/hooks/use-worship';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { CelebrationToast } from '@/components/ui/celebration-toast/celebration-toast';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { PrayerLogger } from '@/features/salah/prayer-logger';
import { SawmLogger } from '@/features/sawm/sawm-logger';
import { WeeklyPrayerChart } from '@/components/ui/weekly-chart/weekly-chart';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  DEFAULT_DAILY_INTENTION,
  DAYS_PER_YEAR,
  MAX_DAILY_INTENTION,
  MIN_DAILY_INTENTION,
  PRAYERS,
} from '@/lib/constants';
import { todayHijriDate } from '@/utils/date-utils';
import { PracticeCheckIn } from './practice-check-in';
import styles from './dashboard.module.css';

const PRAYER_CELEBRATION_MILESTONES = [7, 14, 21, 30, 60, 100];

export const Dashboard: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { salahDebt, sawmDebt, loading, error } = useWorship();
  const { streak, milestone } = useStreak();
  const { bestPrayerStreak, monThuStreak } = useStreakDetails();
  const [showSalahRemaining, setShowSalahRemaining] = useState(false);
  const [showSawmRemaining, setShowSawmRemaining] = useState(false);
  const [dailyRate, setDailyRate] = useState(DEFAULT_DAILY_INTENTION);
  const [celebration, setCelebration] = useState<string | null>(null);

  // Celebration detection — skip on initial load, only fire when values change
  const isFirstLoad = useRef(true);
  const prevStreak = useRef(streak);
  const prevBestPrayerCount = useRef(bestPrayerStreak?.count ?? 0);
  const prevMonThu = useRef(monThuStreak);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStreak.current = streak;
      prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
      prevMonThu.current = monThuStreak;
      return;
    }

    if (streak > prevStreak.current && milestone !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebration(t('dashboard.celebration_streak', { n: fmtNumber(streak) }));
    } else if (
      bestPrayerStreak &&
      bestPrayerStreak.count > prevBestPrayerCount.current &&
      PRAYER_CELEBRATION_MILESTONES.includes(bestPrayerStreak.count)
    ) {
      setCelebration(
        t('dashboard.celebration_prayer_streak', {
          prayer: t(`prayers.${bestPrayerStreak.name}`),
          n: fmtNumber(bestPrayerStreak.count),
        }),
      );
    } else if (monThuStreak > prevMonThu.current && monThuStreak > 0 && monThuStreak % 4 === 0) {
      setCelebration(t('dashboard.celebration_mon_thu', { n: fmtNumber(monThuStreak) }));
    }

    prevStreak.current = streak;
    prevBestPrayerCount.current = bestPrayerStreak?.count ?? 0;
    prevMonThu.current = monThuStreak;
  }, [
    streak,
    milestone,
    bestPrayerStreak,
    bestPrayerStreak?.count,
    bestPrayerStreak?.name,
    monThuStreak,
    t,
    fmtNumber,
  ]);

  const salahRemaining = salahDebt?.remainingPrayers ?? 0;
  const salahCompleted = salahDebt?.completedPrayers ?? 0;
  const salahTotal = salahDebt?.totalPrayersOwed ?? 0;
  const sawmRemaining = sawmDebt?.remainingDays ?? 0;
  const sawmCompleted = sawmDebt?.completedDays ?? 0;
  const sawmTotal = sawmDebt?.totalDaysOwed ?? 0;
  const allDebtCleared =
    salahTotal > 0 && salahRemaining === 0 && sawmTotal > 0 && sawmRemaining === 0;
  const salahYears =
    salahTotal > 0 && salahRemaining > 0
      ? Math.ceil(salahRemaining / dailyRate / DAYS_PER_YEAR)
      : 0;
  const salahCompletionRate = salahTotal > 0 ? Math.round((salahCompleted / salahTotal) * 100) : 0;
  const sawmCompletionRate = sawmTotal > 0 ? Math.round((sawmCompleted / sawmTotal) * 100) : 0;

  const todayDual = format(todayHijriDate(), {
    includeGregorianYear: true,
    weekday: 'long',
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

  const snapshotCards = [
    {
      key: 'today',
      icon: CalendarDays,
      label: t('dashboard.snapshot_today'),
      value: todayDual.primary,
      detail: todayDual.secondary,
      wide: true,
    },
    {
      key: 'salah',
      icon: Moon,
      label: t('dashboard.snapshot_salah'),
      value: fmtNumber(salahCompleted),
      detail: t('dashboard.completed_label'),
    },
    {
      key: 'sawm',
      icon: Sun,
      label: t('dashboard.snapshot_sawm'),
      value: fmtNumber(sawmCompleted),
      detail: t('dashboard.sawm_completed_label'),
    },
    {
      key: 'streak',
      icon: Flame,
      label: t('dashboard.snapshot_streak'),
      value: fmtNumber(streak),
      detail: streak > 0 ? t('dashboard.streak_days') : t('dashboard.streak_none'),
    },
  ];

  return (
    <div className={styles.dashboard}>
      {celebration && (
        <CelebrationToast message={celebration} onDismiss={() => setCelebration(null)} />
      )}

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroBadge}>{t('dashboard.hero_badge')}</span>
          <h1 className={styles.title}>
            {t('common.welcome_back')},{' '}
            <span className={styles.name}>{user?.username || 'User'}</span>
          </h1>
          <p className={styles.subtitle}>
            <GlossaryText>{t('dashboard.slogan')}</GlossaryText>
          </p>

          <div className={styles.heroChips}>
            <span className={styles.heroChip}>{todayDual.primary}</span>
            <span className={`${styles.heroChip} ${styles.heroChipSecondary}`}>
              {todayDual.secondary}
            </span>
            <span className={styles.heroChip}>
              {t('dashboard.hero_prayers_chip', { prayers: fmtNumber(salahCompleted) })}
            </span>
            <span className={styles.heroChip}>
              {t('dashboard.hero_fasts_chip', { fasts: fmtNumber(sawmCompleted) })}
            </span>
            {streak > 0 ? (
              <span className={styles.heroChip}>
                {t('dashboard.hero_streak_chip', { days: fmtNumber(streak) })}
              </span>
            ) : null}
          </div>
        </div>

        <Card className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <span className={styles.heroCardKicker}>{t('dashboard.hero_focus')}</span>
            <Target size={18} />
          </div>
          <div className={styles.heroCardValue}>{fmtNumber(salahCompleted)}</div>
          <p className={styles.heroCardLabel}>{t('dashboard.completed_label')}</p>
          <p className={styles.heroCardBody}>
            <GlossaryText>
              {allDebtCleared
                ? t('dashboard.hero_focus_complete')
                : t('dashboard.hero_focus_body', {
                    prayers: fmtNumber(salahCompleted),
                    fasts: fmtNumber(sawmCompleted),
                  })}
            </GlossaryText>
          </p>
          <div className={styles.heroCardStats}>
            <div className={styles.heroCardStat}>
              <strong>{fmtNumber(salahRemaining)}</strong>
              <span>{t('dashboard.prayers_remaining')}</span>
            </div>
            <div className={styles.heroCardStat}>
              <strong>{fmtNumber(sawmRemaining)}</strong>
              <span>{t('dashboard.fasts_remaining')}</span>
            </div>
          </div>
        </Card>
      </section>

      <section className={styles.snapshotGrid}>
        {snapshotCards.map(({ key, icon: Icon, label, value, detail, wide }) => (
          <Card
            key={key}
            className={`${styles.snapshotCard} ${wide ? styles.snapshotCardWide : ''}`.trim()}
          >
            <div className={styles.snapshotHeader}>
              <span className={styles.snapshotLabel}>{label}</span>
              <span className={styles.snapshotIcon}>
                <Icon size={16} />
              </span>
            </div>
            <div className={styles.snapshotValue}>{value}</div>
            <p className={styles.snapshotDetail}>{detail}</p>
          </Card>
        ))}
      </section>

      {allDebtCleared && (
        <div className={styles.clearedBanner} role="status">
          <p className={styles.clearedTitle}>{t('dashboard.debt_cleared_title')}</p>
          <p className={styles.clearedBody}>{t('dashboard.debt_cleared_body')}</p>
          <p className={styles.clearedHint}>{t('dashboard.debt_cleared_continue')}</p>
        </div>
      )}

      <PracticeCheckIn />

      <section className={styles.grid}>
        <Card
          title={t('dashboard.salah_debt')}
          subtitle={t('dashboard.salah_debt_subtitle')}
          className={`${styles.surfaceCard} ${styles.debtCard}`}
        >
          <div className={styles.cardSummary}>
            <div className={styles.statLead}>
              <span className={styles.statLeadValue}>{fmtNumber(salahCompleted)}</span>
              <span className={styles.statLeadLabel}>{t('dashboard.completed_label')}</span>
            </div>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <strong>{fmtNumber(salahRemaining)}</strong>
                <span>{t('dashboard.prayers_remaining')}</span>
              </div>
              <div className={styles.quickStat}>
                <strong>{fmtNumber(salahCompletionRate)}%</strong>
                <span>{t('dashboard.progress_complete')}</span>
              </div>
            </div>
          </div>

          <ProgressBar
            value={salahCompleted}
            max={salahTotal || 1}
            label={t('dashboard.overall_progress')}
          />

          <p className={styles.encouragement}>
            <GlossaryText>{t('dashboard.encouragement_message')}</GlossaryText>
          </p>
          {salahTotal > 0 && salahRemaining > 0 && (
            <>
              <div className={styles.rateCalc}>
                <span className={styles.rateLabel}>{t('dashboard.rate_label')}</span>
                <div className={styles.rateStepper}>
                  <button
                    type="button"
                    className={styles.rateBtn}
                    onClick={() => setDailyRate((r) => Math.max(MIN_DAILY_INTENTION, r - 1))}
                    aria-label={t('common.decrease_rate')}
                    disabled={dailyRate <= MIN_DAILY_INTENTION}
                  >
                    <Minus size={12} />
                  </button>
                  <span className={styles.rateVal}>{fmtNumber(dailyRate)}</span>
                  <button
                    type="button"
                    className={styles.rateBtn}
                    onClick={() => setDailyRate((r) => Math.min(MAX_DAILY_INTENTION, r + 1))}
                    aria-label={t('common.increase_rate')}
                    disabled={dailyRate >= MAX_DAILY_INTENTION}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className={styles.rateUnit}>{t('dashboard.rate_unit')}</span>
              </div>
              <p className={styles.projection}>
                {salahYears <= 1
                  ? t('dashboard.projection_almost_done')
                  : t('dashboard.projection_rate_positive', { n: fmtNumber(dailyRate) })}
              </p>
            </>
          )}
          <button
            className={styles.toggleRemaining}
            onClick={() => setShowSalahRemaining((value) => !value)}
            aria-expanded={showSalahRemaining}
            type="button"
          >
            {showSalahRemaining ? t('dashboard.hide_details') : t('dashboard.view_details')}
          </button>
          {showSalahRemaining && (
            <div className={styles.remainingDetail}>
              <p>
                <strong>{fmtNumber(salahRemaining)}</strong>{' '}
                {t('dashboard.salah_remaining_details')}
              </p>
              {salahRemaining > 0 && (
                <p className={styles.remainingProjection}>
                  {salahYears <= 1
                    ? t('dashboard.projection_almost_done')
                    : t('dashboard.projection_detail', {
                        n: fmtNumber(dailyRate),
                        years: fmtNumber(salahYears),
                      })}
                </p>
              )}
              {salahDebt?.perPrayerRemaining && salahRemaining > 0 && (
                <div className={styles.perPrayerRow}>
                  {PRAYERS.map((name) => (
                    <div key={name} className={styles.perPrayerChip}>
                      <span className={styles.perPrayerChipName}>{t(`prayers.${name}`)}</span>
                      <span className={styles.perPrayerChipCount}>
                        {fmtNumber(salahDebt.perPrayerRemaining[name] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card
          title={t('dashboard.todays_prayers')}
          subtitle={t('dashboard.card_todays_prayers_subtitle')}
          className={`${styles.surfaceCard} ${styles.todayCard}`}
        >
          <PrayerLogger />
        </Card>

        <Card
          title={t('dashboard.sawm_summary')}
          subtitle={t('dashboard.card_sawm_subtitle')}
          className={`${styles.surfaceCard} ${styles.sawmCard}`}
        >
          <div className={styles.cardSummary}>
            <div className={styles.statLead}>
              <span className={styles.statLeadValue}>{fmtNumber(sawmCompleted)}</span>
              <span className={styles.statLeadLabel}>{t('dashboard.sawm_completed_label')}</span>
            </div>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <strong>{fmtNumber(sawmRemaining)}</strong>
                <span>{t('dashboard.fasts_remaining')}</span>
              </div>
              <div className={styles.quickStat}>
                <strong>{fmtNumber(sawmCompletionRate)}%</strong>
                <span>{t('dashboard.progress_complete')}</span>
              </div>
            </div>
          </div>

          <SawmLogger />
          <ProgressBar
            variant="accent"
            value={sawmCompleted}
            max={sawmTotal || 1}
            label={t('dashboard.ramadan_progress')}
          />
          <button
            className={styles.toggleRemaining}
            onClick={() => setShowSawmRemaining((value) => !value)}
            aria-expanded={showSawmRemaining}
            type="button"
          >
            {showSawmRemaining ? t('dashboard.hide_details') : t('dashboard.view_details')}
          </button>
          {showSawmRemaining && (
            <p className={styles.remainingDetail}>
              <strong>{fmtNumber(sawmRemaining)}</strong> {t('dashboard.fasts_remaining_details')}
            </p>
          )}
        </Card>

        <Card
          title={streak > 0 ? t('dashboard.snapshot_streak') : t('dashboard.streak_start')}
          subtitle={t('dashboard.card_streak_subtitle')}
          className={`${styles.surfaceCard} ${styles.statCard}`}
        >
          <div className={styles.streakHeader}>
            <div className={styles.statLead}>
              <span className={styles.statLeadValue}>{fmtNumber(streak)}</span>
              <span className={styles.statLeadLabel}>{t('dashboard.streak_days')}</span>
            </div>
            <div className={styles.streakBadge}>
              <TrendingUp size={16} />
              <span>{streak > 0 ? t('dashboard.streak_live') : t('dashboard.streak_none')}</span>
            </div>
          </div>

          {milestone !== null && (
            <p className={styles.streakMilestone}>
              {t('dashboard.streak_milestone', { n: fmtNumber(milestone) })}
            </p>
          )}
          {streak === 0 && <p className={styles.streakNone}>{t('dashboard.streak_none')}</p>}

          {(bestPrayerStreak || monThuStreak > 0) && (
            <div className={styles.recordStreakList}>
              {bestPrayerStreak && (
                <div className={styles.recordStreakRow}>
                  <Moon size={13} className={styles.recordStreakIcon} />
                  <span>
                    {t('dashboard.record_prayer_streak', {
                      prayer: t(`prayers.${bestPrayerStreak.name}`),
                      n: fmtNumber(bestPrayerStreak.count),
                    })}
                  </span>
                </div>
              )}
              {monThuStreak > 0 && (
                <div className={styles.recordStreakRow}>
                  <Sun size={13} className={styles.recordStreakIcon} />
                  <span>
                    {t('dashboard.record_mon_thu_streak', { n: fmtNumber(monThuStreak) })}
                  </span>
                </div>
              )}
            </div>
          )}

          <WeeklyPrayerChart />
        </Card>
      </section>
    </div>
  );
};
