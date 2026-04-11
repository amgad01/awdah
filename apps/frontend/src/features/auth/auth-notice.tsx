import React from 'react';
import styles from './auth-forms.module.css';

interface AuthNoticeAction {
  label: string;
  onClick: () => void;
  testId?: string;
}

interface AuthNoticeProps {
  message: string;
  actions?: AuthNoticeAction[];
}

export const AuthNotice: React.FC<AuthNoticeProps> = ({ message, actions = [] }) => {
  return (
    <div className={styles.errorBanner} role="alert" aria-live="assertive">
      <span className={styles.errorBannerMessage}>{message}</span>
      {actions.length > 0 && (
        <div className={styles.errorBannerActions}>
          {actions.map((action) => (
            <button
              key={action.testId ?? action.label}
              type="button"
              className={styles.errorBannerAction}
              onClick={action.onClick}
              data-testid={action.testId}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
