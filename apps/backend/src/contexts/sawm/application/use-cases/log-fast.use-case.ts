import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { FastLog } from '../../domain/entities/fast-log.entity';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { isDuplicateLog } from '../../../../shared/utils/idempotency';

export interface LogFastCommand {
  userId: string;
  date: string; // YYYY-MM-DD Hijri
  type: string;
}

export class LogFastUseCase {
  constructor(
    private readonly repository: IFastLogRepository,
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: LogFastCommand): Promise<void> {
    const userId = new UserId(command.userId);
    const date = HijriDate.fromString(command.date);
    const type = new LogType(command.type);
    const existingLogs = await this.repository.findByUserAndDate(userId, date);

    if (isDuplicateLog(existingLogs, type.getValue())) {
      return;
    }

    const fastLog = new FastLog({
      userId,
      eventId: new EventId(this.idGenerator.generate()),
      date,
      type,
      loggedAt: new Date(),
    });

    await this.repository.save(fastLog);
  }
}
