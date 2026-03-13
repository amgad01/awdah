import { IUserRepository } from '../../../shared/domain/repositories/user.repository';

export class GetUserSettingsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string) {
    const settings = await this.userRepository.findById(userId);
    return settings;
  }
}
