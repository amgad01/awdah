import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import type { DebtPreview } from '../types';
import styles from '../settings-page.module.css';

interface DebtImpactPreviewProps {
  preview: DebtPreview;
}

export const DebtImpactPreview: React.FC<DebtImpactPreviewProps> = ({ preview }) => {
  const { t, fmtNumber } = useLanguage();

  const deltaClass =
    preview.delta < 0
      ? styles.impactPreviewPositive
      : preview.delta > 0
        ? styles.impactPreviewNegative
        : styles.impactPreviewNeutral;

  const deltaLabel =
    preview.delta < 0
      ? `-${fmtNumber(Math.abs(preview.delta))}`
      : preview.delta > 0
        ? `+${fmtNumber(preview.delta)}`
        : fmtNumber(0);

  const description = (() => {
    if (preview.delta < 0) {
      return t('settings.debt_preview_reduced', { n: fmtNumber(Math.abs(preview.delta)) });
    }
    if (preview.delta > 0) {
      return t('settings.debt_preview_increased', { n: fmtNumber(preview.delta) });
    }
    return t('settings.debt_preview_unchanged');
  })();

  return (
    <div className={styles.impactPreview}>
      <div className={styles.impactPreviewHeader}>
        <span className={styles.impactPreviewTitle}>{t('settings.debt_preview_title')}</span>
        <span className={`${styles.impactPreviewDelta} ${deltaClass}`}>{deltaLabel}</span>
      </div>
      <div className={styles.impactPreviewStats}>
        <div className={styles.impactPreviewStat}>
          <span>{t('settings.debt_preview_current')}</span>
          <strong>{fmtNumber(preview.current)}</strong>
        </div>
        <div className={styles.impactPreviewStat}>
          <span>{t('settings.debt_preview_next')}</span>
          <strong>{fmtNumber(preview.next)}</strong>
        </div>
      </div>
      <p className={styles.impactPreviewBody}>{description}</p>
    </div>
  );
};
