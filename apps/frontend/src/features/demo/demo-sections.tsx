import {
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Circle,
  Download,
  Flame,
  History,
  Moon,
  ShieldCheck,
  Sun,
  Target,
  UserRound,
} from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import type { DualDateFormatOptions, DualDateParts } from '@/hooks/use-dual-date';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { DemoDateStack } from './demo-date-stack';
import type { DemoData, HistoryKind } from './demo-types';
import styles from './demo-page.module.css';

const DemoWeeklyChart = lazy(() =>
  import('./demo-weekly-chart').then((module) => ({
    default: module.DemoWeeklyChart,
  })),
);

type Translate = (key: string, options?: Record<string, unknown>) => string;
type FormatNumber = (value: number) => string;
type FormatDualDate = (dateStr: string, options?: DualDateFormatOptions) => DualDateParts;

interface DemoSectionBaseProps {
  data: DemoData;
  format: FormatDualDate;
  fmtNumber: FormatNumber;
  primaryCalendarLabel: string;
  secondaryCalendarLabel: string;
  t: Translate;
}

interface DemoHeroSectionProps {
  data: DemoData;
  fmtNumber: FormatNumber;
  localizedStory: string;
  showHeading: boolean;
  t: Translate;
}

type DemoOverviewGridProps = DemoSectionBaseProps;

interface DemoDetailsGridProps extends DemoSectionBaseProps {
  weeklyChartData: Array<{
    day: string;
    value: number;
  }>;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const HISTORY_KIND_ICONS: Record<HistoryKind, IconComponent> = {
  prayer: Moon,
  fast: Sun,
  period: CalendarRange,
  covered: History,
};

function historyLabel(
  entry: DemoData['history'][number],
  t: Translate,
): { subtitle: string; title: string } {
  switch (entry.kind) {
    case 'prayer':
      return {
        title: t(`prayers.${entry.prayerName}`),
        subtitle: entry.logType === 'qadaa' ? t('history.type_qadaa') : t('demo.type_daily'),
      };
    case 'fast':
      return {
        title: t('nav.sawm'),
        subtitle: entry.logType === 'qadaa' ? t('sawm.mode_qadaa') : t('sawm.mode_ramadan'),
      };
    case 'period':
      return {
        title:
          entry.periodEventKind === 'start'
            ? t('history.period_start_event')
            : t('history.period_end_event'),
        subtitle: t(`demo.period_type_${entry.periodKind}`),
      };
    case 'covered':
      return {
        title: t('history.covered_by_period'),
        subtitle: t(`demo.period_type_${entry.periodKind}`),
      };
  }
}

export const DemoHeroSection: React.FC<DemoHeroSectionProps> = ({
  data,
  fmtNumber,
  localizedStory,
  showHeading,
  t,
}) => {
  return (
    <>
      {showHeading ? (
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.badge}>{t('demo.badge')}</span>
            <h1 className={styles.title}>{t('demo.title')}</h1>
            <p className={styles.subtitle}>
              <GlossaryText>{t('demo.subtitle')}</GlossaryText>
            </p>
            <p className={styles.story}>
              <GlossaryText>{localizedStory}</GlossaryText>
            </p>

            <div className={styles.headerChips}>
              <span className={styles.heroChip}>{t('marketing.stat_multilingual')}</span>
              <span className={styles.heroChip}>{t('marketing.stat_privacy')}</span>
              <span className={styles.heroChip}>{t('marketing.stat_selfhost')}</span>
            </div>
          </div>
        </header>
      ) : null}

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroBadge}>{t('dashboard.hero_badge')}</span>
          <h2 className={styles.heroTitle}>{t('dashboard.hero_focus')}</h2>
          <p className={styles.heroSubtitle}>
            <GlossaryText>
              {t('dashboard.hero_focus_body', {
                prayers: fmtNumber(data.salah.completed),
                fasts: fmtNumber(data.sawm.completed),
              })}
            </GlossaryText>
          </p>
          <div className={styles.heroChips}>
            <span className={styles.heroChip}>
              {t('dashboard.hero_prayers_chip', { prayers: fmtNumber(data.salah.completed) })}
            </span>
            <span className={styles.heroChip}>
              {t('dashboard.hero_fasts_chip', { fasts: fmtNumber(data.sawm.completed) })}
            </span>
            {data.salah.streakDays > 0 && (
              <span className={styles.heroChip}>
                <Flame size={14} />
                {t('dashboard.hero_streak_chip', { days: fmtNumber(data.salah.streakDays) })}
              </span>
            )}
          </div>
        </div>

