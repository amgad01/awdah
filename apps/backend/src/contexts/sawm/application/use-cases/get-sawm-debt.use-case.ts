import { NotFoundError } from '@awdah/shared';
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
    const settings = await this.userRepository.findById(userId);
    if (!settings) {
      throw new NotFoundError(userSettingsNotFound(userId));
    }

    const allPeriods = await this.practicingPeriodRepository.findByUser(userId);
    const relevantPeriods = allPeriods.filter((p) => p.coversContext('sawm'));
    const completedQadaa = await this.fastLogRepository.countQadaaCompleted(userId);
    const today = this.calendarService.today();

    return this.debtCalculator.calculate(
      settings.bulughDate,
      relevantPeriods,
      completedQadaa,
      today,
    );
  }
}
