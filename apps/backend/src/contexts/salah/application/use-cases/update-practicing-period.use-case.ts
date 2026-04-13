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
    const userId = new UserId(command.userId);
    const periodId = new PeriodId(command.periodId);

    const existing = await this.repository.findById(userId, periodId);
    if (!existing) {
      throw new NotFoundError('onboarding.period_error_not_found');
    }

    const userSettings = await this.userRepository.findById(userId);
    if (!userSettings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    const startDate = HijriDate.fromString(command.startDate);
    const endDate = command.endDate ? HijriDate.fromString(command.endDate) : undefined;

    if (userSettings.dateOfBirth && startDate.isBefore(userSettings.dateOfBirth)) {
      throw new ValidationError('onboarding.period_error_before_dob');
    }

    const updated = new PracticingPeriod({
      userId,
      periodId,
      startDate,
      endDate,
      type: command.type,
    });

    const allPeriods = await this.repository.findByUser(userId);
    for (const p of allPeriods) {
      if (p.periodId.equals(periodId)) continue;
      if (p.overlapsWith(updated)) {
        throw new ConflictError('onboarding.period_error_overlap');
      }
    }

    await this.repository.save(updated);
  }
}
