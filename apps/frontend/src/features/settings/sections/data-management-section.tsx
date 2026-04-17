import React, { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useExportData } from '@/hooks/use-profile';
import { useResetPrayerLogs, useResetFastLogs } from '@/hooks/use-worship';
import { useResetCooldown } from '@/hooks/use-reset-cooldown';
import { useHasLogsCache } from '@/hooks/use-has-logs-cache';
import { getAuthErrorKey } from '@/lib/auth-errors';
import { SettingsSection } from '../components';
import { ActionCard } from '../components/ActionCard';
import { getResetErrorMessage } from '../helpers/error-messages';
import type { DataAction } from '../types/data-management.types';
import styles from '../settings-page.module.css';

export const DataManagementSection: React.FC = () => {
  const { t } = useLanguage();
  const { user, verifyPassword } = useAuth();

  const prayersCooldown = useResetCooldown('prayers');
  const fastsCooldown = useResetCooldown('fasts');
  const exportCooldown = useResetCooldown('export');

  const exportData = useExportData({
    cooldown: {
      checkBeforeRequest: exportCooldown.checkBeforeRequest,
      secondsRemaining: exportCooldown.secondsRemaining,
      recordAttempt: exportCooldown.recordAttempt,
    },
  });
  const resetPrayerLogs = useResetPrayerLogs();
  const resetFastLogs = useResetFastLogs();

  const hasPrayerLogs = useHasLogsCache('prayers');
  const hasFastLogs = useHasLogsCache('fasts');

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
    if (pendingAction) return;
    setActiveAction(null);
    setPassword('');
    setError('');
  };

  const handlePasswordChange = useCallback((nextPassword: string) => {
    setPassword(nextPassword);
    setError('');
  }, []);

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
      setError(getResetErrorMessage(actionError, action, t));
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
          cooldownSeconds={exportCooldown.secondsRemaining}
          cooldownActive={exportCooldown.isCoolingDown}
          hasLogs={true}
          error={error}
          isPending={pendingAction === 'export'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={handlePasswordChange}
          onConfirm={executeAction}
        />

        <ActionCard
          action="prayers"
          activeAction={activeAction}
          cooldownSeconds={prayersCooldown.secondsRemaining}
          cooldownActive={prayersCooldown.isCoolingDown}
          hasLogs={hasPrayerLogs}
          error={error}
          isPending={pendingAction === 'prayers'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={handlePasswordChange}
          onConfirm={executeAction}
        />

        <ActionCard
          action="fasts"
          activeAction={activeAction}
          cooldownSeconds={fastsCooldown.secondsRemaining}
          cooldownActive={fastsCooldown.isCoolingDown}
          hasLogs={hasFastLogs}
          error={error}
          isPending={pendingAction === 'fasts'}
          password={password}
          onOpen={openAction}
          onClose={closeAction}
          onPasswordChange={handlePasswordChange}
          onConfirm={executeAction}
        />
      </div>
    </SettingsSection>
  );
};
