import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import { HijriDate, NotFoundError, PracticingPeriodType, ValidationError } from '@awdah/shared';
import { userSettingsNotFound } from '../../../../shared/errors/messages';
import { ulid } from 'ulid';

export interface AddPracticingPeriodCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD Hijri
  endDate?: string; // YYYY-MM-DD Hijri — optional for open-ended (currently practicing)
  type: PracticingPeriodType;
}

export class AddPracticingPeriodUseCase {
  constructor(
    private readonly repository: IPracticingPeriodRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(command: AddPracticingPeriodCommand): Promise<{ periodId: string }> {
    const startDate = HijriDate.fromString(command.startDate);
    const endDate = command.endDate ? HijriDate.fromString(command.endDate) : undefined;

    const userSettings = await this.userRepository.findById(command.userId);
    if (!userSettings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    if (startDate.isBefore(userSettings.bulughDate)) {
      throw new ValidationError('Practicing period cannot start before the date of bulugh');
    }

    const newPeriod = new PracticingPeriod({
      userId: command.userId,
      periodId: ulid(),
      startDate,
      endDate,
      type: command.type,
    });

    const existing = await this.repository.findByUser(command.userId);
    for (const p of existing) {
      if (p.overlapsWith(newPeriod)) {
        throw new ValidationError('The new practicing period overlaps with an existing one');
      }
    }

    await this.repository.save(newPeriod);
    return { periodId: newPeriod.periodId };
  }
}
