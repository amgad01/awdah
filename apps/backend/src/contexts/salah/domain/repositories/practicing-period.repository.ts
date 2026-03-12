import { PracticingPeriod } from '../entities/practicing-period.entity';

export interface IPracticingPeriodRepository {
  save(period: PracticingPeriod): Promise<void>;
  findByUser(userId: string): Promise<PracticingPeriod[]>;
  delete(userId: string, periodId: string): Promise<void>;
}
