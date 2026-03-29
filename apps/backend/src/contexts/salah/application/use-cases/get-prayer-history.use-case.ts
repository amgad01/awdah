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

    // Compute effective state: for each (date, prayerName, type) slot, keep only the
    // latest entry by loggedAt. Return only slots where the latest action is 'prayed'.
    type SlotEntry = { log: (typeof logs)[number]; ts: number };
    const slots = new Map<string, SlotEntry>();
    for (const log of logs) {
      const key = `${log.date.toString()}#${log.prayerName.getValue()}#${log.type.getValue()}`;
      const existing = slots.get(key);
      const ts = log.loggedAt.getTime();
      if (!existing || ts > existing.ts) {
        slots.set(key, { log, ts });
      }
    }

    return Array.from(slots.values())
      .filter(({ log }) => log.action === 'prayed')
      .map(({ log }) => ({
        eventId: log.eventId,
        date: log.date.toString(),
        prayerName: log.prayerName.getValue(),
        type: log.type.getValue(),
        action: log.action,
        loggedAt: log.loggedAt.toISOString(),
      }));
  }
}
