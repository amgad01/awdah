import { ERROR_CODES } from '@awdah/shared';
import { ApiRequestError } from '@/lib/api';
import enTranslations from '@/i18n/en.json';

/**
 * Maps backend semantic error codes to frontend i18n translation keys.
 * This is the single source of truth for the backend-to-frontend error contract.
 */
const ERROR_CODE_TO_I18N_KEY: Record<string, string> = {
  [ERROR_CODES.SALAH_NO_QADAA_OWED]: 'salah.error_no_qadaa_owed',
  [ERROR_CODES.SAWM_NO_QADAA_DEBT]: 'sawm.error_no_qadaa_debt',
  [ERROR_CODES.SAWM_EXCEED_QADAA_DEBT]: 'sawm.error_exceed_qadaa_debt',
  [ERROR_CODES.RESET_PRAYERS_NO_RECORDS]: 'settings.reset_prayers_no_records',
  [ERROR_CODES.RESET_PRAYERS_RATE_LIMITED]: 'settings.reset_prayers_rate_limited',
  [ERROR_CODES.RESET_FASTS_NO_RECORDS]: 'settings.reset_fasts_no_records',
  [ERROR_CODES.RESET_FASTS_RATE_LIMITED]: 'settings.reset_fasts_rate_limited',
  [ERROR_CODES.EXPORT_RATE_LIMITED]: 'settings.export_rate_limited',
  [ERROR_CODES.EXPORT_RETRY_ERROR]: 'settings.export_retry_error',
  [ERROR_CODES.EXPORT_DOWNLOAD_FAILED]: 'common.export_download_failed',
  [ERROR_CODES.TASK_NOT_FOUND]: 'common.task_not_found',
  [ERROR_CODES.TASK_FAILED]: 'common.task_failed',
  [ERROR_CODES.TASK_TIMEOUT]: 'common.task_timeout',
  [ERROR_CODES.PERIOD_NOT_FOUND]: 'onboarding.period_error_not_found',
  [ERROR_CODES.PERIOD_END_BEFORE_START]: 'onboarding.period_error_end_before_start',
  [ERROR_CODES.PERIOD_BEFORE_DOB]: 'onboarding.period_error_before_dob',
  [ERROR_CODES.PERIOD_BEFORE_REVERT]: 'onboarding.period_error_before_revert',
  [ERROR_CODES.BULUGH_BEFORE_DOB]: 'onboarding.bulugh_error_before_dob',
  [ERROR_CODES.REVERT_BEFORE_DOB]: 'onboarding.revert_error_before_dob',
  [ERROR_CODES.USER_SETTINGS_NOT_FOUND]: 'common.user_settings_not_found',
};

/**
 * Resolves an i18n key from an API error.
 * Matches on the semantic error code from the response body first (ApiRequestError),
 * then checks if a plain Error message is itself a known semantic code,
 * then falls back to the provided default key.
 */
export function resolveApiErrorKey(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.code) {
    return ERROR_CODE_TO_I18N_KEY[error.code] ?? fallback;
  }
  if (error instanceof Error && ERROR_CODE_TO_I18N_KEY[error.message]) {
    return ERROR_CODE_TO_I18N_KEY[error.message];
  }
  return fallback;
}

/**
 * Returns true if the error carries a specific semantic code.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiRequestError && error.code === code;
}

/**
 * Development-only validation: ensures all error code mappings exist in i18n files.
 * Runs once on module load in development builds.
 *
 * getNestedValue is intentionally scoped here — it is only needed for this
 * one-time startup check and has no other callers.
 */
if (import.meta.env.DEV) {
  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);

  const missingKeys = Object.entries(ERROR_CODE_TO_I18N_KEY)
    .filter(
      ([, i18nKey]) =>
        getNestedValue(enTranslations as Record<string, unknown>, i18nKey) === undefined,
    )
    .map(([code, i18nKey]) => `${code} → ${i18nKey}`);

  if (missingKeys.length > 0) {
    console.error('[api-error-codes] Missing i18n keys for error codes:\n', missingKeys.join('\n'));
  }
}
