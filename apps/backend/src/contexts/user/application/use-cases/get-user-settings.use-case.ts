import { NotFoundError, UserId } from '@awdah/shared';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { userSettingsNotFound } from '../../../../shared/errors/messages';

export class GetUserSettingsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string) {
    const settings = await this.userRepository.findById(new UserId(userId));
    if (!settings) {
      throw new NotFoundError(userSettingsNotFound);
    }
    return settings;
  }
}
