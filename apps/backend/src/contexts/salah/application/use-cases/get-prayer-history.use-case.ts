import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';

export interface GetPrayerHistoryCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export class GetPrayerHistoryUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: GetPrayerHistoryCommand): Promise<PrayerLog[]> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    return this.repository.findByUserAndDateRange(command.userId, start, end);
  }
}
