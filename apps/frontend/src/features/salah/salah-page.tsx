import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSalahDebt } from '@/hooks/use-worship';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { Card } from '@/components/ui/card/card';
import { ProgressBar } from '@/components/ui/progress/progress-bar';
import { PrayerLogger } from '@/features/salah/prayer-logger';
import { PRAYERS } from '@/lib/constants';
import { QUERY_KEYS } from '@/lib/query-keys';
import { todayHijriDate } from '@/utils/date-utils';
import { Moon, CheckCircle2, Circle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import styles from './salah-page.module.css';

export const SalahPage: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { format } = useDualDate();
  const queryClient = useQueryClient();
  const { data: debt, isLoading, isError, error } = useSalahDebt();
  const [showRemaining, setShowRemaining] = useState(false);

  const total = debt?.totalPrayersOwed ?? 0;
  const completed = debt?.completedPrayers ?? 0;
  const remaining = debt?.remainingPrayers ?? 0;
  const perPrayer = debt?.perPrayerRemaining;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allComplete = total > 0 && remaining === 0;

  const todayDual = format(todayHijriDate());

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : t('common.error')}
        onRetry={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt })}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroBadge}>{t('salah.hero_badge')}</span>
          <h1 className={styles.heroTitle}>{t('salah.title')}</h1>
          <p className={styles.heroSubtitle}>{t('salah.subtitle')}</p>
          <div className={styles.heroChips}>
            <span className={styles.heroChip}>{todayDual.primary}</span>
            <span className={`${styles.heroChip} ${styles.heroChipSecondary}`}>
              {todayDual.secondary}
            </span>
          </div>
        </div>

        <Card className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <Moon size={20} aria-hidden="true" />
            <span className={styles.heroCardLabel}>{t('salah.hero_focus')}</span>
          </div>
          <span className={styles.heroCardValue}>{fmtNumber(completed)}</span>
          <p className={styles.heroCardBody}>
            {allComplete
              ? t('salah.hero_focus_complete')
              : t('salah.hero_focus_body', { completed: fmtNumber(completed) })}
          </p>
        </Card>
      </section>

      {/* ── Quick Stats ── */}
      <div className={styles.quickStats}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('salah.owed')}</span>
          <span className={styles.statValue}>{fmtNumber(total)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('salah.completed')}</span>
          <span className={`${styles.statValue} ${styles.statSuccess}`}>
            {fmtNumber(completed)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('salah.remaining')}</span>
          <span className={`${styles.statValue} ${styles.statPrimary}`}>
            {fmtNumber(remaining)}
          </span>
        </div>
      </div>

      {/* ── Progress Card ── */}
      <Card className={styles.progressCard}>
        <ProgressBar
          value={completed}
          max={total || 1}
          label={`${fmtNumber(progressPct)}% ${t('salah.complete')}`}
        />

        {allComplete ? (
          <div className={styles.completedMsg}>
            <CheckCircle2 size={20} />
            {t('salah.all_complete')}
          </div>
        ) : remaining > 0 ? (
          <>
            <button
              className={styles.toggleRemaining}
              onClick={() => setShowRemaining((v) => !v)}
              aria-expanded={showRemaining}
            >
              <span>{showRemaining ? t('salah.hide_details') : t('salah.view_details')}</span>
              {showRemaining ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRemaining && (
              <div className={styles.remainingSection}>
                <div className={styles.remainingDetail}>
                  <TrendingUp size={16} aria-hidden="true" />
                  <span>
                    <strong>{fmtNumber(remaining)}</strong> {t('dashboard.salah_remaining_details')}
                  </span>
                </div>

                {perPrayer && (
                  <div className={styles.perPrayerBreakdown}>
                    <h3 className={styles.perPrayerTitle}>{t('salah.per_prayer_title')}</h3>
                    <div className={styles.perPrayerGrid}>
                      {PRAYERS.map((name) => {
                        const prayerRemaining = perPrayer[name] ?? 0;
                        return (
                          <div key={name} className={styles.perPrayerItem}>
                            <span className={styles.perPrayerName}>{t(`prayers.${name}`)}</span>
                            <span className={styles.perPrayerCount}>
                              {fmtNumber(prayerRemaining)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </Card>

      {/* ── Encouragement ── */}
      <div className={styles.encouragement}>{t('salah.encouragement')}</div>

      <div className={styles.grid}>
        {/* ── Daily Prayer Logger ── */}
        <Card title={t('salah.daily_logger')} subtitle={t('salah.daily_logger_hint')}>
          <PrayerLogger />
        </Card>

        {/* ── Guidance ── */}
        <Card title={t('salah.guidance_title')} variant="outline" className={styles.guidanceCard}>
          <ul className={styles.guidanceList}>
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={styles.guidanceItem}>
                <Circle size={8} className={styles.bullet} />
                <span>{t(`salah.guidance_${n}`)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.guidanceNote}>{t('salah.guidance_note')}</p>
        </Card>
      </div>
    </div>
  );
};
