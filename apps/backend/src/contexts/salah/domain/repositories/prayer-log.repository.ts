import { PrayerLog } from '../entities/prayer-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';

export interface PrayerLogPage {
  items: PrayerLog[];
  nextCursor?: string;
}

export interface IPrayerLogRepository {
  save(log: PrayerLog): Promise<void>;
  deleteEntry(userId: UserId, date: HijriDate, prayerName: string, eventId: EventId): Promise<void>;
  findByUserAndDate(userId: UserId, date: HijriDate): Promise<PrayerLog[]>;
  findByUserAndDateRange(userId: UserId, start: HijriDate, end: HijriDate): Promise<PrayerLog[]>;
  findPageByUserAndDateRange(
    userId: UserId,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<PrayerLogPage>;
  countQadaaCompleted(userId: UserId): Promise<number>;
  countQadaaCompletedByPrayer(userId: UserId): Promise<Record<string, number>>;
}
