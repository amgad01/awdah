import React from 'react';
import { Target } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { GlossaryText } from '@/components/ui/term-tooltip';
import styles from './dashboard.module.css';

interface DashboardHeroProps {
  username: string;
  todayPrimary: string;
  todaySecondary: string;
  salahCompleted: string;
  sawmCompleted: string;
  salahRemaining: string;
  sawmRemaining: string;
  streak: number;
  streakFormatted: string;
  allDebtCleared: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  username,
  todayPrimary,
  todaySecondary,
  salahCompleted,
  sawmCompleted,
  salahRemaining,
  sawmRemaining,
  streak,
  streakFormatted,
  allDebtCleared,
  t,
}) => (
  <section className={styles.hero}>
    <div className={styles.heroMain}>
      <span className={styles.heroBadge}>{t('dashboard.hero_badge')}</span>
      <h1 className={styles.title}>
        {t('common.welcome_back')}, <span className={styles.name}>{username || 'User'}</span>
      </h1>
      <p className={styles.subtitle}>
        <GlossaryText>{t('dashboard.slogan')}</GlossaryText>
      </p>

      <div className={styles.heroChips}>
        <span className={styles.heroChip}>{todayPrimary}</span>
        <span className={`${styles.heroChip} ${styles.heroChipSecondary}`}>{todaySecondary}</span>
        <span className={styles.heroChip}>
          {t('dashboard.hero_prayers_chip', { prayers: salahCompleted })}
        </span>
        <span className={styles.heroChip}>
          {t('dashboard.hero_fasts_chip', { fasts: sawmCompleted })}
        </span>
        {streak > 0 ? (
          <span className={styles.heroChip}>
            {t('dashboard.hero_streak_chip', { days: streakFormatted })}
          </span>
        ) : null}
      </div>
    </div>

    <Card className={styles.heroCard}>
      <div className={styles.heroCardHeader}>
        <span className={styles.heroCardKicker}>{t('dashboard.hero_focus')}</span>
        <Target size={18} />
      </div>
      <div className={styles.heroCardValue}>{salahCompleted}</div>
      <p className={styles.heroCardLabel}>{t('dashboard.completed_label')}</p>
      <p className={styles.heroCardBody}>
        <GlossaryText>
          {allDebtCleared
            ? t('dashboard.hero_focus_complete')
            : t('dashboard.hero_focus_body', {
                prayers: salahCompleted,
                fasts: sawmCompleted,
              })}
        </GlossaryText>
      </p>
      <div className={styles.heroCardStats}>
        <div className={styles.heroCardStat}>
          <strong>{salahRemaining}</strong>
          <span>{t('dashboard.prayers_remaining')}</span>
        </div>
        <div className={styles.heroCardStat}>
          <strong>{sawmRemaining}</strong>
          <span>{t('dashboard.fasts_remaining')}</span>
        </div>
      </div>
    </Card>
  </section>
);
