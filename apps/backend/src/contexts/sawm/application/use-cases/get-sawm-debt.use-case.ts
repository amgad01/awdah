import { NotFoundError, UserId } from '@awdah/shared';
import { userSettingsNotFound } from '../../../../shared/errors/messages';
import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import {
  SawmDebtCalculator,
  SawmDebtResult,
} from '../../domain/services/sawm-debt-calculator.service';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { IHijriCalendarService } from '../../../shared/domain/services/hijri-calendar.service';
import { resolveEffectiveStartDate } from '../../../shared/domain/services/effective-start-date';

export class GetSawmDebtUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly fastLogRepository: IFastLogRepository,
    private readonly practicingPeriodRepository: IPracticingPeriodRepository,
    private readonly debtCalculator: SawmDebtCalculator,
    private readonly calendarService: IHijriCalendarService,
  ) {}

  async execute(userId: string): Promise<SawmDebtResult> {
    const userIdValue = new UserId(userId);
    const settings = await this.userRepository.findById(userIdValue);
    if (!settings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    const effectiveStartDate = resolveEffectiveStartDate(settings);

    const allPeriods = await this.practicingPeriodRepository.findByUser(userIdValue);
    const relevantPeriods = allPeriods.filter((p) => p.coversContext('sawm'));
    const completedQadaa = await this.fastLogRepository.countQadaaCompleted(userIdValue);
    const today = this.calendarService.today();

    // Early return: if effective start date is in the future, user has zero debt
    if (effectiveStartDate.isAfter(today)) {
      return {
        totalDaysOwed: 0,
        completedDays: completedQadaa,
        remainingDays: 0,
      };
    }

    return this.debtCalculator.calculate(
      effectiveStartDate,
      relevantPeriods,
      completedQadaa,
      today,
    );
  }
}
