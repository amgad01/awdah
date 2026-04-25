import { ConflictError } from '../errors';
import { ERROR_CODES } from '../errors/error-codes';

/**
 * Validates that a user can log a qadaa salah entry for a specific prayer.
 *
 * @throws ConflictError with code SALAH_NO_QADAA_OWED when no debt remains for that prayer
 */
export function validateCanLogSalahQadaa(perPrayerRemaining: number): void {
  if (!Number.isFinite(perPrayerRemaining) || perPrayerRemaining <= 0) {
    throw new ConflictError(ERROR_CODES.SALAH_NO_QADAA_OWED);
  }
}

/**
 * Validates that a user can log a qadaa sawm entry against their calculated debt.
 *
 * @throws ConflictError with code SAWM_NO_QADAA_DEBT / SAWM_EXCEED_QADAA_DEBT
 */
export function validateCanLogFast(debt: number, existingLogs: number): void {
  if (!Number.isFinite(debt) || !Number.isFinite(existingLogs)) {
    throw new ConflictError(ERROR_CODES.SAWM_NO_QADAA_DEBT);
  }
  if (debt === 0) {
    throw new ConflictError(ERROR_CODES.SAWM_NO_QADAA_DEBT);
  }
  if (existingLogs >= debt) {
    throw new ConflictError(ERROR_CODES.SAWM_EXCEED_QADAA_DEBT);
  }
}
