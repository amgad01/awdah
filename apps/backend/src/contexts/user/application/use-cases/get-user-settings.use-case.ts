import { NotFoundError, UserId, ERROR_CODES } from '@awdah/shared';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';

export class GetUserSettingsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string) {
    const settings = await this.userRepository.findById(new UserId(userId));
    if (!settings) {
      throw new NotFoundError(ERROR_CODES.USER_SETTINGS_NOT_FOUND);
    }
    return settings;
  }
}
