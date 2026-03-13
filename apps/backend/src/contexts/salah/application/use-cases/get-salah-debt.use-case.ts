import { NotFoundError } from '@awdah/shared';
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
      throw new NotFoundError(`User settings for ${userId} not found`);
    }

    // 2. Get all practicing periods
    const periods = await this.practicingPeriodRepository.findByUser(userId);

    // 3. Get total qadaa count
    const completedQadaa = await this.prayerLogRepository.countQadaaCompleted(userId);

    // 4. Calculate debt
    const today = this.calendarService.today();

    return this.debtCalculator.calculate(settings.bulughDate, periods, completedQadaa, today);
  }
}
