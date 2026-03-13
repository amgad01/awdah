import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import { HijriDate, PracticingPeriodType, ValidationError } from '@awdah/shared';
import { ulid } from 'ulid';

export interface AddPracticingPeriodCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: PracticingPeriodType;
}

export class AddPracticingPeriodUseCase {
  constructor(private readonly repository: IPracticingPeriodRepository) {}

  async execute(command: AddPracticingPeriodCommand): Promise<string> {
    const startDate = HijriDate.fromString(command.startDate);
    const endDate = HijriDate.fromString(command.endDate);

    const newPeriod = new PracticingPeriod({
      userId: command.userId,
      periodId: ulid(),
      startDate,
      endDate,
      type: command.type,
    });

    // Simple overlap check
    const existing = await this.repository.findByUser(command.userId);
    for (const p of existing) {
      if (p.overlapsWith(newPeriod)) {
        throw new ValidationError('The new practicing period overlaps with an existing one');
      }
    }

    await this.repository.save(newPeriod);
    return newPeriod.periodId;
  }
}
