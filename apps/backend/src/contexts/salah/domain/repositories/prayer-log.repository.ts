import { PrayerLog } from '../entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';

export interface PrayerLogPage {
  items: PrayerLog[];
  nextCursor?: string;
}

export interface IPrayerLogRepository {
  save(log: PrayerLog): Promise<void>;
  deleteEntry(userId: string, date: HijriDate, prayerName: string, eventId: string): Promise<void>;
  findByUserAndDate(userId: string, date: HijriDate): Promise<PrayerLog[]>;
  findByUserAndDateRange(userId: string, start: HijriDate, end: HijriDate): Promise<PrayerLog[]>;
  findPageByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<PrayerLogPage>;
  countQadaaCompleted(userId: string): Promise<number>;
  countQadaaCompletedByPrayer(userId: string): Promise<Record<string, number>>;
  clearAll(userId: string): Promise<void>;
}
