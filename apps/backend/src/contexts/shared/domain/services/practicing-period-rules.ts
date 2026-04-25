import { ValidationError } from '@awdah/shared';
import type { HijriDate } from '@awdah/shared';
import type { UserSettings } from '../repositories/user.repository';
import { ERROR_CODES } from '@awdah/shared';

export function assertPracticingPeriodStartDateAllowed(
  startDate: HijriDate,
  userSettings: Pick<UserSettings, 'dateOfBirth' | 'revertDate'>,
): void {
  if (userSettings.dateOfBirth && startDate.isBefore(userSettings.dateOfBirth)) {
    throw new ValidationError(ERROR_CODES.PERIOD_BEFORE_DOB);
  }

  if (userSettings.revertDate && startDate.isBefore(userSettings.revertDate)) {
    throw new ValidationError(ERROR_CODES.PERIOD_BEFORE_REVERT);
  }
}
