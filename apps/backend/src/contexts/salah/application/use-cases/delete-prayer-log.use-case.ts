import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { HijriDate } from '@awdah/shared';

export interface DeletePrayerLogCommand {
  userId: string;
  date: string;
  prayerName: string;
  eventId: string;
}

export class DeletePrayerLogUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: DeletePrayerLogCommand): Promise<void> {
    const date = HijriDate.fromString(command.date);
    await this.repository.deleteEntry(command.userId, date, command.prayerName, command.eventId);
  }
}
