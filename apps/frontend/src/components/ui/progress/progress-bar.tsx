import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import styles from './progress.module.css';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  variant?: 'primary' | 'accent' | 'success';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  variant = 'primary',
}) => {
  const { fmtNumber } = useLanguage();
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={styles.wrapper}>
      {label && (
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          <span className={styles.percentage}>{fmtNumber(percentage)}%</span>
        </div>
      )}
      <div className={styles.track}>
        <div className={`${styles.bar} ${styles[variant]}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className={styles.footer}>
        <span>
          {fmtNumber(value)} / {fmtNumber(max)}
        </span>
      </div>
    </div>
  );
};
