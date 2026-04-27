import { ApiRequestError } from '@/lib/api';
import { ERROR_CODES } from '@awdah/shared';

/**
 * Error utilities for lifecycle mutations (export, reset prayers/fasts)
 * Provides consistent error prefix patterns for reliable detection across languages
 */

export const LIFECYCLE_ERROR_PREFIXES = {
  RATE_LIMIT: 'RATE_LIMIT',
  NO_LOGS: 'NO_LOGS',
} as const;

const NO_RECORDS_CODES = new Set<string>([
  ERROR_CODES.RESET_PRAYERS_NO_RECORDS,
  ERROR_CODES.RESET_FASTS_NO_RECORDS,
]);

/**
 * Creates a rate limit error message with consistent prefix pattern
 * Pattern: RATE_LIMIT:{context}:{secondsRemaining}
 */
export function createRateLimitError(context: string, secondsRemaining: number): Error {
  return new Error(`${LIFECYCLE_ERROR_PREFIXES.RATE_LIMIT}:${context}:${secondsRemaining}`);
}

/**
 * Creates a "no logs" error message with consistent prefix pattern
 * Pattern: NO_LOGS:{context}
 */
export function createNoLogsError(context: string): Error {
  return new Error(`${LIFECYCLE_ERROR_PREFIXES.NO_LOGS}:${context}`);
}

/**
 * Checks if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.startsWith(`${LIFECYCLE_ERROR_PREFIXES.RATE_LIMIT}:`)
  );
}

/**
 * Checks if error is a "no logs" error
 */
export function isNoLogsError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(`${LIFECYCLE_ERROR_PREFIXES.NO_LOGS}:`);
}

/**
 * Checks if error should suppress toast.
 * Suppresses: client-side rate limit, client-side no-logs guard,
 * and backend NO_RECORDS responses (reset is idempotent — no logs = already done).
 *
 * Note: the plain Error branch checks error.message against NO_RECORDS_CODES.
 * This covers the case where a use-case throws `new Error(ERROR_CODES.X)` directly
 * (e.g. in local/test mode without ApiRequestError). Only ApiRequestError carries
 * a structured code field; plain Error instances are matched by message string.
 */
export function shouldSuppressToast(error: unknown): boolean {
  if (isRateLimitError(error) || isNoLogsError(error)) return true;
  if (error instanceof ApiRequestError && error.code && NO_RECORDS_CODES.has(error.code))
    return true;
  // Plain Error: only suppress if the message is exactly a known semantic code.
  // This is intentional — plain errors constructed with ERROR_CODES values as messages
  // are treated as structured errors in non-API contexts (e.g. local mode).
  if (
    error instanceof Error &&
    !(error instanceof ApiRequestError) &&
    NO_RECORDS_CODES.has(error.message)
  )
    return true;
  return false;
}

/**
 * Extracts seconds remaining from rate limit error message
 */
export function getRateLimitSecondsRemaining(error: unknown): number | null {
  if (!isRateLimitError(error) || !(error instanceof Error)) {
    return null;
  }
  const parts = error.message.split(':');
  const seconds = parseInt(parts[parts.length - 1], 10);
  return isNaN(seconds) ? null : seconds;
}
