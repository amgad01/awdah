import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';

export class ResetFastLogsUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute({ userId }: { userId: string }): Promise<void> {
    await this.repository.clearAll(userId);
  }
}
