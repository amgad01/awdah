import { IUserRepository, UserSettings } from '../../../shared/domain/repositories/user.repository';
import { HijriDate, ValidationError, type Gender } from '@awdah/shared';

export interface UpdateUserSettingsCommand {
  userId: string;
  bulughDate: string;
  gender: Gender;
  dateOfBirth?: string;
  revertDate?: string;
}

export class UpdateUserSettingsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(command: UpdateUserSettingsCommand): Promise<void> {
    const bulughDate = HijriDate.fromString(command.bulughDate);
    const dateOfBirth = command.dateOfBirth ? HijriDate.fromString(command.dateOfBirth) : undefined;
    const revertDate = command.revertDate ? HijriDate.fromString(command.revertDate) : undefined;

    if (dateOfBirth && bulughDate.isBefore(dateOfBirth)) {
      throw new ValidationError('onboarding.bulugh_error_before_dob');
    }

    if (revertDate && dateOfBirth && revertDate.isBefore(dateOfBirth)) {
      throw new ValidationError('onboarding.revert_error_before_dob');
    }

    const settings: UserSettings = {
      userId: command.userId,
      bulughDate,
      gender: command.gender,
      dateOfBirth,
      revertDate,
    };

    await this.userRepository.save(settings);
  }
}
