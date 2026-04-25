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
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { assertPracticingPeriodStartDateAllowed } from '../../../shared/domain/services/practicing-period-rules';

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
      throw new NotFoundError(ERROR_CODES.USER_SETTINGS_NOT_FOUND);
    }

    assertPracticingPeriodStartDateAllowed(startDate, userSettings);

    const newPeriod = new PracticingPeriod({
      userId,
      periodId: new PeriodId(this.idGenerator.generate()),
      startDate,
      endDate,
      type: command.type,
    });

    await this.repository.save(newPeriod);
    return { periodId: newPeriod.periodId.toString() };
  }
}
