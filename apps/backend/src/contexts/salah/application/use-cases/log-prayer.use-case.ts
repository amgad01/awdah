import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../domain/value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { HijriDate, UserId, EventId, ValidationError } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import { IPracticingPeriodRepository } from '../../../shared/domain/repositories/practicing-period.repository';
import { SalahDebtCalculator } from '../../domain/services/debt-calculator.service';
import { IHijriCalendarService } from '../../../shared/domain/services/hijri-calendar.service';
import { resolveEffectiveStartDate } from '../../../shared/domain/services/effective-start-date';

export interface LogPrayerCommand {
  userId: string;
  date: string; // YYYY-MM-DD Hijri
  prayerName: string;
  type: string;
}

export class LogPrayerUseCase {
  constructor(
    private readonly repository: IPrayerLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly userRepository: IUserRepository,
    private readonly practicingPeriodRepository: IPracticingPeriodRepository,
    private readonly debtCalculator: SalahDebtCalculator,
    private readonly calendarService: IHijriCalendarService,
  ) {}

  async execute(command: LogPrayerCommand): Promise<void> {
    const userId = new UserId(command.userId);
    const date = HijriDate.fromString(command.date);
    const prayerName = new PrayerName(command.prayerName);
    const type = new LogType(command.type);

    if (type.isQadaa()) {
      const settings = await this.userRepository.findById(userId);
      if (settings) {
        const effectiveStartDate = resolveEffectiveStartDate(settings);

        const allPeriods = await this.practicingPeriodRepository.findByUser(userId);
        const relevantPeriods = allPeriods.filter((p) => p.coversContext('salah'));

        const completedByPrayer = await this.repository.countQadaaCompletedByPrayer(userId);

        const debt = this.debtCalculator.calculate(
          effectiveStartDate,
          relevantPeriods,
          0, // totalQadaaCount not needed for per-prayer check
          this.calendarService.today(),
          completedByPrayer,
        );

        if ((debt.perPrayerRemaining[prayerName.getValue()] ?? 0) <= 0) {
          throw new ValidationError('salah.error_no_qadaa_owed');
        }
      }
    }

    const prayerLog = new PrayerLog({
      userId,
      eventId: new EventId(this.idGenerator.generate()),
      date,
      prayerName,
      type,
      action: 'prayed',
      loggedAt: new Date(),
    });

    await this.repository.save(prayerLog);
  }
}
