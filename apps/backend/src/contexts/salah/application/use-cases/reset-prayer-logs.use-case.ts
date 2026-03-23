import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';

export class ResetPrayerLogsUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute({ userId }: { userId: string }): Promise<void> {
    await this.repository.clearAll(userId);
  }
}
