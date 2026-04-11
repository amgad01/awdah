import React from 'react';
import type { DualDateParts } from '@/hooks/use-dual-date';
import styles from './demo-page.module.css';

interface DemoDateStackProps {
  value: DualDateParts;
  primaryLabel: string;
  secondaryLabel: string;
  className?: string;
}

export const DemoDateStack: React.FC<DemoDateStackProps> = ({
  value,
  primaryLabel,
  secondaryLabel,
  className = '',
}) => {
  return (
    <span className={`${styles.dualDateStack} ${className}`.trim()}>
      <span className={styles.dualDateLine}>
        <span className={styles.calendarTag}>{primaryLabel}</span>
        <span>{value.primary}</span>
      </span>
      <span className={`${styles.dualDateLine} ${styles.dualDateLineSecondary}`}>
        <span className={styles.calendarTag}>{secondaryLabel}</span>
        <span>{value.secondary}</span>
      </span>
    </span>
  );
};
