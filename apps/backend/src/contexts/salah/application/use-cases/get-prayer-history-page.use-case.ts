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

    // Per-page deduplication. Results are sorted newest-first, so for any
    // (date, prayerName, type) slot the deselected entry (newer ULID) always
    // precedes its prayed counterpart within the same page.
    // First occurrence of a slot decides the effective action; skip later dupes.
    const seenSlots = new Set<string>();
    const effectiveItems: (typeof page.items)[number][] = [];
    for (const log of page.items) {
      const key = `${log.date.toString()}#${log.prayerName.getValue()}#${log.type.getValue()}`;
      if (seenSlots.has(key)) continue;
      seenSlots.add(key);
      if (log.action === 'prayed') {
        effectiveItems.push(log);
      }
    }

    return {
      items: effectiveItems.map((log) => ({
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
