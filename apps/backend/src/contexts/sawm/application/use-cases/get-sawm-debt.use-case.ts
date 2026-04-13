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

export class GetSawmDebtUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly fastLogRepository: IFastLogRepository,
    private readonly practicingPeriodRepository: IPracticingPeriodRepository,
    private readonly debtCalculator: SawmDebtCalculator,
    private readonly calendarService: IHijriCalendarService,
  ) {}

  async execute(userId: string): Promise<SawmDebtResult> {
    const userVid = new UserId(userId);
    const settings = await this.userRepository.findById(userVid);
    if (!settings) {
      throw new NotFoundError(userSettingsNotFound);
    }

    // For reverts, use the later of bulugh date and revert date
    const effectiveStartDate =
      settings.revertDate && settings.revertDate.isAfter(settings.bulughDate)
        ? settings.revertDate
        : settings.bulughDate;

    const allPeriods = await this.practicingPeriodRepository.findByUser(userVid);
    const relevantPeriods = allPeriods.filter((p) => p.coversContext('sawm'));
    const completedQadaa = await this.fastLogRepository.countQadaaCompleted(userVid);
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
