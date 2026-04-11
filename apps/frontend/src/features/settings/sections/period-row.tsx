import React from 'react';
import { Pencil, X } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { DualDateLabel } from '@/components/ui/dual-date-label/dual-date-label';
import styles from '../settings-page.module.css';
import type { DebtPreview, PeriodLike } from '../types';

interface PeriodRowProps {
  period: PeriodLike & { periodId: string };
  onEdit: () => void;
}

interface PeriodDeleteConfirmProps {
  preview: DebtPreview | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  describeDebtPreview: (preview: DebtPreview) => string;
}

export const PeriodRow: React.FC<PeriodRowProps> = ({ period, onEdit }) => {
  const { t } = useLanguage();

  return (
    <div className={styles.periodRow}>
      <div className={styles.periodInfo}>
        <div className={styles.periodRowTitle}>
          <span className={styles.periodDates}>
            <DualDateLabel date={period.startDate} layout="inline" /> {t('onboarding.period_to')}{' '}
            {period.endDate ? (
              <DualDateLabel date={period.endDate} layout="inline" />
            ) : (
              t('settings.period_ongoing')
            )}
          </span>
        </div>
        <span className={styles.periodType}>{t(`onboarding.period_type_${period.type}`)}</span>
      </div>
      <div className={styles.periodActions}>
        <button
          className={styles.periodEditBtn}
          onClick={onEdit}
          aria-label={t('settings.period_edit')}
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
};

export const PeriodDeleteConfirm: React.FC<PeriodDeleteConfirmProps> = ({
  preview,
  isPending,
  onCancel,
  onConfirm,
  describeDebtPreview,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.periodDeleteConfirm}>
      <p className={styles.periodDeleteConfirmMsg}>{t('settings.period_delete_confirm')}</p>
      {preview ? (
        <p className={styles.periodDeleteConfirmPreview}>{describeDebtPreview(preview)}</p>
      ) : null}
      <div className={styles.periodDeleteConfirmActions}>
        <button type="button" className={styles.cancelAddBtn} onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={styles.periodDeleteConfirmBtn}
          onClick={onConfirm}
          disabled={isPending}
        >
          <X size={14} />
          {t('settings.period_delete')}
        </button>
      </div>
    </div>
  );
};
