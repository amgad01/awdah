import React from 'react';
import { CalendarDays, Flame, Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import styles from './dashboard.module.css';

interface SnapshotCardData {
  key: string;
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
  wide?: boolean;
}

interface SnapshotGridProps {
  todayPrimary: string;
  todaySecondary: string;
  salahCompleted: string;
  sawmCompleted: string;
  streak: string;
  t: (key: string) => string;
}

export const SnapshotGrid: React.FC<SnapshotGridProps> = ({
  todayPrimary,
  todaySecondary,
  salahCompleted,
  sawmCompleted,
  streak,
  t,
}) => {
  const streakNum = parseInt(streak.replace(/[^\d]/g, ''), 10) || 0;

  const cards: SnapshotCardData[] = [
    {
      key: 'today',
      icon: CalendarDays,
      label: t('dashboard.snapshot_today'),
      value: todayPrimary,
      detail: todaySecondary,
      wide: true,
    },
    {
      key: 'salah',
      icon: Moon,
      label: t('dashboard.snapshot_salah'),
      value: salahCompleted,
      detail: t('dashboard.completed_label'),
    },
    {
      key: 'sawm',
      icon: Sun,
      label: t('dashboard.snapshot_sawm'),
      value: sawmCompleted,
      detail: t('dashboard.sawm_completed_label'),
    },
    {
      key: 'streak',
      icon: Flame,
      label: t('dashboard.snapshot_streak'),
      value: streak,
      detail: streakNum > 0 ? t('dashboard.streak_days') : t('dashboard.streak_none'),
    },
  ];

  return (
    <section className={styles.snapshotGrid}>
      {cards.map(({ key, icon: Icon, label, value, detail, wide }) => (
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
  );
};
