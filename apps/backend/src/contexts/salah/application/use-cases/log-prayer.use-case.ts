import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../domain/value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { HijriDate } from '@awdah/shared';
import { ulid } from 'ulid';

export interface LogPrayerCommand {
  userId: string;
  date: string; // YYYY-MM-DD Hijri
  prayerName: string;
  type: string;
}

export class LogPrayerUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: LogPrayerCommand): Promise<void> {
    const date = HijriDate.fromString(command.date);
    const prayerName = new PrayerName(command.prayerName);
    const type = new LogType(command.type);
    const typeValue = type.getValue();

    const prayerLog = new PrayerLog({
      userId: command.userId,
      eventId: typeValue === 'obligatory' ? typeValue : ulid(),
      date,
      prayerName,
      type,
      loggedAt: new Date(),
    });

    await this.repository.save(prayerLog);
  }
}
