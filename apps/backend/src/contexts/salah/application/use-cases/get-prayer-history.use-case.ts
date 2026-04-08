import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { HijriDate } from '@awdah/shared';
import type { PrayerName as PrayerNameType, LogType as LogTypeT } from '@awdah/shared';
import { createPrayerSlotKey } from '../../../../shared/utils/prayer-slot-key';

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

    // Split obligatory vs qadaa — different dedup strategies.
    const obligatory: (typeof logs)[number][] = [];
    const qadaaBySlot = new Map<string, (typeof logs)[number][]>();

    for (const log of logs) {
      if (log.type.getValue() === 'qadaa') {
        const key = createPrayerSlotKey(log.date.toString(), log.prayerName.getValue());
        const bucket = qadaaBySlot.get(key) ?? [];
        bucket.push(log);
        qadaaBySlot.set(key, bucket);
      } else {
        obligatory.push(log);
      }
    }

    // Obligatory: keep latest entry per (date, prayerName) slot, return if 'prayed'.
    type SlotEntry = { log: (typeof logs)[number]; ts: number };
    const slots = new Map<string, SlotEntry>();
    for (const log of obligatory) {
      const key = `${log.date.toString()}#${log.prayerName.getValue()}#${log.type.getValue()}`;
      const existing = slots.get(key);
      const ts = log.loggedAt.getTime();
      if (!existing || ts > existing.ts) {
        slots.set(key, { log, ts });
      }
    }

    const result: PrayerLogDto[] = Array.from(slots.values())
      .filter(({ log }) => log.action === 'prayed')
      .map(({ log }) => ({
        eventId: log.eventId,
        date: log.date.toString(),
        prayerName: log.prayerName.getValue(),
        type: log.type.getValue(),
        action: log.action,
        loggedAt: log.loggedAt.toISOString(),
      }));

    // Qadaa: net count = prayed − deselected. Return one entry per net unit.
    for (const [, bucket] of qadaaBySlot) {
      let net = 0;
      const prayedEntries: (typeof logs)[number][] = [];
      for (const log of bucket) {
        if (log.action === 'prayed') {
          net += 1;
          prayedEntries.push(log);
        } else {
          net -= 1;
        }
      }

      // Return up to `net` prayed entries (most recent first for stable eventIds).
      const kept = prayedEntries
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        .slice(0, Math.max(0, net));
      for (const log of kept) {
        result.push({
          eventId: log.eventId,
          date: log.date.toString(),
          prayerName: log.prayerName.getValue(),
          type: log.type.getValue(),
          action: log.action,
          loggedAt: log.loggedAt.toISOString(),
        });
      }
    }

    return result;
  }
}
