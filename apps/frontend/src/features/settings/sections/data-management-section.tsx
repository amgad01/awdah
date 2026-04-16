import React, { useState } from 'react';
import { Download, Lock, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useExportData } from '@/hooks/use-profile';
import { useResetPrayerLogs, useResetFastLogs } from '@/hooks/use-worship';
import { getAuthErrorKey } from '@/lib/auth-errors';
import { SettingsSection } from '../components';
import { getErrorMessage } from '../helpers';
import styles from '../settings-page.module.css';

type DataAction = 'export' | 'prayers' | 'fasts';

export const DataManagementSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, verifyPassword } = useAuth();
  const exportData = useExportData();
  const resetPrayerLogs = useResetPrayerLogs();
  const resetFastLogs = useResetFastLogs();

  const [activeAction, setActiveAction] = useState<DataAction | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const accountIdentifier = user?.email || user?.username || '';

  const pendingAction: DataAction | null = exportData.isPending
    ? 'export'
    : resetPrayerLogs.isPending
      ? 'prayers'
      : resetFastLogs.isPending
        ? 'fasts'
        : null;

  const openAction = (action: DataAction) => {
    setActiveAction(action);
    setPassword('');
    setError('');
  };

  const closeAction = () => {
    if (pendingAction) {
      return;
    }

    setActiveAction(null);
    setPassword('');
    setError('');
  };

  const executeAction = async (action: DataAction) => {
    setError('');

    try {
      await verifyPassword(accountIdentifier, password);
    } catch (authError) {
      setError(t(getAuthErrorKey(authError, 'settings.verify_password_failed')));
      return;
    }

    try {
      if (action === 'export') {
        await exportData.mutateAsync();
      } else if (action === 'prayers') {
        await resetPrayerLogs.mutateAsync();
      } else {
        await resetFastLogs.mutateAsync();
      }

      setActiveAction(null);
      setPassword('');
      setError('');
    } catch (actionError) {
      setError(t(getErrorMessage(actionError, 'common.error')));
    }
  };

  return (
    <SettingsSection icon={<Download size={18} />} title={t('settings.data_management')}>
      <div className={styles.dangerZoneActions}>
        <p className={styles.privacyText}>{t('settings.data_management_hint')}</p>
        <p className={styles.workflowNote}>{t('settings.lifecycle_workflow_note')}</p>

        <ActionCard
          action="export"
          activeAction={activeAction}
          error={error}
          isPending={pendingAction === 'export'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={(nextPassword) => {
            setPassword(nextPassword);
            setError('');
          }}
          onConfirm={executeAction}
        />

        <ActionCard
          action="prayers"
          activeAction={activeAction}
          error={error}
          isPending={pendingAction === 'prayers'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={(nextPassword) => {
            setPassword(nextPassword);
            setError('');
          }}
          onConfirm={executeAction}
        />

        <ActionCard
          action="fasts"
          activeAction={activeAction}
          error={error}
          isPending={pendingAction === 'fasts'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={(nextPassword) => {
            setPassword(nextPassword);
            setError('');
          }}
          onConfirm={executeAction}
        />
      </div>
    </SettingsSection>
  );
};

interface ActionCardProps {
  action: DataAction;
  activeAction: DataAction | null;
  error: string;
  isPending: boolean;
  password: string;
  onOpen: (action: DataAction) => void;
  onClose: () => void;
  onPasswordChange: (password: string) => void;
  onConfirm: (action: DataAction) => Promise<void>;
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  activeAction,
  error,
  isPending,
  password,
  onOpen,
  onClose,
  onPasswordChange,
  onConfirm,
}) => {
  const { t } = useLanguage();

  const config = getActionConfig(action, t);
  const isOpen = activeAction === action;

  return (
    <div className={styles.resetItem}>
      <div className={styles.resetItemInfo}>
        <span className={styles.resetItemLabel}>{config.label}</span>
        <span className={styles.resetItemHint}>{config.hint}</span>
      </div>

      {isOpen ? (
        <div
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
              placeholder={t('settings.delete_confirm_password')}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              aria-label={t('settings.delete_confirm_password')}
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
          }`}
          onClick={() => onOpen(action)}
          disabled={Boolean(activeAction)}
          data-testid={config.testId}
        >
          {config.icon}
          {config.buttonLabel}
        </button>
      )}
    </div>
  );
};

function getActionConfig(action: DataAction, t: (key: string) => string) {
  if (action === 'export') {
    return {
      label: t('settings.export_data'),
      hint: t('settings.export_data_hint'),
      confirmText: t('settings.export_reauth_hint'),
      confirmLabel: t('settings.export_confirm_btn'),
      pendingLabel: t('settings.exporting'),
      buttonLabel: t('settings.export_data'),
      icon: <Download size={14} />,
      testId: 'export-data-button',
      tone: 'default' as const,
    };
  }

  if (action === 'prayers') {
    return {
      label: t('settings.reset_prayers'),
      hint: t('settings.reset_prayers_hint'),
      confirmText: t('settings.reset_confirm_prayers'),
      confirmLabel: t('common.confirm'),
      pendingLabel: t('settings.resetting'),
      buttonLabel: t('settings.reset_prayers'),
      icon: <RotateCcw size={14} />,
      testId: 'reset-prayers-button',
      tone: 'warning' as const,
    };
  }

  return {
    label: t('settings.reset_fasts'),
    hint: t('settings.reset_fasts_hint'),
    confirmText: t('settings.reset_confirm_fasts'),
    confirmLabel: t('common.confirm'),
    pendingLabel: t('settings.resetting'),
    buttonLabel: t('settings.reset_fasts'),
    icon: <RotateCcw size={14} />,
    testId: 'reset-fasts-button',
    tone: 'warning' as const,
  };
}
