import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import {
  HijriDate,
  NotFoundError,
  PracticingPeriodType,
  ValidationError,
  ConflictError,
} from '@awdah/shared';
import { userSettingsNotFound } from '../../../../shared/errors/messages';

export interface UpdatePracticingPeriodCommand {
  userId: string;
  periodId: string;
  startDate: string; // YYYY-MM-DD Hijri
  endDate?: string; // YYYY-MM-DD Hijri — optional for open-ended
  type: PracticingPeriodType;
}

export class UpdatePracticingPeriodUseCase {
  constructor(
    private readonly repository: IPracticingPeriodRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: UpdatePracticingPeriodCommand): Promise<void> {
    const existing = await this.repository.findById(command.userId, command.periodId);
    if (!existing) {
      throw new NotFoundError('Practicing period not found');
    }

    const userSettings = await this.userRepository.findById(command.userId);
    if (!userSettings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    const startDate = HijriDate.fromString(command.startDate);
    const endDate = command.endDate ? HijriDate.fromString(command.endDate) : undefined;

    if (startDate.isBefore(userSettings.bulughDate)) {
      throw new ValidationError('Practicing period cannot start before the date of bulugh');
    }

    const updated = new PracticingPeriod({
      userId: command.userId,
      periodId: command.periodId,
      startDate,
      endDate,
      type: command.type,
    });

    const allPeriods = await this.repository.findByUser(command.userId);
    for (const p of allPeriods) {
      if (p.periodId === command.periodId) continue;
      if (p.overlapsWith(updated)) {
        throw new ConflictError('The updated practicing period overlaps with an existing one');
      }
    }

    await this.repository.save(updated);
  }
}
