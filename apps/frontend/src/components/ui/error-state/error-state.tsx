import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import styles from './error-state.module.css';

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  title,
  onRetry,
  retryLabel,
  compact = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className={styles.wrapper} role="alert">
      <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <AlertCircle size={compact ? 24 : 32} className={styles.icon} />
        <h2 className={styles.title}>{title ?? t('common.error')}</h2>
        <p className={styles.message}>{message}</p>
        {onRetry ? (
          <button type="button" className={styles.action} onClick={onRetry}>
            <RefreshCw size={16} />
            {retryLabel ?? t('common.retry')}
          </button>
        ) : null}
      </div>
    </div>
  );
};
