import { IUserRepository, UserSettings } from '../../../shared/domain/repositories/user.repository';
import { HijriDate, type Gender } from '@awdah/shared';

export interface UpdateUserSettingsCommand {
  userId: string;
  bulughDate: string;
  gender: Gender;
}

export class UpdateUserSettingsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(command: UpdateUserSettingsCommand): Promise<void> {
    const settings: UserSettings = {
      userId: command.userId,
      bulughDate: HijriDate.fromString(command.bulughDate),
      gender: command.gender,
    };

    await this.userRepository.save(settings);
  }
}
