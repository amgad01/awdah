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

  const isNetworkError = message.toLowerCase().includes('failed to fetch');
  const displayTitle = isNetworkError
    ? t('common.maintenance_title')
    : (title ?? t('common.error'));
  const displayMessage = isNetworkError ? t('common.maintenance_message') : message;

  return (
    <div className={styles.wrapper} role="alert">
      <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <AlertCircle size={compact ? 24 : 32} className={styles.icon} />
        <h2 className={styles.title}>{displayTitle}</h2>
        <p className={styles.message}>{displayMessage}</p>
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
