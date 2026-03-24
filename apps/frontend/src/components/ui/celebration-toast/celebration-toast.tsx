import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './celebration-toast.module.css';

interface CelebrationToastProps {
  message: string;
  onDismiss: () => void;
}

export const CelebrationToast: React.FC<CelebrationToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        🌟
      </span>
      <p className={styles.message}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={styles.dismiss}
        aria-label="Dismiss celebration"
      >
        <X size={14} />
      </button>
    </div>
  );
};
