import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { PrayerLog } from '../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../domain/value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';

export interface DeletePrayerLogCommand {
  userId: string;
  date: string;
  prayerName: string;
  type: string;
}

export class DeletePrayerLogUseCase {
  constructor(
    private readonly repository: IPrayerLogRepository,
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: DeletePrayerLogCommand): Promise<void> {
    const date = HijriDate.fromString(command.date);
    const prayerName = new PrayerName(command.prayerName);
    const type = new LogType(command.type);

    const prayerLog = new PrayerLog({
      userId: new UserId(command.userId),
      eventId: new EventId(this.idGenerator.generate()),
      date,
      prayerName,
      type,
      action: 'deselected',
      loggedAt: new Date(),
    });

    await this.repository.save(prayerLog);
  }
}
