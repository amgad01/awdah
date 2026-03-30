import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from '../components/ui/toast/toast';
import type { ToastType } from '../components/ui/toast/toast';
import styles from '../components/ui/toast/toast.module.css';
import { ToastContext } from './toast-context-value';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => showToast('success', message, duration),
    [showToast],
  );
  const error = useCallback(
    (message: string, duration?: number) => showToast('error', message, duration),
    [showToast],
  );
  const info = useCallback(
    (message: string, duration?: number) => showToast('info', message, duration),
    [showToast],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: { success, error, info } }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className={styles.toastContainer}>
            {toasts.map((toast) => (
              <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
};
