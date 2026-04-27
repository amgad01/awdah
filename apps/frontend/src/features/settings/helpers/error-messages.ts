import { ERROR_CODES } from '@awdah/shared';
import { resolveApiErrorKey } from '@/lib/api-error-codes';
import { getErrorMessage } from '../helpers';
import type { DataAction } from '../types/data-management.types';

export function getResetErrorMessage(
  error: unknown,
  _action: DataAction,
  t: (key: string) => string,
): string {
  return t(resolveApiErrorKey(error, getErrorMessage(error, 'common.error')));
}

export { ERROR_CODES };
