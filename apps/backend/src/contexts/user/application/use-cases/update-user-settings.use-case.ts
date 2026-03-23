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
      throw new ValidationError('Bulugh date cannot be before date of birth');
    }

    if (revertDate && dateOfBirth && revertDate.isBefore(dateOfBirth)) {
      throw new ValidationError('Revert date cannot be before date of birth');
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
