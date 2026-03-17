import { NotFoundError } from '@awdah/shared';
import { userSettingsNotFound } from '../../../../shared/errors/messages';
import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import {
  SalahDebtCalculator,
  SalahDebtResult,
} from '../../domain/services/debt-calculator.service';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { IHijriCalendarService } from '../../../shared/domain/services/hijri-calendar.service';

export class GetSalahDebtUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly prayerLogRepository: IPrayerLogRepository,
    private readonly practicingPeriodRepository: IPracticingPeriodRepository,
    private readonly debtCalculator: SalahDebtCalculator,
    private readonly calendarService: IHijriCalendarService,
  ) {}

  async execute(userId: string): Promise<SalahDebtResult> {
    // 1. Get user settings (for bulugh date)
    const settings = await this.userRepository.findById(userId);
    if (!settings) {
      throw new NotFoundError(userSettingsNotFound(userId));
    }

    // 2. Get all practicing periods that apply to salah
    const allPeriods = await this.practicingPeriodRepository.findByUser(userId);
    const relevantPeriods = allPeriods.filter((p) => p.coversContext('salah'));

    // 3. Get total qadaa count
    const completedQadaa = await this.prayerLogRepository.countQadaaCompleted(userId);

    // 4. Calculate debt
    const today = this.calendarService.today();

    return this.debtCalculator.calculate(
      settings.bulughDate,
      relevantPeriods,
      completedQadaa,
      today,
    );
  }
}
