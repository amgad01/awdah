import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { PracticingPeriodType } from '@awdah/shared';

export interface PracticingPeriodDto {
  periodId: string;
  startDate: string;
  endDate: string;
  type: PracticingPeriodType;
}

export class GetPracticingPeriodsUseCase {
  constructor(private readonly repository: IPracticingPeriodRepository) {}

  async execute(userId: string): Promise<PracticingPeriodDto[]> {
    const periods = await this.repository.findByUser(userId);
    return periods.map((p) => ({
      periodId: p.periodId,
      startDate: p.startDate.toString(),
      endDate: p.endDate.toString(),
      type: p.type,
    }));
  }
}
