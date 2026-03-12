import { FastLog } from '../entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';

export interface IFastLogRepository {
  save(log: FastLog): Promise<void>;
  findByUserAndDateRange(userId: string, start: HijriDate, end: HijriDate): Promise<FastLog[]>;
  countQadaaCompleted(userId: string): Promise<number>;
}
