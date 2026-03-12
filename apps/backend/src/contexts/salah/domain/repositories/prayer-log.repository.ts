import { PrayerLog } from '../entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';

export interface IPrayerLogRepository {
  save(log: PrayerLog): Promise<void>;
  findByUserAndDate(userId: string, date: HijriDate): Promise<PrayerLog[]>;
  findByUserAndDateRange(userId: string, start: HijriDate, end: HijriDate): Promise<PrayerLog[]>;
  countQadaaCompleted(userId: string): Promise<number>;
}
