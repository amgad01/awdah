import { ValidationError } from '@awdah/shared';
import type { HijriDate } from '@awdah/shared';
import type { UserSettings } from '../repositories/user.repository';

export function assertPracticingPeriodStartDateAllowed(
  startDate: HijriDate,
  userSettings: Pick<UserSettings, 'dateOfBirth' | 'revertDate'>,
): void {
  if (userSettings.dateOfBirth && startDate.isBefore(userSettings.dateOfBirth)) {
    throw new ValidationError('onboarding.period_error_before_dob');
  }

  if (userSettings.revertDate && startDate.isBefore(userSettings.revertDate)) {
    throw new ValidationError('onboarding.period_error_before_revert');
  }
}
