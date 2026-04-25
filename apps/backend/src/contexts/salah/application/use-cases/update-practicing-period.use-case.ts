import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { PracticingPeriod } from '../../../shared/domain/entities/practicing-period.entity';
import {
  HijriDate,
  UserId,
  PeriodId,
  NotFoundError,
  PracticingPeriodType,
  ERROR_CODES,
} from '@awdah/shared';
import { assertPracticingPeriodStartDateAllowed } from '../../../shared/domain/services/practicing-period-rules';

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
      throw new NotFoundError(ERROR_CODES.PERIOD_NOT_FOUND);
    }

    const userSettings = await this.userRepository.findById(userId);
    if (!userSettings) {
      throw new NotFoundError(ERROR_CODES.USER_SETTINGS_NOT_FOUND);
    }

    const startDate = HijriDate.fromString(command.startDate);
    const endDate = command.endDate ? HijriDate.fromString(command.endDate) : undefined;

    assertPracticingPeriodStartDateAllowed(startDate, userSettings);

    const updated = new PracticingPeriod({
      userId,
      periodId,
      startDate,
      endDate,
      type: command.type,
    });

    await this.repository.save(updated);
  }
}
