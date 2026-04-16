import React, { useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { getActionConfig } from '../helpers/action-config';
import type { ActionCardProps } from '../types/data-management.types';
import styles from '../settings-page.module.css';

const ActionCardComponent: React.FC<ActionCardProps> = ({
  action,
  activeAction,
  cooldownSeconds = 0,
  cooldownActive = false,
  hasLogs = null,
  error,
  isPending,
  password,
  onOpen,
  onClose,
  onPasswordChange,
  onConfirm,
}) => {
  const { t } = useLanguage();
  const confirmRef = useRef<HTMLDivElement>(null);

  const config = getActionConfig(action, t, cooldownActive ? cooldownSeconds : null, hasLogs);
  const isOpen = activeAction === action;

  // Close confirmation when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Disable button if cooling down, no logs, or unknown (prevents backend spam)
  const isDisabled = cooldownActive || (hasLogs !== true && action !== 'export');

  return (
    <div className={`${styles.resetItem} ${isOpen ? styles.resetItemWithConfirm : ''}`}>
      <div className={styles.resetItemInfo}>
        <span className={styles.resetItemLabel}>{config.label}</span>
        <span className={styles.resetItemHint}>{config.hint}</span>
      </div>

      {isOpen ? (
        <div
          ref={confirmRef}
          className={`${styles.workflowConfirm} ${
            config.tone === 'warning' ? styles.workflowConfirmWarning : ''
          }`}
        >
          <p className={styles.deleteConfirmText}>{config.confirmText}</p>
          <div className={styles.exportPasswordRow}>
            <Lock size={16} className={styles.exportPasswordIcon} />
            <input
              type="password"
              className={styles.exportPasswordInput}
              placeholder={config.passwordLabel}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              aria-label={config.passwordLabel}
            />
          </div>

          {error && (
            <p
              className={styles.deleteErrorText}
              role="alert"
              data-testid={`settings-${action}-error`}
            >
              {error}
            </p>
          )}

          <div className={styles.exportConfirmBtns}>
            <button
              type="button"
              className={styles.cancelAddBtn}
              onClick={onClose}
              disabled={isPending}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={styles.confirmAddBtn}
              onClick={() => void onConfirm(action)}
              disabled={isPending || !password}
            >
              {isPending ? config.pendingLabel : config.confirmLabel}
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`${styles.dataActionBtn} ${
            config.tone === 'warning' ? styles.dataActionBtnWarning : ''
          } ${isDisabled ? styles.dataActionBtnDisabled : ''}`}
          onClick={() => onOpen(action)}
          disabled={isDisabled || Boolean(activeAction)}
          data-testid={config.testId}
          title={isDisabled ? config.disabledHint : undefined}
        >
          <config.icon size={14} />
          {config.buttonLabel}
        </button>
      )}
    </div>
  );
};

ActionCardComponent.displayName = 'ActionCard';

export const ActionCard = React.memo(ActionCardComponent);
