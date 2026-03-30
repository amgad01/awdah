import { createContext } from 'react';

export interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
