import { FastLog } from '../entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';

export interface FastLogPage {
  items: FastLog[];
  nextCursor?: string;
}

export interface IFastLogRepository {
  save(log: FastLog): Promise<void>;
  deleteEntry(userId: string, date: HijriDate, eventId: string): Promise<void>;
  findByUserAndDate(userId: string, date: HijriDate): Promise<FastLog[]>;
  findByUserAndDateRange(userId: string, start: HijriDate, end: HijriDate): Promise<FastLog[]>;
  findPageByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<FastLogPage>;
  countQadaaCompleted(userId: string): Promise<number>;
}
