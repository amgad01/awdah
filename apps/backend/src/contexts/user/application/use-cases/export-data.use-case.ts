import { IUserRepository } from '../../../shared/domain/repositories/user.repository';

export interface ExportDataCommand {
  userId: string;
}

export class ExportDataUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(command: ExportDataCommand): Promise<Record<string, unknown>> {
    const data = await this.userRepository.exportData(command.userId);
    return {
      message: 'Data export successful',
      data,
    };
  }
}