        <Card className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <span className={styles.heroCardKicker}>{t('dashboard.hero_focus')}</span>
            <Target size={18} />
          </div>
          <div className={styles.heroCardValue}>{fmtNumber(data.salah.completed)}</div>
          <p className={styles.heroCardLabel}>{t('dashboard.completed_label')}</p>
          <p className={styles.heroCardBody}>
            <GlossaryText>
              {t('dashboard.hero_focus_body', {
                prayers: fmtNumber(data.salah.completed),
                fasts: fmtNumber(data.sawm.completed),
              })}
            </GlossaryText>
          </p>
          <div className={styles.heroCardStats}>
            <div className={styles.heroCardStat}>
              <strong>{fmtNumber(data.salah.remaining)}</strong>
              <span>{t('dashboard.prayers_remaining')}</span>
            </div>
            <div className={styles.heroCardStat}>
              <strong>{fmtNumber(data.sawm.remaining)}</strong>
              <span>{t('dashboard.fasts_remaining')}</span>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
};

export const DemoOverviewGrid: React.FC<DemoOverviewGridProps> = ({
  data,
  format,
  fmtNumber,
  primaryCalendarLabel,
  secondaryCalendarLabel,
  t,
}) => {
  const today = format(data.user.todayHijri, {
    includeGregorianYear: true,
    weekday: 'long',
  });
  const joined = format(data.user.joinedAt, { includeGregorianYear: true });
  const dob = format(data.profile.dateOfBirth, { includeGregorianYear: true });
  const bulugh = format(data.profile.bulughDate, { includeGregorianYear: true });

  return (
    <section className={styles.overviewGrid}>
      <Card className={styles.overviewCard}>
        <div className={styles.cardIconRow}>
          <UserRound size={18} />
          <span>{t('demo.sample_user')}</span>
        </div>
        <h2 className={styles.sampleName}>{data.user.name}</h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>{t('demo.joined')}</dt>
            <dd className={styles.definitionValue}>
              <DemoDateStack
                value={joined}
                primaryLabel={primaryCalendarLabel}
                secondaryLabel={secondaryCalendarLabel}
              />
            </dd>
          </div>
          <div>
            <dt>{t('demo.today_label')}</dt>
            <dd className={styles.definitionValue}>
              <DemoDateStack
                value={today}
                primaryLabel={primaryCalendarLabel}
                secondaryLabel={secondaryCalendarLabel}
              />
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        title={<GlossaryText>{t('demo.salah_title')}</GlossaryText>}
        subtitle={<GlossaryText>{t('demo.salah_subtitle')}</GlossaryText>}
      >
        <div className={styles.metricRow}>
          <span className={styles.metricValue}>{fmtNumber(data.salah.remaining)}</span>
          <span className={styles.metricLabel}>{t('dashboard.prayers_remaining')}</span>
        </div>
        <ProgressBar
          value={data.salah.completed}
          max={data.salah.total}
          label={t('dashboard.overall_progress')}
        />
        <div className={styles.statRow}>
          <div className={styles.statBox}>
            <strong>{fmtNumber(data.salah.streakDays)}</strong>
            <span>{t('dashboard.streak_days', { count: data.salah.streakDays })}</span>
          </div>
          <div className={styles.statBox}>
            <strong>{fmtNumber(data.salah.qadaaLoggedToday)}</strong>
            <span>
              <GlossaryText>{t('demo.qadaa_logged_today')}</GlossaryText>
            </span>
          </div>
        </div>

        {(data.bestPrayerStreak || data.monThuStreak > 0) && (
          <div className={styles.recordStreakList}>
            {data.bestPrayerStreak && (
              <div className={styles.recordStreakRow}>
                <Moon size={13} className={styles.recordStreakIcon} />
                <span>
                  {t('dashboard.record_prayer_streak', {
                    prayer: t(`prayers.${data.bestPrayerStreak.name}`),
                    n: fmtNumber(data.bestPrayerStreak.count),
                    count: data.bestPrayerStreak.count,
                  })}
                </span>
              </div>
            )}
            {data.monThuStreak > 0 && (
              <div className={styles.recordStreakRow}>
                <Sun size={13} className={styles.recordStreakIcon} />
                <span>
                  {t('dashboard.record_mon_thu_streak', {
                    n: fmtNumber(data.monThuStreak),
                    count: data.monThuStreak,
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card
        title={<GlossaryText>{t('demo.sawm_title')}</GlossaryText>}
        subtitle={<GlossaryText>{t('demo.sawm_subtitle')}</GlossaryText>}
      >
        <div className={styles.metricRow}>
          <span className={styles.metricValue}>{fmtNumber(data.sawm.remaining)}</span>
          <span className={styles.metricLabel}>{t('dashboard.fasts_remaining')}</span>
        </div>
        <ProgressBar
          value={data.sawm.completed}
          max={data.sawm.total}
          label={t('dashboard.ramadan_progress')}
          variant="accent"
        />
        <div className={styles.statRow}>
          <div className={styles.statBox}>
            <strong>
              <GlossaryText>
                {data.sawm.todayStatus === 'logged'
                  ? t('demo.fast_status_logged')
                  : t('demo.fast_status_pending')}
              </GlossaryText>
            </strong>
            <span>
              <GlossaryText>{t(`demo.fast_mode_${data.sawm.currentMode}`)}</GlossaryText>
            </span>
          </div>
          <div className={styles.statBox}>
            <strong>{fmtNumber(data.sawm.ramadansRecovered)}</strong>
            <span>
              <GlossaryText>{t('demo.ramadans_recovered')}</GlossaryText>
            </span>
          </div>
        </div>
      </Card>

      <Card
        title={<GlossaryText>{t('demo.profile_title')}</GlossaryText>}
        subtitle={<GlossaryText>{t('demo.profile_subtitle')}</GlossaryText>}
      >
        <dl className={styles.definitionList}>
          <div>
            <dt>{t('settings.dob')}</dt>
            <dd className={styles.definitionValue}>
              <DemoDateStack
                value={dob}
                primaryLabel={primaryCalendarLabel}
                secondaryLabel={secondaryCalendarLabel}
              />
            </dd>
          </div>
          <div>
            <dt>{t('settings.bulugh_date')}</dt>
            <dd className={styles.definitionValue}>
              <DemoDateStack
                value={bulugh}
                primaryLabel={primaryCalendarLabel}
                secondaryLabel={secondaryCalendarLabel}
              />
            </dd>
          </div>
          <div>
            <dt>{t('settings.gender')}</dt>
            <dd>{t(`onboarding.gender_${data.profile.gender}`)}</dd>
          </div>
          <div>
            <dt>{t('settings.language')}</dt>
            <dd>
              {data.profile.languages
                .map((lang) =>
                  lang === 'ar' ? t('language_switcher.arabic') : t('language_switcher.english'),
                )
                .join(' · ')}
            </dd>
          </div>
        </dl>
      </Card>
    </section>
  );
};

export const DemoDetailsGrid: React.FC<DemoDetailsGridProps> = ({
  data,
  format,
  fmtNumber,
  primaryCalendarLabel,
  secondaryCalendarLabel,
  t,
  weeklyChartData,
}) => {
  return (
    <section className={styles.detailsGrid}>
      <Card
        title={t('demo.tracker_title')}
        subtitle={<GlossaryText>{t('demo.tracker_subtitle')}</GlossaryText>}
      >
        <div className={styles.prayerGrid}>
          {data.salah.todayPrayers.map((prayer) => (
            <div
              key={prayer.name}
              className={`${styles.prayerTile} ${
                prayer.status === 'done' ? styles.prayerDone : styles.prayerPending
              }`}
            >
              <span className={styles.prayerName}>{t(`prayers.${prayer.name}`)}</span>
              <span className={styles.prayerStatus}>
                {prayer.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {prayer.status === 'done' ? t('demo.prayer_done') : t('demo.prayer_pending')}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.weeklyHeader}>
          <h3>{t('demo.weekly_title')}</h3>
        </div>
        <div className={styles.weeklyChart}>
          <Suspense fallback={<div className={styles.settingEmpty}>{t('common.loading')}</div>}>
            <DemoWeeklyChart data={weeklyChartData} fmtNumber={fmtNumber} t={t} />
          </Suspense>
        </div>
      </Card>

      <Card
        title={t('demo.periods_title')}
        subtitle={<GlossaryText>{t('demo.periods_subtitle')}</GlossaryText>}
      >
        <div className={styles.periodList}>
          {data.practicingPeriods.map((period) => {
            const start = format(period.startDate, { includeGregorianYear: true });
            const end = period.endDate
              ? format(period.endDate, { includeGregorianYear: true })
              : null;

            return (
              <article key={period.id} className={styles.periodCard}>
                <div className={styles.periodHeader}>
                  <span className={styles.periodBadge}>{t(`demo.period_type_${period.type}`)}</span>
                  <CalendarRange size={16} />
                </div>
                <DemoDateStack
                  value={start}
                  primaryLabel={primaryCalendarLabel}
                  secondaryLabel={secondaryCalendarLabel}
                  className={styles.periodDateStack}
                />
                <div className={styles.periodMeta}>
                  <span className={styles.periodMetaLabel}>
                    {end ? t('common.end_date') : t('settings.period_ongoing')}
                  </span>
                  {end ? (
                    <DemoDateStack
                      value={end}
                      primaryLabel={primaryCalendarLabel}
                      secondaryLabel={secondaryCalendarLabel}
                      className={styles.periodMetaDate}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <Card
        title={t('demo.history_title')}
        subtitle={<GlossaryText>{t('demo.history_subtitle')}</GlossaryText>}
      >
        <div className={styles.historyList}>
          {data.history.map((entry) => {
            const dual = format(entry.date, { includeGregorianYear: true });
            const label = historyLabel(entry, t);
            const Icon = HISTORY_KIND_ICONS[entry.kind];

            return (
              <div key={entry.id} className={styles.historyRow}>
                <span className={styles.historyIcon}>
                  <Icon size={16} />
                </span>
                <div className={styles.historyCopy}>
                  <strong>{label.title}</strong>
                  <span>{label.subtitle}</span>
                </div>
                <DemoDateStack
                  value={dual}
                  primaryLabel={primaryCalendarLabel}
                  secondaryLabel={secondaryCalendarLabel}
                  className={styles.historyDate}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title={t('demo.settings_title')}
        subtitle={<GlossaryText>{t('demo.settings_subtitle')}</GlossaryText>}
      >
        <div className={styles.settingList}>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <Download size={16} />
              {t('demo.setting_export')}
            </span>
            <strong>{data.settings.exportReady ? t('demo.enabled') : t('demo.disabled')}</strong>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <Moon size={16} />
              {t('demo.setting_reset_prayers')}
            </span>
            <strong>
              {data.settings.resetPrayersEnabled ? t('demo.enabled') : t('demo.disabled')}
            </strong>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <Sun size={16} />
              {t('demo.setting_reset_fasts')}
            </span>
            <strong>
              {data.settings.resetFastsEnabled ? t('demo.enabled') : t('demo.disabled')}
            </strong>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <ShieldCheck size={16} />
              {t('demo.setting_delete')}
            </span>
            <strong>
              {data.settings.deleteAccountEnabled ? t('demo.enabled') : t('demo.disabled')}
            </strong>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <BookOpen size={16} />
              {t('demo.setting_privacy')}
            </span>
            <strong>{t(`demo.privacy_${data.settings.privacyModel}`)}</strong>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <History size={16} />
              {t('demo.setting_auth')}
            </span>
            <strong>{t(`demo.auth_${data.settings.authCompatibility}`)}</strong>
          </div>
        </div>
      </Card>
    </section>
  );
};
