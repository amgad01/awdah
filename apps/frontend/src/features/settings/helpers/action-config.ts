import { Download, RotateCcw, Timer } from 'lucide-react';
import { formatCooldownTime } from '@/hooks/use-reset-cooldown';
import type { DataAction, ActionConfig, ActionMetadata } from '../types/data-management.types';

const ACTION_METADATA: Record<DataAction, ActionMetadata> = {
  export: {
    labelKey: 'settings.export_data',
    hintKey: 'settings.export_data_hint',
    confirmTextKey: 'settings.export_reauth_hint',
    confirmLabelKey: 'settings.export_confirm_btn',
    pendingLabelKey: 'settings.exporting',
    passwordLabelKey: 'settings.export_confirm_password',
    noRecordsKey: 'settings.export_data_hint',
    rateLimitedKey: 'settings.export_rate_limited',
    startFailedKey: 'common.error',
    icon: Download,
    timerIcon: Timer,
    testId: 'export-data-button',
    tone: 'default',
  },
  prayers: {
    labelKey: 'settings.reset_prayers',
    hintKey: 'settings.reset_prayers_hint',
    confirmTextKey: 'settings.reset_confirm_prayers',
    confirmLabelKey: 'common.confirm',
    pendingLabelKey: 'settings.resetting',
    passwordLabelKey: 'settings.delete_confirm_password',
    noRecordsKey: 'settings.reset_prayers_no_records',
    rateLimitedKey: 'settings.reset_prayers_rate_limited',
    startFailedKey: 'settings.reset_prayers_start_failed',
    icon: RotateCcw,
    timerIcon: Timer,
    testId: 'reset-prayers-button',
    tone: 'warning',
  },
  fasts: {
    labelKey: 'settings.reset_fasts',
    hintKey: 'settings.reset_fasts_hint',
    confirmTextKey: 'settings.reset_confirm_fasts',
    confirmLabelKey: 'common.confirm',
    pendingLabelKey: 'settings.resetting',
    passwordLabelKey: 'settings.delete_confirm_password',
    noRecordsKey: 'settings.reset_fasts_no_records',
    rateLimitedKey: 'settings.reset_fasts_rate_limited',
    startFailedKey: 'settings.reset_fasts_start_failed',
    icon: RotateCcw,
    timerIcon: Timer,
    testId: 'reset-fasts-button',
    tone: 'warning',
  },
};

function buildCooldownLabel(
  label: string,
  cooldownSeconds: number,
  format: (s: number) => string,
): string {
  return `${label} (${format(cooldownSeconds)})`;
}

export function getActionConfig(
  action: DataAction,
  t: (key: string) => string,
  cooldownSeconds: number | null = null,
  hasLogs: boolean | null = null,
): ActionConfig {
  const meta = ACTION_METADATA[action];
  const isOnCooldown = cooldownSeconds !== null && cooldownSeconds > 0;
  const hasNoLogs = hasLogs === false;

  let hint: string;
  if (isOnCooldown) {
    hint = buildCooldownLabel(t(meta.rateLimitedKey), cooldownSeconds, formatCooldownTime);
  } else if (hasNoLogs && action !== 'export') {
    hint = t(meta.noRecordsKey);
  } else {
    hint = t(meta.hintKey);
  }

  const buttonLabel = isOnCooldown
    ? buildCooldownLabel(t(meta.labelKey), cooldownSeconds, formatCooldownTime)
    : t(meta.labelKey);

  const disabledHint = isOnCooldown
    ? buildCooldownLabel(t(meta.rateLimitedKey), cooldownSeconds, formatCooldownTime)
    : t(meta.noRecordsKey);

  const icon = isOnCooldown ? meta.timerIcon : meta.icon;

  return {
    label: t(meta.labelKey),
    hint,
    confirmText: t(meta.confirmTextKey),
    confirmLabel: t(meta.confirmLabelKey),
    pendingLabel: t(meta.pendingLabelKey),
    buttonLabel,
    passwordLabel: t(meta.passwordLabelKey),
    disabledHint,
    icon,
    testId: meta.testId,
    tone: meta.tone,
  };
}
