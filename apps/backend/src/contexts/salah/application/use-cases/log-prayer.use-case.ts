import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../domain/value-objects/prayer-name';
import { LogType } from '../../domain/value-objects/log-type';
import { HijriDate } from '@awdah/shared';

export interface LogPrayerCommand {
  userId: string;
  date: string; // YYYY-MM-DD Hijri
  prayerName: string;
  type: string;
}

export class LogPrayerUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: LogPrayerCommand): Promise<void> {
    const prayerLog = new PrayerLog({
      userId: command.userId,
      date: HijriDate.fromString(command.date),
      prayerName: new PrayerName(command.prayerName),
      type: new LogType(command.type),
      loggedAt: new Date(),
    });

    await this.repository.save(prayerLog);
  }
}
