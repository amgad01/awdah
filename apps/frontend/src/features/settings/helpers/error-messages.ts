import { getErrorMessage } from '../helpers';
import { ApiRequestError } from '@/lib/api';
import type { DataAction } from '../types/data-management.types';

interface ErrorPattern {
  test: (error: unknown, action: DataAction) => boolean;
  getMessage: (t: (key: string) => string, action: DataAction) => string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Rate limit errors (429) - match by status code
  {
    test: (error) => error instanceof ApiRequestError && error.status === 429,
    getMessage: (t, action) => {
      if (action === 'prayers') return t('settings.reset_prayers_rate_limited');
      if (action === 'fasts') return t('settings.reset_fasts_rate_limited');
      if (action === 'export') return t('settings.export_rate_limited');
      return t('common.error');
    },
  },
  // No records errors (409 Conflict) - match by status code
  {
    test: (error, action) =>
      error instanceof ApiRequestError && error.status === 409 && action === 'prayers',
    getMessage: (t) => t('settings.reset_prayers_no_records'),
  },
  {
    test: (error, action) =>
      error instanceof ApiRequestError && error.status === 409 && action === 'fasts',
    getMessage: (t) => t('settings.reset_fasts_no_records'),
  },
];

export function getResetErrorMessage(
  error: unknown,
  action: DataAction,
  t: (key: string) => string,
): string {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(error, action)) {
      return pattern.getMessage(t, action);
    }
  }

  // Default fallback
  return t(getErrorMessage(error, 'common.error'));
}
