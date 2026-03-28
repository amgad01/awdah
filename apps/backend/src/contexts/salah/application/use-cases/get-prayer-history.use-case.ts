import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { HijriDate } from '@awdah/shared';
import type { PrayerName as PrayerNameType, LogType as LogTypeT } from '@awdah/shared';

export interface GetPrayerHistoryCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface PrayerLogDto {
  eventId: string;
  date: string;
  prayerName: PrayerNameType;
  type: LogTypeT;
  action: 'prayed' | 'deselected';
  loggedAt: string;
}

export class GetPrayerHistoryUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: GetPrayerHistoryCommand): Promise<PrayerLogDto[]> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    const logs = await this.repository.findByUserAndDateRange(command.userId, start, end);
    return logs.map((log) => ({
      eventId: log.eventId,
      date: log.date.toString(),
      prayerName: log.prayerName.getValue(),
      type: log.type.getValue(),
      action: log.action,
      loggedAt: log.loggedAt.toISOString(),
    }));
  }
}
