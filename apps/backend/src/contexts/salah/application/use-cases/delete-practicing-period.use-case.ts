import { UserId, PeriodId } from '@awdah/shared';
import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';

export interface DeletePracticingPeriodCommand {
  userId: string;
  periodId: string;
}

export class DeletePracticingPeriodUseCase {
  constructor(private readonly repository: IPracticingPeriodRepository) {}

  async execute(command: DeletePracticingPeriodCommand): Promise<void> {
    // DELETE is idempotent — if the item is already gone the caller's intent
    // is fulfilled. DynamoDB DeleteItem is a no-op for a non-existent key.
    await this.repository.delete(new UserId(command.userId), new PeriodId(command.periodId));
  }
}
