/**
 * Error utilities for lifecycle mutations (export, reset prayers/fasts)
 * Provides consistent error prefix patterns for reliable detection across languages
 */

export const LIFECYCLE_ERROR_PREFIXES = {
  RATE_LIMIT: 'RATE_LIMIT',
  NO_LOGS: 'NO_LOGS',
} as const;

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
 * Checks if error should suppress toast (rate limit or no logs)
 */
export function shouldSuppressToast(error: unknown): boolean {
  return isRateLimitError(error) || isNoLogsError(error);
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
