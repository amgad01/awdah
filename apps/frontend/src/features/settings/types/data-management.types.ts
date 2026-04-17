/**
 * Types for Data Management Section
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

export type DataAction = 'export' | 'prayers' | 'fasts';

export type ActionTone = 'default' | 'warning';

export interface ActionConfig {
  label: string;
  hint: string;
  confirmText: string;
  confirmLabel: string;
  pendingLabel: string;
  buttonLabel: string;
  passwordLabel: string;
  disabledHint: string;
  icon: ComponentType<LucideProps>;
  testId: string;
  tone: ActionTone;
}

export interface ActionCardProps {
  action: DataAction;
  activeAction: DataAction | null;
  cooldownSeconds?: number;
  cooldownActive?: boolean;
  hasLogs?: boolean | null;
  error: string;
  isPending: boolean;
  password: string;
  onOpen: (action: DataAction) => void;
  onClose: () => void;
  onPasswordChange: (password: string) => void;
  onConfirm: (action: DataAction) => Promise<void>;
}

export interface ActionMetadata {
  labelKey: string;
  hintKey: string;
  confirmTextKey: string;
  confirmLabelKey: string;
  pendingLabelKey: string;
  passwordLabelKey: string;
  noRecordsKey: string;
  rateLimitedKey: string;
  startFailedKey: string;
  icon: ComponentType<LucideProps>;
  timerIcon: ComponentType<LucideProps>;
  testId: string;
  tone: ActionTone;
}
