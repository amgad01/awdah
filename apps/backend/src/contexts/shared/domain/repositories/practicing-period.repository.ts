import { PracticingPeriod } from '../entities/practicing-period.entity';

export interface IPracticingPeriodRepository {
  save(period: PracticingPeriod): Promise<void>;
  findByUser(userId: string): Promise<PracticingPeriod[]>;
  findById(userId: string, periodId: string): Promise<PracticingPeriod | null>;
  delete(userId: string, periodId: string): Promise<void>;
}
