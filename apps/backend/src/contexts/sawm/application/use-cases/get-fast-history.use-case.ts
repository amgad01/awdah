import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { FastLog } from '../../domain/entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';

export interface GetFastHistoryCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export class GetFastHistoryUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute(command: GetFastHistoryCommand): Promise<FastLog[]> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    return this.repository.findByUserAndDateRange(command.userId, start, end);
  }
}
