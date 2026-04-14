import { UserId, PeriodId } from '@awdah/shared';
import { PracticingPeriod } from '../entities/practicing-period.entity';

export interface IPracticingPeriodRepository {
  save(period: PracticingPeriod): Promise<void>;
  findByUser(userId: UserId): Promise<PracticingPeriod[]>;
  findById(userId: UserId, periodId: PeriodId): Promise<PracticingPeriod | null>;
  delete(userId: UserId, periodId: PeriodId): Promise<void>;
}
