import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import styles from './day-nav.module.css';

export interface DayNavProps {
  label: string;
  sublabel?: string;
  onPrev: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isPrevDisabled?: boolean;
  /** Optional content rendered after the next button (e.g. a count badge). */
  trailing?: React.ReactNode;
}

export const DayNav: React.FC<DayNavProps> = ({
  label,
  sublabel,
  onPrev,
  onNext,
  isNextDisabled = false,
  isPrevDisabled = false,
  trailing,
}) => {
  const { t, isRTL } = useLanguage();

  // Flip arrows in RTL — visual prev/next stays consistent
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className={styles.nav}>
      <button
        className={styles.navBtn}
        onClick={onPrev}
        disabled={isPrevDisabled}
        aria-label={t('common.previous_day')}
        type="button"
        data-testid="day-nav-prev"
      >
        <PrevIcon size={18} aria-hidden="true" />
      </button>

      <div className={styles.meta}>
        <span className={styles.label}>{label}</span>
        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      </div>

      <button
        className={styles.navBtn}
        onClick={onNext}
        disabled={isNextDisabled}
        aria-label={t('common.next_day')}
        type="button"
        data-testid="day-nav-next"
      >
        <NextIcon size={18} aria-hidden="true" />
      </button>
      {trailing}
    </div>
  );
};
