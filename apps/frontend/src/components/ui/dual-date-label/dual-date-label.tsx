import React from 'react';
import { useDualDate } from '@/hooks/use-dual-date';
import styles from './dual-date-label.module.css';

type DualDateLabelProps = {
  date: string;
  layout?: 'inline' | 'stacked';
  includeGregorianYear?: boolean;
  weekday?: 'short' | 'long';
  className?: string;
};

const cls = (...tokens: Array<string | false | null | undefined>) =>
  tokens.filter(Boolean).join(' ');

export const DualDateLabel: React.FC<DualDateLabelProps> = ({
  date,
  layout = 'inline',
  includeGregorianYear = true,
  weekday,
  className,
}) => {
  const { format } = useDualDate();
  const normalizedDate = date.trim();

  if (!normalizedDate) {
    return <span className={cls(styles.root, className)}>—</span>;
  }

  const formatted = normalizedDate
    ? format(normalizedDate, { includeGregorianYear, weekday })
    : { primary: '—', secondary: '—' };

  if (formatted.primary === '—' && formatted.secondary === '—') {
    return <span className={cls(styles.root, className)}>—</span>;
  }

  if (layout === 'stacked') {
    return (
      <span className={cls(styles.root, styles.stacked, className)}>
        <span className={styles.primary}>{formatted.primary}</span>
        <span className={styles.secondary}>{formatted.secondary}</span>
      </span>
    );
  }

  return (
    <span className={cls(styles.root, styles.inline, className)}>
      <span className={styles.primary}>{formatted.primary}</span>
      <span className={styles.separator}>·</span>
      <span className={styles.secondary}>{formatted.secondary}</span>
    </span>
  );
};
