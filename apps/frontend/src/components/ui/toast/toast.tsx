import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import styles from './toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 200); // Match exit animation duration
  }, [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className={styles.successIcon} />;
      case 'error':
        return <AlertCircle size={18} className={styles.errorIcon} />;
      case 'info':
        return <Info size={18} className={styles.infoIcon} />;
    }
  };

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${isExiting ? styles.exit : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.icon}>{getIcon()}</div>
      <p className={styles.message}>{message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className={styles.dismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};
