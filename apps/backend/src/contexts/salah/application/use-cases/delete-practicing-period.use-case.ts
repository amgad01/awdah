import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { NotFoundError } from '@awdah/shared';

export interface DeletePracticingPeriodCommand {
    userId: string;
    periodId: string;
}

export class DeletePracticingPeriodUseCase {
    constructor(private readonly repository: IPracticingPeriodRepository) { }

    async execute(command: DeletePracticingPeriodCommand): Promise<void> {
        const existing = await this.repository.findByUser(command.userId);
        const period = existing.find((p) => p.periodId === command.periodId);
        if (!period) {
            throw new NotFoundError(`Practicing period ${command.periodId} not found`);
        }

        await this.repository.delete(command.userId, command.periodId);
    }
}
