import {
  HijriDate,
  type PrayerName as PrayerNameType,
  type LogType as LogTypeT,
} from '@awdah/shared';
import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';

export interface GetPrayerHistoryPageCommand {
  userId: string;
  startDate: string;
  endDate: string;
  limit: number;
  cursor?: string;
}

export interface PrayerHistoryPageDto {
  items: Array<{
    eventId: string;
    date: string;
    prayerName: PrayerNameType;
    type: LogTypeT;
    action: 'prayed' | 'deselected';
    loggedAt: string;
  }>;
  nextCursor?: string;
  hasMore: boolean;
}

export class GetPrayerHistoryPageUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: GetPrayerHistoryPageCommand): Promise<PrayerHistoryPageDto> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    const page = await this.repository.findPageByUserAndDateRange(command.userId, start, end, {
      limit: command.limit,
      cursor: command.cursor,
    });

    return {
      items: page.items.map((log) => ({
        eventId: log.eventId,
        date: log.date.toString(),
        prayerName: log.prayerName.getValue(),
        type: log.type.getValue(),
        action: log.action,
        loggedAt: log.loggedAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
      hasMore: page.nextCursor !== undefined,
    };
  }
}
