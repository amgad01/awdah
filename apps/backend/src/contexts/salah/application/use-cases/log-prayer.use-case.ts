import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../domain/value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { isDuplicateLog } from '../../../../shared/utils/idempotency';

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
  ) {}

  async execute(command: LogPrayerCommand): Promise<void> {
    const userId = new UserId(command.userId);
    const date = HijriDate.fromString(command.date);
    const prayerName = new PrayerName(command.prayerName);
    const type = new LogType(command.type);
    const existingLogs = await this.repository.findByUserAndDate(userId, date);

    if (
      isDuplicateLog(existingLogs, type.getValue(), {
        key: 'prayerName',
        value: prayerName.getValue(),
      })
    ) {
      return;
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
