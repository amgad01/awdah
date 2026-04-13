import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import {
  HijriDate,
  UserId,
  PeriodId,
  NotFoundError,
  PracticingPeriodType,
  ConflictError,
  ValidationError,
} from '@awdah/shared';
import { userSettingsNotFound } from '../../../../shared/errors/messages';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';

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
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: AddPracticingPeriodCommand): Promise<{ periodId: string }> {
    const userId = new UserId(command.userId);
    const startDate = HijriDate.fromString(command.startDate);
    const endDate = command.endDate ? HijriDate.fromString(command.endDate) : undefined;

    const userSettings = await this.userRepository.findById(userId);
    if (!userSettings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    if (userSettings.dateOfBirth && startDate.isBefore(userSettings.dateOfBirth)) {
      throw new ValidationError('onboarding.period_error_before_dob');
    }

    const newPeriod = new PracticingPeriod({
      userId,
      periodId: new PeriodId(this.idGenerator.generate()),
      startDate,
      endDate,
      type: command.type,
    });

    const existing = await this.repository.findByUser(userId);
    for (const p of existing) {
      if (p.overlapsWith(newPeriod)) {
        throw new ConflictError('onboarding.period_error_overlap');
      }
    }

    await this.repository.save(newPeriod);
    return { periodId: newPeriod.periodId.toString() };
  }
}
