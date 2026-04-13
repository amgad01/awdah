import { FastLog } from '../entities/fast-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';

export interface FastLogPage {
  items: FastLog[];
  nextCursor?: string;
}

export interface IFastLogRepository {
  save(log: FastLog): Promise<void>;
  deleteEntry(userId: UserId, date: HijriDate, eventId: EventId): Promise<void>;
  findByUserAndDate(userId: UserId, date: HijriDate): Promise<FastLog[]>;
  findByUserAndDateRange(userId: UserId, start: HijriDate, end: HijriDate): Promise<FastLog[]>;
  findPageByUserAndDateRange(
    userId: UserId,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<FastLogPage>;
  countQadaaCompleted(userId: UserId): Promise<number>;
}
