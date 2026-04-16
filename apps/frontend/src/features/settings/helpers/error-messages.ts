import { getErrorMessage } from '../helpers';
import type { DataAction } from '../types/data-management.types';

interface ErrorPattern {
  test: (message: string, t: (key: string) => string, action: DataAction) => boolean;
  getMessage: (t: (key: string) => string, action: DataAction) => string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Rate limit errors (429) - match by comparing to translated keys
  {
    test: (msg, t, action) => {
      if (action === 'prayers') return msg === t('settings.reset_prayers_rate_limited');
      if (action === 'fasts') return msg === t('settings.reset_fasts_rate_limited');
      if (action === 'export') return msg === t('settings.export_rate_limited');
      return false;
    },
    getMessage: (t, action) => {
      if (action === 'prayers') return t('settings.reset_prayers_rate_limited');
      if (action === 'fasts') return t('settings.reset_fasts_rate_limited');
      if (action === 'export') return t('settings.export_rate_limited');
      return t('common.error');
    },
  },
  // No records errors (409) - match by comparing to translated keys
  {
    test: (msg, t) => msg === t('settings.reset_prayers_no_records'),
    getMessage: (t) => t('settings.reset_prayers_no_records'),
  },
  {
    test: (msg, t) => msg === t('settings.reset_fasts_no_records'),
    getMessage: (t) => t('settings.reset_fasts_no_records'),
  },
];

export function getResetErrorMessage(
  error: unknown,
  action: DataAction,
  t: (key: string) => string,
): string {
  const message = error instanceof Error ? error.message : '';

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(message, t, action)) {
      return pattern.getMessage(t, action);
    }
  }

  // Default fallback
  return t(getErrorMessage(error, 'common.error'));
}
