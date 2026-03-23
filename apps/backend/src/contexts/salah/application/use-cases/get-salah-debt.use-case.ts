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
      throw new NotFoundError(userSettingsNotFound);
    }

    // For reverts, use the later of bulugh date and revert date
    const effectiveStartDate =
      settings.revertDate && settings.revertDate.isAfter(settings.bulughDate)
        ? settings.revertDate
        : settings.bulughDate;

    // 2. Get all practicing periods that apply to salah
    const allPeriods = await this.practicingPeriodRepository.findByUser(userId);
    const relevantPeriods = allPeriods.filter((p) => p.coversContext('salah'));

    // 3. Get total qadaa count and per-prayer breakdown
    const [completedQadaa, completedByPrayer] = await Promise.all([
      this.prayerLogRepository.countQadaaCompleted(userId),
      this.prayerLogRepository.countQadaaCompletedByPrayer(userId),
    ]);

    // 4. Calculate debt
    const today = this.calendarService.today();

    return this.debtCalculator.calculate(
      effectiveStartDate,
      relevantPeriods,
      completedQadaa,
      today,
      completedByPrayer,
    );
  }
}
